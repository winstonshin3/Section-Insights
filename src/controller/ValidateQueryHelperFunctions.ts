import {InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import JSZip = require("jszip");
import * as fs from "fs-extra";
import {validateNoDuplicateId} from "./AddDatasetHelperFunctions1";
import {validateOption, validateColumns, validateOptionKeys, validateOrder} from "./ValidateQueryHelperFunctions2";

let validSKeys = [
	"uuid",
	"id",
	"title",
	"instructor",
	"dept",
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"href",
];
let validMKeys = ["year", "avg", "pass", "fail", "audit", "", "lat", "lon", "seats"];
export function getQueryAsJson(query: unknown) {
	let queryContent;
	try {
		let jsonContent = JSON.stringify(query);
		queryContent = JSON.parse(jsonContent);
	} catch (err) {
		throw new InsightError("Invalid query");
	}
	return queryContent;
}

export async function validateQuery(query: any) {
	let queryKeys = Object.keys(query);
	validateQueryKeys(queryKeys); // Ensures that WHERE and OPTIONS exist
	let whereKeys: any[] = [];
	validateAsObject("WHERE", query.WHERE);
	validateWhere(query.WHERE, whereKeys);
	validateAsObject("OPTIONS", query.OPTIONS);
	await validateOption(query.OPTIONS);
	let columnKeys = query.OPTIONS["COLUMNS"];
	let totalKeys: string[] = columnKeys.concat(whereKeys);
	if (queryKeys.includes("TRANSFORMATIONS")) {
		validateAsObject("TRANSFORMATIONS", query.TRANSFORMATIONS);
		validateTranformation(query.TRANSFORMATIONS, columnKeys);
		let groupKeys = query.TRANSFORMATIONS["GROUP"];
		let applyKeys = getApplyKeys(query.TRANSFORMATIONS["APPLY"]);
		validateColumnsMustBeInGroupOrApply(columnKeys, groupKeys, applyKeys);
		totalKeys = totalKeys.concat(groupKeys);
	}
	validateAccessingOneDatasetOnly(totalKeys);
}

export function validateAccessingOneDatasetOnly(totalKeys: any[]) {
	totalKeys = totalKeys.filter((key) => {
		return key.includes("_");
	});
	totalKeys = totalKeys.map((key) => {
		return key.split("_")[0];
	});
	let set = new Set(totalKeys);
	if (set.size !== 1) {
		throw new InsightError("Can only access one dataset at time");
	}
}

export function validateColumnsMustBeInGroupOrApply(columnKeys: any[], groupKeys: any[], applyKeys: any[]) {
	for (let columnKey of columnKeys) {
		if (!groupKeys.includes(columnKey) && !applyKeys.includes(columnKey)) {
			throw new InsightError("Column keys must be in either a group key or apply key");
		}
	}
}

export function getApplyKeys(applyRules: any[]) {
	let applyKeys = [];
	for (let applyRule of applyRules) {
		let applyRuleKey = Object.keys(applyRule)[0];
		applyKeys.push(applyRuleKey);
	}
	return applyKeys;
}

export function validateTranformation(query: any, columns: any[]) {
	let transformationKeys = Object.keys(query);
	validateTransformationKeys(transformationKeys);
	validateGroup(query["GROUP"], columns);
	validateApply(query["APPLY"], columns);
}

export function validateGroup(groupKeys: any, columns: any[]) {
	validateAsArray("GROUP", groupKeys);
	if (groupKeys.length === 0) {
		throw new InsightError("GROUP must not be an empty array");
	}
	for (let groupKey of groupKeys) {
		let smKey = groupKey.split("_")[1];
		if (!validSKeys.includes(smKey) && !validMKeys.includes(smKey)) {
			throw new InsightError("GROUP key must be an smKey");
		}
		if (!columns.includes(groupKey)) {
			throw new InsightError("GROUP key must be in COLUMNS");
		}
	}
}

export function validateApply(applyRuleList: any[], columns: any[]) {
	validateAsArray("APPLY", applyRuleList);
	for (let applyRule of applyRuleList) {
		validateArrayRule(applyRule, columns);
	}
}

export function validateArrayRule(arrayRule: any, columns: any[]) {
	validateAsObject("ARRAYRULE", arrayRule);
	let arrayRuleKeys = Object.keys(arrayRule);
	if (arrayRuleKeys.length !== 1) {
		throw new InsightError("ARRAYRULE must have only one key value pair");
	}
	let arrayRuleKey = arrayRuleKeys[0];
	if (arrayRuleKey.includes("_")) {
		throw new InsightError("ARRAYRULE key must not have an underscore");
	}
	if (!columns.includes(arrayRuleKey)) {
		throw new InsightError("ARRAYRULE applykey must be in COLUMNS");
	}
	validateApplyRuleValue(arrayRule[arrayRuleKey]);
}

export function validateApplyRuleValue(applyRuleValue: any) {
	validateAsObject("APPLYRULEVALUE", applyRuleValue);
	let applyRuleValueKeys = Object.keys(applyRuleValue);
	if (applyRuleValueKeys.length !== 1) {
		throw new InsightError("ARRAYRULEVALUE keys must have only one key value pair");
	}
	let validApplyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
	let applyToken = applyRuleValueKeys[0];
	if (!validApplyTokens.includes(applyToken)) {
		throw new InsightError("APPLYTOKEN must be either 'MAX', 'MIN', 'AVG', 'COUNT', or 'SUM'");
	}
	let applyRuleValueValue = applyRuleValue[applyRuleValueKeys[0]];
	let smKey = applyRuleValueValue.split("_")[1];
	if (applyToken === "COUNT") {
		if (!validMKeys.includes(smKey) && !validSKeys.includes(smKey)) {
			throw new InsightError("APPLYRULEVALUEVALUE must be an mKey");
		}
	} else {
		if (!validMKeys.includes(smKey)) {
			throw new InsightError("APPLYRULEVALUEVALUE must be an mKey");
		}
	}
}

export function validateTransformationKeys(keys: any[]) {
	let validKeys = ["GROUP", "APPLY"];
	for (let key of keys) {
		if (!validKeys.includes(key)) {
			throw new InsightError("TRANSFORMATION main keys must be either 'GROUP' or 'APPLY'");
		}
	}
	if (!keys.includes("GROUP") && !keys.includes("APPLY")) {
		throw new InsightError("TRANSFORMATION main keys must include 'GROUP' and 'APPLY'");
	}
}

export function validateQueryKeys(queryKeys: string[]) {
	let validKeys = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
	for (let queryKey of queryKeys) {
		if (!validKeys.includes(queryKey)) {
			throw new InsightError("Invalid main query key(s)");
		}
	}
	if (!queryKeys.includes("WHERE") || !queryKeys.includes("OPTIONS")) {
		throw new InsightError("Missing WHERE or OPTIONS");
	}
}

export function validateWhere(query: object, whereKeys: any[]) {
	Object.entries(query).forEach(([key, value]) => {
		if (typeof value !== "object") {
			throw new InsightError("Query values must be an object or an array");
		}
		switch (key) {
			case "AND":
			case "OR":
				validateAsArray(key, value);
				validateANDOR(value);
				for (let item of value) {
					validateWhere(item, whereKeys);
				}
				break;
			case "LT":
			case "GT":
			case "EQ":
				validateAsObject(key, value);
				validComparison(value, "number", whereKeys);
				break;
			case "IS":
				validateAsObject(key, value);
				validComparison(value, "string", whereKeys);
				break;
			case "NOT":
				validateAsObject(key, value);
				validateWhere(value, whereKeys);
				break;
			default:
				throw new InsightError("This WHERE key must be string: " + key);
		}
	});
}

export function validateAsObject(key: string, value: any) {
	if (typeof value !== "object" || Array.isArray(value)) {
		throw new InsightError(`${key} values must be an object`);
	}
}

export function validateAsArray(key: string, value: any) {
	if (!Array.isArray(value)) {
		throw new InsightError(`${key} value must be an array`);
	}
}

export function validateANDOR(value: any) {
	if (value.length === 0) {
		throw new InsightError("AND OR Cannot be an empty array");
	}
}

export function validComparison(query: object, type: string, whereKeys: any[]) {
	validateKeys(Object.keys(query), type);
	if (type === "string") {
		validateSValue(Object.values(query));
	}
	if (type === "number") {
		validateMValue(Object.values(query), type);
	}
	whereKeys.push(Object.keys(query)[0]);
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
		// These are special valid values.
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

export function validateKeys(keys: string[], keyType: string): void {
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
		throw new InsightError("Key doesn't reference a dataset!");
	}
	let dataSet = keyParts[1];
	if (dataSet === "") {
		throw new InsightError("Missing smkey");
	}
	if (keyType === "number" && !validMKeys.includes(dataSet)) {
		throw new InsightError("Invalid mkey");
	}
	if (keyType === "string" && !validSKeys.includes(dataSet)) {
		throw new InsightError("Invalid skey");
	}
	if (keyType === "either" && !validSKeys.includes(dataSet) && !validMKeys.includes(dataSet)) {
		throw new InsightError("Invalid smkey");
	}
}
