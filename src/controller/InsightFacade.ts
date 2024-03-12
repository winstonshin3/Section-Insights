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
	makeInsightResult,
	getFilPromises,
	performWhere,
	getData, getColumns, selectColumns,
} from "./HelperFunctions";

import {getQueryAsJson, validateQuery
} from "./ValidateHelperFunctions";

import JSZip = require("jszip");
import * as fs from "fs-extra";

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
		let currentInsightDatasets: InsightDataset[] = await this.listDatasets();
		let currentDatasets = currentInsightDatasets.map((value) => {
			return value.id;
		});
		// console.log("Current Datasets: " + currentDatasets);

		if (id === "" || id.includes("_") || id.trim() === "" || kind !== "sections") {
			return Promise.reject(new InsightError("Invalid id"));
		}
		if (currentDatasets.includes(id)) {
			return Promise.reject(new InsightError("Dataset already exists"));
		}
		let zip;

		// let zip = await JSZip.loadAsync(content, {base64: true});

		try {
			zip = await JSZip.loadAsync(content, {base64: true});
			// ... continue with your existing logic ...
		} catch (e) {
			// This catches the JSZip error and rejects with an InsightError
			return Promise.reject(new InsightError("Invalid base64 input"));
		}

		// let folder = zip.folder(kind);
		// console.log("Folder: " + folder);

		// if (folder === null) {
		// 	return Promise.reject(new InsightError("Folder not found in zip"));
		// }
		// console.log(zip.files);
		if (!zip.files["courses/"]) {
			return Promise.reject(new InsightError("Folder not found in zip"));
		}
		let fileInFolder = zip.files;
		let fileNames = Object.keys(fileInFolder);
		let filePromises = await getFilPromises(fileNames, zip, id);
		try {
			let rawResults = await Promise.all(filePromises);
			let refinedResults: object[][] = rawResults.filter(Array.isArray);
			let array: object[] = [];
			for (let result of refinedResults) {
				array = array.concat(result);
			}
			let cacheData: object = makeInsightResult(id, kind, array);
			await fs.ensureDir("./data");
			await fs.writeJson(`./data/${id}`, cacheData);
		} catch (err) {
			return Promise.reject(err);
		}
		let insightDatasets: InsightDataset[] = await this.listDatasets();
		let addedDatasets = insightDatasets.map((value) => {
			return value.id;
		});
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
