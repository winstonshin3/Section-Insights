import {InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import * as JSZip from "jszip";
import * as fs from "fs-extra";

export function performWhere(query: object, section: object): boolean {
	let result: boolean = true;
	let key: string = Object.keys(query)[0];
	let value = Object.values(query)[0];
	switch (key) {
		case "AND":
			result = true;
			for (let item of value) {
				result = result && performWhere(item, section);
			}
			return result;
		case "OR":
			result = false;
			for (let item of value) {
				result = performWhere(item, section) || result;
			}
			return result;
		case "LT":
			return (result = lt(value, section));
		case "GT":
			return (result = gt(value, section));
		case "EQ":
			return (result = eq(value, section));
		case "IS":
			return (result = is(value, section));
		case "NOT":
			return (result = !performWhere(value, section));
		default:
			throw new InsightError("Invalid filter key: " + key);
	}
}

export function selectColumns(filteredResults: object[], columns: string[]) {
	for (let result of filteredResults) {
		for (let key of Object.keys(result)) {
			if (!columns.includes(key)) {
				delete result[key as keyof typeof result];
			}
		}
	}
}

export function getColumns(query: object): string[] {
	let result = [];
	for (const [key, value] of Object.entries(query)) {
		if (key === "COLUMNS") {
			result = value;
		}
	}
	return result;
}

export function lt(mKeyValuePair: object, section: object): boolean {
	let result = true;
	for (const [key1, value1] of Object.entries(section)) {
		for (const [key2, value2] of Object.entries(mKeyValuePair)) {
			if (key1 === key2) {
				result = value2 > value1;
			}
		}
	}
	return result;
}

export function gt(mKeyValuePair: object, section: object): boolean {
	let result = true;
	for (const [key1, value1] of Object.entries(section)) {
		for (const [key2, value2] of Object.entries(mKeyValuePair)) {
			if (key1 === key2) {
				result = value2 < value1;
			}
		}
	}
	return result;
}
export function eq(mKeyValuePair: object, section: object): boolean {
	let result = true;
	for (const [key1, value1] of Object.entries(section)) {
		for (const [key2, value2] of Object.entries(mKeyValuePair)) {
			if (key1 === key2) {
				result = value2 === value1;
			}
		}
	}
	return result;
}

export function is(mKeyValuePair: object, section: object): boolean {
	let result = true;
	for (const [queryKey, queryValue] of Object.entries(mKeyValuePair)) {
		for (const [sectionKey, sectionValue] of Object.entries(section)) {
			if (queryKey === sectionKey) {
				let string = queryValue;
				if (string === "*" || string === "**") {
					return true;
				} else if (string.startsWith("*") && string.endsWith("*")) {
					string = string.slice(1, -1);
					return sectionValue.includes(string);
				} else if (string.startsWith("*")) {
					string = string.slice(1);
					return sectionValue.endsWith(string);
				} else if (string.endsWith("*")) {
					let asteriskIndex = string.indexOf("*");
					string = string.slice(0, asteriskIndex);
					return sectionValue.startsWith(string);
				} else {
					return string === sectionValue;
				}
			}
		}
	}
	return false;
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
