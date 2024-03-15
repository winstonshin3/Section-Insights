import {InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import JSZip = require("jszip");
import * as fs from "fs-extra";
import Decimal from "decimal.js";

export function filterByAnyKeys(columns: string[], persistedData: any[]) {
	return persistedData.filter((persistedDataItem) => {
		return dataContainsColumnKey(columns, persistedDataItem);
	});
}

function dataContainsColumnKey(anyKeys: string[], persistedDataItem: any): boolean {
	for (let anyKey of anyKeys) {
		if (Object.keys(persistedDataItem).includes(anyKey)) {
			return true;
		}
	}
	return false;
}

export function filterByWhere(query: any, relevantData: any[]) {
	return relevantData.filter((data) => {
		return performWhere(query, data);
	});
}

export function transform(query: any, data: any[]) {
	let groupKeys: string[] = query.GROUP; // Cohesion-coupling??
	// console.log(groupKeys);
	// console.log(data.length);
	let groups = makeGroups(groupKeys, data);
	let applyObjects: any[] = query.APPLY;
	let newQueryResults = [];
	// console.log(groups.length);
	for (let group of groups) {
		let queryResult = trimByKeys(groupKeys, group[0]);
		// console.log(queryResult);
		let appliedQueryResults = applyTransformation(applyObjects, group);
		for (let appliedQueryResult of appliedQueryResults) {
			queryResult = {...queryResult, ...appliedQueryResult};
		}
		newQueryResults.push(queryResult);
	}
	// console.log("query results", newQueryResults)
	return newQueryResults;
}

export function trimByKeys(keys: string[], queryResult: any) {
	let trimedQueryResult = {...queryResult};
	let qrKeys = Object.keys(trimedQueryResult);
	for (let key of qrKeys) {
		if (!keys.includes(key)) {
			delete trimedQueryResult[key];
		}
	}
	return trimedQueryResult;
}

export function applyTransformation(applyObjects: any[], group: any[]) {
	let result = [];
	for (let applyObject of applyObjects) {
		let key = Object.keys(applyObject)[0];
		let applyToken = Object.keys(applyObject[key])[0];
		let smkey = applyObject[key][applyToken];
		let applyResult = applyRule(applyToken, smkey, group);
		result.push({[key]: applyResult});
	}
	return result;
}

export function applyRule(applyToken: string, smKey: string, group: any[]) {
	switch (applyToken) {
		case "SUM":
			return applyRuleSum(smKey, group);
		case "MAX":
			return applyRuleMax(smKey, group);
		case "MIN":
			return applyRuleMin(smKey, group);
		case "COUNT":
			return applyRuleCount(smKey, group);
		case "AVG":
			return applyRuleAvg(smKey, group);
		default:
			throw new InsightError("ApplyToken is invalid");
	}
}

export function applyRuleSum(smkey: string, group: any[]) {
	let sum = new Decimal(0);
	let filteredGroup = group.filter((groupItem) => {
		for (let key of Object.keys(groupItem)) {
			if (key.includes("year") && groupItem[key] === 1900) {
				return false;
			}
		}
		return true;
	});
	// console.log(filteredGroup);
	group.forEach((queryResult) => {
		sum = sum.add(new Decimal(queryResult[smkey]));
	});
	return Number(sum.toNumber().toFixed(2));
}

export function applyRuleMax(smKey: string, group: any[]) {
	let max = group[0][smKey];
	group.forEach((queryResult) => {
		if (queryResult[smKey] > max) {
			max = queryResult[smKey];
		}
	});
	return max;
}

export function applyRuleMin(smKey: string, group: any[]) {
	let min = group[0][smKey];
	group.forEach((queryResult) => {
		if (queryResult[smKey] < min) {
			min = queryResult[smKey];
		}
	});
	return min;
}

export function applyRuleCount(smKey: string, group: any[]) {
	let uniqueValues = new Set(
		group.map((item) => {
			return item[smKey];
		})
	);
	return uniqueValues.size;
}

export function applyRuleAvg(smKey: string, group: any[]) {
	let sum = new Decimal(0);
	let filteredGroup = group.filter((groupItem) => {
		return groupItem["year"] !== 1900;
	});
	filteredGroup.forEach((queryResult) => {
		sum = sum.add(new Decimal(queryResult[smKey]));
	});
	return Number((sum.toNumber() / filteredGroup.length).toFixed(2));
}

export function makeGroups(groupKeys: string[], queryResults: any[]) {
	const groups = new Map<string, any[]>();
	for (const result of queryResults) {
		const groupKey = groupKeys.map((key) => result[key]).join("|");
		const group = groups.get(groupKey);
		if (group) {
			group.push(result);
		} else {
			groups.set(groupKey, [result]);
		}
	}
	return Array.from(groups.values());
}

export function deepEquals(obj1: any, obj2: any) {
	let keys = Object.keys(obj1);
	for (let key of keys) {
		if (obj1[key] !== obj2[key]) {
			return false;
		}
	}
	return true;
}

export function getGroupKeys(query: any) {
	return query;
}

export function performWhere(query: any, section: object): boolean {
	let result: boolean = true;
	if (Object.keys(query).length === 0) {
		// For instance {"WHERE": {}};
		return true;
	}
	let key = Object.keys(query)[0];
	let value = query[key as keyof typeof query];
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

export function selectKeyValuesInColumn(queryContents: object[], columns: string[]) {
	for (let result of queryContents) {
		for (let key of Object.keys(result)) {
			if (!columns.includes(key)) {
				delete result[key as keyof typeof result];
			}
		}
	}
}

export function validateResultSize(queryContents: any) {
	if (queryContents.length > 5000) {
		throw new ResultTooLargeError("Too many results!");
	}
}

export function getAnyKeys(query: any): string[] {
	return query["OPTIONS"]["COLUMNS"];
}

export function lt(mKeyValuePair: object, section: object): boolean {
	for (const [key1, value1] of Object.entries(section)) {
		for (const [key2, value2] of Object.entries(mKeyValuePair)) {
			if (key1 === key2) {
				return value2 > value1;
			}
		}
	}
	return false;
}

export function gt(mKeyValuePair: object, section: object): boolean {
	for (const [key1, value1] of Object.entries(section)) {
		for (const [key2, value2] of Object.entries(mKeyValuePair)) {
			if (key1 === key2) {
				return value2 < value1;
			}
		}
	}
	return false;
}
export function eq(mKeyValuePair: object, section: object): boolean {
	for (const [key1, value1] of Object.entries(section)) {
		for (const [key2, value2] of Object.entries(mKeyValuePair)) {
			if (key1 === key2) {
				return value2 === value1;
			}
		}
	}
	return false;
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
