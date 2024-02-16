import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult, InsightError, ResultTooLargeError
} from "./IInsightFacade";
import JSZip from "jszip";
import fs from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id === "" || id.includes("_") || id.trim() === "") {
			return Promise.reject(new InsightError("Invalid id"));
		}
		let zip = await JSZip.loadAsync(content, {base64: true});
		let folder = zip.folder("courses");
		if (folder === null) {
			return Promise.reject(new InsightError("Folder not found in zip"));
		}
		let fileInFolder = zip.files;
		let fileNames = Object.keys(fileInFolder);
		let filePromises = fileNames.map(async (fileName) => {
			let file = zip.file(fileName);
			if (file != null) {
				try {
					let jsonContent = await file.async("string");
					let jsonObject = JSON.parse(jsonContent);
					let dataPoints = jsonObject.result;
					return dataPoints.map((data: any) => ({
						[`${id}_uuid`]: data.id,
						[`${id}_id`]: data.Course,
						[`${id}_title`]: data.Title,
						[`${id}_instructor`]: data.Professor,
						[`${id}_dept`]: data.Subject,
						[`${id}_year`]: data.Year,
						[`${id}_avg`]: data.Avg,
						[`${id}_pass`]: data.Pass,
						[`${id}_fail`]: data.Fail,
						[`${id}_audit`]: data.Audit,
					}));
				} catch (e) {
					throw new InsightError("Error processing file: " + fileName);
				}
			}
		});
		try {
			let rawResults = await Promise.all(filePromises);
			let refinedResults: object[][] = rawResults.filter(Array.isArray);
			let array: object[] = [];
			for (let result of refinedResults) {
				array = array.concat(result);
			}
			let cacheData: object = this.makeInsightResult(id, kind, array);
			await fs.ensureDir("./data");
			await fs.writeJson(`./data/${id}`, cacheData);
		} catch (err) {
			return Promise.reject(err);
		}
		return Promise.resolve(["HI"]);
	}

	public makeInsightResult(id: string, kind: InsightDatasetKind, array: any[]): InsightResult {
		let cachedData: {[key: string]: any} = {};
		cachedData["id"] = id;
		cachedData["kind"] = kind;
		cachedData["numRows"] = array.length;
		cachedData["data"] = array;
		return cachedData;
	}

	public async removeDataset(id: string): Promise<string> {
		return Promise.resolve("");
	}

	public getID(key: string): string {
		let parts = key.split("_");
		if (parts.length > 2) {
			throw new InsightError("Too many underscores in id");
		}
		return parts[0];
	}

	public assignID(currentID: string, id: string[]) {
		if (id[0] === "null") {
			id[0] = currentID;
		} else {
			if (id[0] !== currentID) {
				throw new InsightError("Can't have multiple sections!");
			}
		}
	}

	public validComparison(query: object, id: string[], type: string): boolean {
		let currentID = this.getID(Object.keys(query)[0]);
		this.assignID(currentID, id);
		return (typeof Object.values(query)[0]) === type;
	}

	public validateWhere(query: object, id: string[]): boolean {
		// Currently: checks if mComparison's and sComparison's type are number and string.
		// checks if filter key is invalid and throws insight error.
		let result: boolean = true;
		Object.entries(query).forEach(([key, value]) => {
			switch (key) {
				case "AND":
				case "OR":
					for (let item of value) {
						result = result && this.validateWhere(item, id);
					}
					break;
				case "LT":
				case "GT":
				case "EQ":
					return result = this.validComparison(value, id, "number");
				case "IS":
					return result = this.validComparison(value, id, "string");
				case "NOT":
					return result = !this.validateWhere(value, id);
				default:
					throw new InsightError("Invalid filter key: " + key);
			}
		});
		return result;
	}

	public validateOption(query: object, id: string[]): void {
		let keys = Object.keys(query);
		if (!keys.includes("COLUMNS")) {
			throw new InsightError("No columns!");
		}
		let columns: string[] = [];
		let order: string = "null";
		Object.entries(query).forEach(([key, value]) => {
			switch (key) {
				case "COLUMNS":
					if (!Array.isArray(value) || value.length === 0) {
						throw new InsightError("Column must be non-empty!");
					}
					columns = value;
					break;
				case "ORDER":
					order = value;
					break;
				default:
					throw new InsightError("Invalid Key: " + key);
			}
		});
		if (!columns.includes(order)) {
			throw new InsightError("Items in order must be in columns too!");
		}
		for (let item of columns) {
			if (!item.includes(id[0]) || !(order.includes(id[0]))) {
				throw new InsightError("One database at a time!");
			}
		}
	}

	public lt(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
		if (skeys.includes(ckey)) {
			return cvalue > (svalue[skeys.indexOf(ckey)] as number);
		}
		return false;
	}

	public gt(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
		if (skeys.includes(ckey)) {
			return cvalue < (svalue[skeys.indexOf(ckey)] as number);
		}
		return false;
	}

	public eq(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
		if (skeys.includes(ckey)) {
			return cvalue === (svalue[skeys.indexOf(ckey)] as number);
		}
		return false;
	}

	public is(ckey: string, cvalue: string, skeys: string[], svalue: any[]): boolean {
		if (skeys.includes(ckey)) {
			let string = (svalue[skeys.indexOf(ckey)] as string);
			if (string.startsWith("*") && string.endsWith("*")) {
				return string.includes(cvalue);
			} else if (string.startsWith("*")) {
				return string.startsWith(cvalue);
			} else if (string.endsWith("*")) {
				return string.endsWith(cvalue);
			} else {
				return string === cvalue;
			}
		}
		return true;
	}

	public performWhere(query: object, subject: object): boolean {
		// console.log(query);
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
					return result = this.lt(ckey, (cvalue as number), skeys, svalues);
				case "GT":
					return result =  this.gt(ckey, (cvalue as number), skeys, svalues);
				case "EQ":
					return result = this.eq(ckey, (cvalue as number), skeys, svalues);
				case "IS":
					return result = this.is(ckey, (cvalue as string), skeys, svalues);
				case "NOT":
					return result = !this.performWhere(value, subject);
				default:
					throw new InsightError("Invalid filter key: " + key);
			}
		});
		return result;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let jsonContent = JSON.stringify(query);
		let queryContent = JSON.parse(jsonContent);
		let idArray: string[] = ["null"];
		let typesMatch: boolean = this.validateWhere(queryContent.WHERE, idArray); // This throws insightErrors. true;
		let results: object[] = await this.getData();
		let filteredResults: any[] = [];
		for (let section of results) {
			if (this.performWhere(queryContent.WHERE, section)) {
				filteredResults.push(section);
			}
			if (filteredResults.length > 5000) {
				throw new ResultTooLargeError("Its over 5000 queries!");
			}
		}
		this.validateOption(queryContent.OPTIONS, idArray);
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
		let orderKey = this.getOrderKey(queryContent.OPTIONS);
		filteredResults.sort((a,b) =>
			(a[orderKey] - b[orderKey])
		);
		return Promise.resolve(filteredResults);
	}

	public getOrderKey(query: object): string {
		let columnsPair = Object.entries(query)[1];
		return Object.values(columnsPair)[1];
	}

	public async getData() {
		let fileNames = await fs.readdir("./data");
		let filePromises = fileNames.map(async (fileName) => {
			try {
				let fileContent = await fs.readJson(`./data/${fileName}`);
				let jsonString = JSON.stringify(fileContent);
				let data = JSON.parse(jsonString);
				return data.data;
			} catch (err) {
				throw new InsightError("Corrupted persisted file");
			}
		});
		let array: object[] = [];
		try {
			let rawResults: any[] = await Promise.all(filePromises);
			let refinedResults: object[][] = rawResults.filter(Array.isArray);
			for (let result of refinedResults) {
				array = array.concat(result);
			}
			return array;
		} catch (err) {
			throw new InsightError("Blah");
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		let fileNames = await fs.readdir("./data");
		let filePromises = fileNames.map(async (fileName) => {
			try {
				let fileContent = await fs.readJson(`./data/${fileName}`);
				let jsonString = JSON.stringify(fileContent);
				let data = JSON.parse(jsonString);
				return {
					id: data.id,
					kind: data.kind,
					numRows: data.numRows
				};
			} catch (err) {
				throw new InsightError("Corrupted persisted file");
			}
		});
		let results: InsightDataset[];
		try {
			results = await Promise.all(filePromises);
		} catch (err) {
			throw new InsightError("Blah");
		}
		return Promise.resolve(results);
	}
}
