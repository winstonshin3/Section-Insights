import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightResult,
	InsightError,
	ResultTooLargeError,
	NotFoundError,
} from "./IInsightFacade";

import {
	performWhere,
	getData, getColumns, selectColumns,
} from "./HelperFunctions";

import {getQueryAsJson, validateQuery
} from "./ValidateHelperFunctions";

import {
	parseTable,
	getChildNodeByNodeName,
	getContentAsBase64,
	getCurrentDatasets,
	validateId,
	validateNoDuplicateId, validateSectionsFile, validateRoomsFile,
	makeInsightResult,
	getFilPromises, fetchWebContent, getGeoLocation, mergeArrays,
} from "./AddDatasetHelperFunctions";


import JSZip from "jszip";
import * as fs from "fs-extra";
import * as parse5 from "parse5";
import * as http from "node:http";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, any> = new Map<string, any>();
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasets = new Map<string, InsightDataset>();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await validateId(id);
		let zip = await getContentAsBase64(content);
		let fileInFolder = zip.files;

		let fileNames = Object.keys(fileInFolder);

		if (kind === "sections") {
			validateSectionsFile(fileNames);
		} else if (kind === "rooms") {
			validateRoomsFile(fileNames);
		}
		// console.log("What is this: " + fileInFolder["courses/"].name);
		if (kind === "sections") {
			let filePromises = await getFilPromises(fileNames, zip, id);
			let rawResults = await Promise.all(filePromises);
			let refinedResults: object[][] = rawResults.filter(Array.isArray);
			let array: object[] = [];
			for (let result of refinedResults) {
				array = array.concat(result);
			}
			let cacheData: object = makeInsightResult(id, kind, array);
			await fs.ensureDir("./data");
			await fs.writeJson(`./data/${id}`, cacheData);
		} else if (kind === "rooms") {
			// console.log(fileNames);
			let file = zip.file("index.htm");
			// console.log(file);
			if (file != null) {
				let jsonContent = await file.async("string");
				let jsonObject = parse5.parse(jsonContent);
				let table = getChildNodeByNodeName(jsonObject, "tbody");
				let result = parseTable(table);
				let geoLocations: any[] = await getGeoLocation(result);
				mergeArrays(result, geoLocations); // TODO Result now contains everything from index!
			}
		}
		let addedDatasets = await getCurrentDatasets();
		return Promise.resolve(addedDatasets);
	}

	public async removeDataset(id: string): Promise<string> {
		// Check for invalid id
		if (id === "" || id.includes("_") || id.trim() === "") {
			return Promise.reject(new InsightError("Invalid id"));
		}

		try {
			let fileNames = await fs.readdir("./data");
			// await fs.remove(`./data/${id}.json`);
			if (fileNames.includes(`${id}`)) {
				await fs.remove(`./data/${id}`);
			}
			// Return the id of the dataset that was removed
			return Promise.resolve(id);
			// return id;
		} catch (err) {
			return Promise.reject(new InsightError("Error removing dataset: " + err));
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let queryContent = getQueryAsJson(query);
		await validateQuery(query);
		let persistedData: object[] = await getData();
		let filteredResults: any[] = [];
		for (let section of persistedData) {
			// console.log(this.performWhere(queryContent.WHERE, section));
			if (performWhere(queryContent.WHERE, section)) {
				filteredResults.push(section);
			}
			if (filteredResults.length > 5000) {
				throw new ResultTooLargeError("Too many results!");
			}
		}
		let columns: string[] = getColumns(queryContent.OPTIONS);
		selectColumns(filteredResults, columns);
		// let orderKey = getOrderKey(queryContent.OPTIONS);
		// filteredResults.sort((a, b) => a[orderKey] - b[orderKey]);
		// return Promise.resolve(filteredResults);
		return Promise.resolve(filteredResults);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		try {
			// Check if the './data' directory exists. If not, return an empty array
			await fs.ensureDir("./data");
			let fileNames = await fs.readdir("./data");
			let filePromises = fileNames.map(async (fileName) => {
				try {
					let fileContent = await fs.readJson(`./data/${fileName}`);
					let jsonString = JSON.stringify(fileContent);
					let data = JSON.parse(jsonString);
					return {
						id: data.id,
						kind: data.kind,
						numRows: data.numRows,
					};
				} catch (err) {
					throw new InsightError("Corrupted persisted file");
				}
			});

			return await Promise.all(filePromises);
		} catch (err) {
			throw new InsightError("Error listing datasets: " + err);
		}
	}
}
