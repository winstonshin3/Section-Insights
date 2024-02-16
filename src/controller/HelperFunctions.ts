import {InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import JSZip = require("jszip");
import * as fs from "fs-extra";

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

export function getMap(dataPoints: any, id: string) {
	return dataPoints.map((data: any) => ({
		[`${id}_uuid`]: data.id,
		[`${id}_id`]: data.Course,
		[`${id}_title`]: data.Title,
		[`${id}_instructor`]: data.Professor,
		[`${id}_dept`]: data.Subject,
		[`${id}_year`]: data.Subject === "overall" ? 1900 : data.Year,
		[`${id}_avg`]: data.Avg,
		[`${id}_pass`]: data.Pass,
		[`${id}_fail`]: data.Fail,
		[`${id}_audit`]: data.Audit,
	}));
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

export function lt(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
	if (skeys.includes(ckey)) {
		return cvalue > (svalue[skeys.indexOf(ckey)] as number);
	}
	return false;
}

export function gt(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
	if (skeys.includes(ckey)) {
		return cvalue < (svalue[skeys.indexOf(ckey)] as number);
	}
	return false;
}

export function eq(ckey: string, cvalue: number, skeys: string[], svalue: any[]): boolean {
	if (skeys.includes(ckey)) {
		return cvalue === (svalue[skeys.indexOf(ckey)] as number);
	}
	return false;
}

export function is(ckey: string, cvalue: string, skeys: string[], svalue: any[]): boolean {
	if (skeys.includes(ckey)) {
		let string = svalue[skeys.indexOf(ckey)] as string;
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

export function validComparison(query: object, id: string[], type: string): boolean {
	let currentID = getID(Object.keys(query)[0]);
	assignID(currentID, id);
	return typeof Object.values(query)[0] === type;
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
