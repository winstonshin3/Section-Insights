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
	assignID,
	getID,
	lt,
	gt,
	is,
	eq,
	validComparison,
	getData,
	getOrderKey,
	validateOption,
} from "./HelperFunctions";
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

	public validateWhere(query: object, id: string[], currentDatasets: string[]): boolean {
		// Currently: checks if mComparison's and sComparison's type are number and string.
		// checks if filter key is invalid and throws insight error.
		let result: boolean = true;
		Object.entries(query).forEach(([key, value]) => {
			switch (key) {
				case "AND":
				case "OR":
					for (let item of value) {
						result = result && this.validateWhere(item, id, currentDatasets);
					}
					break;
				case "LT":
				case "GT":
				case "EQ":
					return (result = validComparison(value, id, "number", currentDatasets));
				case "IS":
					return (result = validComparison(value, id, "string", currentDatasets));
				case "NOT":
					return (result = this.validateWhere(value, id, currentDatasets));
				default:
					throw new InsightError("Invalid filter key: " + key);
			}
		});
		return result;
	}

	public performWhere(query: object, subject: object): boolean {
		let result: boolean = true;
		let skeys = Object.keys(subject);
		let svalues = Object.values(subject);
		Object.entries(query).forEach(([key, value]) => {
			let ckey: string = Object.keys(value)[0];
			let cvalue = Object.values(value)[0];
			switch (key) {
				case "AND":
					for (let item of value) {
						result = this.performWhere(item, subject) && result;
					}
					break;
				case "OR":
					result = false;
					for (let item of value) {
						result = this.performWhere(item, subject) || result;
					}
					break;
				case "LT":
					return (result = lt(ckey, cvalue as number, skeys, svalues));
				case "GT":
					return (result = gt(ckey, cvalue as number, skeys, svalues));
				case "EQ":
					return (result = eq(ckey, cvalue as number, skeys, svalues));
				case "IS":
					return (result = is(ckey, cvalue as string, skeys, svalues));
				case "NOT":
					return (result = !this.performWhere(value, subject));
				default:
					throw new InsightError("Invalid filter key: " + key);
			}
		});
		return result;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let jsonContent;
		let queryContent;
		try {
			jsonContent = JSON.stringify(query);
			queryContent = JSON.parse(jsonContent);
		} catch (err) {
			throw new InsightError("Invalid query");
		}

		let queryContentNames = Object.keys(queryContent);
		if (!queryContentNames.includes("WHERE") || !queryContentNames.includes("OPTIONS")) {
			throw new InsightError("Invalid query");
		}
		let currentDatasets = await fs.readdir("./data");
		// console.log(currentDatasets);
		let idArray: string[] = ["null"];
		let typesMatch: boolean = this.validateWhere(queryContent.WHERE, idArray, currentDatasets); // This throws insightErrors. true;
		if (!typesMatch) {
			throw new InsightError("Types don't match!");
		}
		let results: object[] = await getData();
		let filteredResults: any[] = [];
		for (let section of results) {
			// console.log(this.performWhere(queryContent.WHERE, section));
			if (this.performWhere(queryContent.WHERE, section)) {
				filteredResults.push(section);
			}
			if (filteredResults.length > 5000) {
				throw new ResultTooLargeError("Its over 5000 queries!");
			}
		}
		// console.log(filteredResults);
		validateOption(queryContent.OPTIONS, idArray);
		let columnsPair: [string, any] = Object.entries(queryContent.OPTIONS)[0];
		let columns: string[] = Object.values(columnsPair)[1];
		for (let result of filteredResults) {
			let resultKeys = Object.keys(result);
			for (let key of resultKeys) {
				if (!columns.includes(key)) {
					delete result[key];
				}
			}
		}
		let orderKey = getOrderKey(queryContent.OPTIONS);
		filteredResults.sort((a, b) => a[orderKey] - b[orderKey]);
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
