import {InsightError} from "./IInsightFacade";
import {validateAsArray} from "./ValidateQueryHelperFunctions";

export function validateOrder(order: any, columns: any[]) {
	if (typeof order === "string") {
		if (!columns.includes(order)) {
			throw new InsightError("ORDER key must be in COLUMNS");
		}
	} else if (typeof order === "object" && !Array.isArray(order)) {
		let orderKeys = Object.keys(order);
		validateOrderObjectMainKeys(orderKeys);
		validateOrderDir(order["dir"]);
		validateOrderKeys(order["keys"], columns);
	} else {
		throw new InsightError("ORDER must be a string or an object");
	}
}

export function validateOrderKeys(keys: any[], columns: any[]) {
	validateAsArray("ORDER keys", keys);
	if (keys.length === 0) {
		throw new InsightError("ORDER keys must not be an empty array");
	}
	for (let key of keys) {
		if (!columns.includes(key)) {
			throw new InsightError("ORDER key must be in COLUMNS");
		}
	}
}

export function validateOrderDir(dir: any) {
	if (typeof dir !== "string") {
		throw new InsightError("ORDER dir must be a string");
	}
	if (dir !== "UP" && dir !== "DOWN") {
		throw new InsightError("ORDER dir must be either 'UP' or 'DOWN'");
	}
}

export function validateOrderObjectMainKeys(orderKeys: string[]) {
	let validOrderKeys = ["dir", "keys"];
	for (let orderKey of orderKeys) {
		if (!validOrderKeys.includes(orderKey)) {
			throw new InsightError("ORDER main keys must be 'dir' or 'keys' not: " + orderKey);
		}
	}
	if (!orderKeys.includes("dir") && !orderKeys.includes("keys")) {
		throw new InsightError("ORDER main keys must include 'dir' and 'keys'");
	}
}

export function validateColumns(columns: any[]) {
	if (columns.length === 0) {
		throw new InsightError("COLUMNS array must not be empty");
	}
	for (let column of columns) {
		if (column === "") {
			throw new InsightError("Column name must not be an empty string");
		}
		// if (column.includes("_")) {
		// 	if (!validSKeys.includes(column) && !validMKeys.includes(column)) {
		// 		throw new InsightError("Column names with an underscore must be a smKey");
		// 	}
		// }
	}
}

export function validateOptionKeys(optionKeys: any[]) {
	let validOptionKeys = ["COLUMNS", "ORDER"];
	for (let key of optionKeys) {
		if (!validOptionKeys.includes(key)) {
			throw new InsightError("Invalid OPTION key: " + key);
		}
	}
	if (!optionKeys.includes("COLUMNS")) {
		throw new InsightError("OPTIONS must have COLUMNS");
	}
}
