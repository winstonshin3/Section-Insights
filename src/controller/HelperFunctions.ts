import {InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import JSZip = require("jszip");
import * as fs from "fs-extra";
// TODO
export function lt(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
	if (skeys.includes(ckey)) {
		return cvalue > (svalue[skeys.indexOf(ckey)] as number);
	}
	return false;
}
// TODO
export function gt(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
	if (skeys.includes(ckey)) {
		return cvalue < (svalue[skeys.indexOf(ckey)] as number);
	}
	return false;
}
// TODO
export function eq(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
	if (skeys.includes(ckey)) {
		return cvalue === (svalue[skeys.indexOf(ckey)] as number);
	}
	return false;
}
// TODO

export function is(ckey: string, cvalue: string, skeys: string[], svalue: any[]): boolean {
	if (skeys.includes(ckey)) {
		let string = (svalue[skeys.indexOf(ckey)] as string);
		if (string === "" || string === "*" || string === "**") {
			return true;
		} else if (string.startsWith("*") && string.endsWith("*")) {
			string = string.slice(1,-1);
			return string.includes(cvalue);
		} else if (string.startsWith("*")) {
			string = string.slice(1);
			return string.startsWith(cvalue);
		} else if (string.endsWith("*")) {
			let asteriskIndex = string.indexOf("*");
			string = string.slice(0,asteriskIndex);
			return string.endsWith(cvalue);
		} else {
			return string === cvalue;
		}
	}
	return true;
}
// TODO
// export function validateANDOR() {
// }

// TODO
export function validateOption(query: object, id: string[]): void {
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

let validSKeys = ["uuid", "id", "title", "instructor", "dept"];
let validMKeys = ["year", "avg", "pass", "fail", "audit"];
let validDatasetIds = ["sections", "ubc"];

function validateMValue(values: any[], type: string) {
	if (values.length !== 1) {
		throw new InsightError("Invalid number of keys");
	}
	let value = values[0];
	if ((typeof value) !== "number") {
		throw new InsightError("Wrong type!");
	}

}

function validateSValue(values: any[], type: string) {
	if (values.length !== 1) {
		throw new InsightError("Invalid number of keys");
	}
	let value = values[0];
	if ((typeof value) !== "string") {
		throw new InsightError("Wrong type!");
	}
	if (value === "" || value === "**" || value === "*") {
		// return console.log("You reached the end");
	}
	let asteriskParts = value.split("*");
	if (asteriskParts.length > 3) {
		throw new InsightError("Too many asterisks");
	} else if (asteriskParts.length === 3) {
		if (asteriskParts[1] === "") {
			throw new InsightError("Asterisks can only be the first or last character");
		}
		if (asteriskParts[0] !== "" && asteriskParts[1] !== "" && asteriskParts[2] !== "") {
			throw new InsightError("Asterisks can only be the first or last character");
		}
	} else if (asteriskParts.length === 2) {
		if (asteriskParts[0] !== "" && asteriskParts[1] !== "") {
			throw new ResultTooLargeError("Asterisks can only be the first or last character");
		}
	}
}

function validateKey(keys: string[], type: string, currentDatasets: string[]): void {
	if (keys.length !== 1) {
		throw new InsightError("Invalid number of keys");
	}
	let key = keys[0];
	if (key === "") {
		throw new InsightError("Missing key");
	}
	let keyParts = key.split("_");
	if (keyParts.length !== 2) {
		throw new InsightError("Incorrect number of underscores in key");
	}
	let section = keyParts[0];
	let smkey = keyParts[1];
	if (!currentDatasets.includes(section)) {
		throw new InsightError("Dataset not added yet");
	}
	if (type === "number" && !validMKeys.includes(smkey)) {
		throw new InsightError("Invalid mkey");
	}
	if (type === "string" && !validSKeys.includes(smkey)) {
		throw new InsightError("Invalid skey");
	}
}

export function validComparison(query: object, id: string[], type: string, currentDatasets: string[]): boolean {
	validateKey(Object.keys(query), type, currentDatasets);
	if (type === "string") {
		validateSValue(Object.values(query), type);
	} else {
		validateMValue(Object.values(query), type);
	}
	let currentID = getID(Object.keys(query)[0]);
	assignID(currentID, id);
	return (typeof Object.values(query)[0]) === type;
}

export function getID(key: string): string {
	let parts = key.split("_");
	if (parts.length > 2) {
		throw new InsightError("Too many underscores in id");
	}
	return parts[0];
}

export function assignID(currentID: string, id: string[]) {
	if (id[0] === "null") {
		id[0] = currentID;
	} else {
		if (id[0] !== currentID) {
			throw new InsightError("Can't have multiple sections!");
		}
	}
}

export function getOrderKey(query: object): string {
	let columnsPair = Object.entries(query)[1];
	return Object.values(columnsPair)[1];
}


export async function getData() {
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
export function makeInsightResult(id: string, kind: InsightDatasetKind, array: any[]): InsightResult {
	let cachedData: {[key: string]: any} = {};
	cachedData["id"] = id;
	cachedData["kind"] = kind;
	cachedData["numRows"] = array.length;
	cachedData["data"] = array;
	return cachedData;
}

export async function getFilPromises(fileNames: string[], zip: JSZip, id: string) {
	let filePromises = fileNames.map(async (fileName) => {
		let file = zip.file(fileName);
		if (file != null) {
			try {
				let jsonContent = await file.async("string");
				let jsonObject = JSON.parse(jsonContent);
				let dataPoints = jsonObject.result;
				return getMap(dataPoints, id);
			} catch (e) {
				throw new InsightError("Error processing file: " + fileName);
			}
		}
	});
	return filePromises;
}

export function getMap(dataPoints: any, section: string) {
	return dataPoints.map((data: any) => ({
		[`${section}_uuid`]: data.id as number,
		[`${section}_id`]: data.Course as string,
		[`${section}_title`]: data.Title as string,
		[`${section}_instructor`]: data.Professor as string,
		[`${section}_dept`]: data.Subject as string,
		[`${section}_year`]: (data.Subject === "overall") ? 1900 : data.Year as number,
		[`${section}_avg`]: data.Avg as number,
		[`${section}_pass`]: data.Pass as number,
		[`${section}_fail`]: data.Fail as number,
		[`${section}_audit`]: data.Audit as number
	}));
}
