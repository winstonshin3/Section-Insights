import {InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import JSZip = require("jszip");
import * as fs from "fs-extra";

let validSDatasets = ["uuid", "id", "title", "instructor", "dept"];
let validMDatasets = ["year", "avg", "pass", "fail", "audit", ""];
export function getQueryAsJson(query: unknown) {
	let jsonContent;
	let queryContent;
	try {
		jsonContent = JSON.stringify(query);
		queryContent = JSON.parse(jsonContent);
	} catch (err) {
		throw new InsightError("Invalid query");
	}
	return queryContent;
}

export async function validateQuery(query: any) {
	let currentDataBase: string[] = ["null"];
	let existingDataSets = await fs.readdir("./data");
	validateHasWhereAndOption(query);
	validateWhere(query.WHERE, currentDataBase, existingDataSets);
	validateOption(query.OPTIONS, currentDataBase, existingDataSets);
}

export function validateHasWhereAndOption(query: any) {
	let queryContent = Object.keys(query);
	if (!queryContent.includes("WHERE") || !queryContent.includes("OPTIONS")) {
		throw new InsightError("Invalid query");
	}
}

export function validateWhere(query: object, currentDataBase: string[], existingDataSets: string[]) {
	Object.entries(query).forEach(([key, value]) => {
		if (typeof value !== "object") {
			throw new InsightError("Query values must be an object or an array");
		}
		switch (key) {
			case "AND":
			case "OR":
				validateANDOR(value);
				for (let item of value) {
					validateWhere(item, currentDataBase, existingDataSets);
				}
				break;
			case "LT":
			case "GT":
			case "EQ":
				validComparison(value, currentDataBase, existingDataSets, "number");
				break;
			case "IS":
				validComparison(value, currentDataBase, existingDataSets, "string");
				break;
			case "NOT":
				validateWhere(value, currentDataBase, existingDataSets);
				break;
			default:
				throw new InsightError("Invalid filter key: " + key);
		}
	});
}

export function validateANDOR(value: any) {
	if (!Array.isArray(value)) {
		throw new InsightError("AND OR Must contain an array");
	}
	if (value.length === 0) {
		throw new InsightError("AND OR Cannot be an empty array");
	}
}

export function validComparison(query: object, currentDataBase: string[], existingDataSets: string[], type: string) {
	validateKey(Object.keys(query), type, existingDataSets, currentDataBase);
	if (type === "string") {
		validateSValue(Object.values(query));
	} else {
		validateMValue(Object.values(query), type);
	}
}

export function validateMValue(values: any[], type: string) {
	if (values.length !== 1) {
		throw new InsightError("Invalid number of keys");
	}
	let value = values[0];
	if (typeof value !== "number") {
		throw new InsightError("Wrong type!");
	}
}

export function validateSValue(values: any[]) {
	if (values.length !== 1) {
		throw new InsightError("Invalid number of values");
	}
	let value = values[0];
	if (typeof value !== "string") {
		throw new InsightError("Wrong type!");
	}
	if (value === "" || value === "**" || value === "*") {
		//
	}
	let asteriskParts = value.split("*");
	if (asteriskParts.length > 3) {
		throw new InsightError("Too many asterisks");
	} else if (asteriskParts.length === 3) {
		if (asteriskParts[1] === "") {
			if (asteriskParts[0] !== "" || asteriskParts[2] !== "") {
				throw new InsightError("Asterisks can only be the first or last character");
			}
		} else {
			if (asteriskParts[0] !== "" || asteriskParts[2] !== "") {
				throw new InsightError("Asterisks can't be in between characters");
			}
		}
	} else if (asteriskParts.length === 2) {
		if (asteriskParts[0] !== "" && asteriskParts[1] !== "") {
			throw new InsightError("Asterisks can't be in the middle of the characters");
		}
	}
}


export function validateKey(keys: string[], type: string, existingDataSets: string[], currentDataBase: string[]): void {
	// GT, LT, EQ, and IS should have a key list size of 1.
	if (keys.length !== 1) {
		throw new InsightError("Invalid number of keys");
	}
	// GT, LT, EQ, and IS shouldn't have an empty key
	let key = keys[0];
	if (key === "") {
		throw new InsightError("Missing key");
	}
	let keyParts = key.split("_");
	if (keyParts.length !== 2) {
		throw new InsightError("Incorrect number of underscores in key");
	}
	if (keyParts[0] === "") {
		throw new InsightError("Doesn't reference a dataset!");
	}
	let section = keyParts[0];
	validateAccessOneDataset(currentDataBase, section);
	if (!existingDataSets.includes(section)) {
		throw new InsightError("Dataset not added yet");
	}
	let dataSet = keyParts[1];
	if (dataSet === "") {
		throw new InsightError("Missing smkey");
	}
	if (type === "number" && !validMDatasets.includes(dataSet)) {
		throw new InsightError("Invalid mkey");
	}
	if (type === "string" && !validSDatasets.includes(dataSet)) {
		throw new InsightError("Invalid skey");
	}
	if (type === "either" && (!validSDatasets.includes(dataSet) && !validMDatasets.includes(dataSet))) {
		throw new InsightError("Invalid smkey");
	}
}

export function validateAccessOneDataset(currentDataBase: string[], querySection: string) {
	if (currentDataBase[0] === "null") {
		currentDataBase[0] = querySection;
	} else {
		if (currentDataBase[0] !== querySection) {
			throw new InsightError("Can't have multiple sections!");
		}
	}
}

export function validateOption(query: object, currentDataBase: string[], existingDataSets: string[]): void {
	validateOptionKeys(query);
	let columns: string[] = [];
	let order: string = "null";
	Object.entries(query).forEach(([key, value]) => {
		switch (key) {
			case "COLUMNS":
				if (!Array.isArray(value)) {
					throw new InsightError("Column must be an array!");
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
	validateOptionColumns(columns, currentDataBase, existingDataSets);
	validateOptionOrder(columns, order);
}

export function validateOptionColumns(columns: string[], currentDataBase: string[], existingDataSets: string[]) {
	if (columns.length === 0) {
		throw new InsightError("Columns must be non-empty");
	}
	for (let column of columns) {
		let temp: string[] = [];
		temp.push(column);
		validateKey(temp, "either", existingDataSets, currentDataBase);
		temp.pop();
	}
}

export function validateOptionOrder(columns: string[], order: string) {
	if (!columns.includes(order)) {
		throw new InsightError("Items in order must be in columns too");
	}
}

export function validateOptionKeys(query: any) {
	let keys = Object.keys(query);
	if (!keys.includes("COLUMNS")) {
		throw new InsightError("No columns!");
	}
}
