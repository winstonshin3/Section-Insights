import * as fs from "fs-extra";
import {InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";
import http from "node:http";
import * as parse5 from "parse5";
import {fetchWebContent, getMap, parseBuildingRow} from "./AddDatasetHelperFunctions2";

export interface Room {
	fullName: string;
	shortName: string;
	address: string;
	href: string;
}

export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

let validColumnNames: string[] = [
	"views-field views-field-field-building-code",
	"views-field views-field-field-building-address",
	"views-field views-field-title",
	"views-field views-field-nothing",
	"views-field views-field-field-room-number",
	"views-field views-field-field-room-capacity",
	"views-field views-field-field-room-furniture",
	"views-field views-field-field-room-type"
];

export async function validateId(id: string) {
	if (id === "" || id.includes("_") || id.trim() === "") {
		throw new InsightError("Invalid ID string");
	}
	await validateNoDuplicateId(id);
}
export async function validateNoDuplicateId(id: string) {
	let currentDatasets = await getCurrentDatasets();
	if (currentDatasets.includes(id)) {
		throw new InsightError("Dataset ID already exists");
	}
}

export async function getCurrentDatasets() {
	await fs.ensureDir("./data");
	return await fs.readdir("./data");
}

export async function getContentAsBase64(content: string) {
	try {
		return await JSZip.loadAsync(content, {base64: true});
	} catch (e) {
		throw new InsightError("Invalid base64 input");
	}
}

export function validateSectionsFiles(fileNames: string[]) {
	if (!fileNames.includes("courses/")) {
		throw new InsightError("No courses folder");
	}
}

export function validateRoomsFiles(fileNames: string[]) {
	let mustHaveFiles: string[] = [
		"campus/",
		"campus/discover/",
		"campus/discover/buildings-and-classrooms/",
		"index.htm"];
	for (let fileName of mustHaveFiles) {
		if (!fileNames.includes(fileName)) {
			throw new InsightError("Rooms is missing the folder: " + [`${fileName}`]);
		}
	}
}

// TODO there is redundancy here with getTableColumn and parseRow.
export function parseBuildingTable(tableRows: any) {
	let rows = filterNodeListByNodeName(tableRows, "tr");
	let result = [];
	for (let row of rows) {
		result.push(parseBuildingRow(row));
	}
	return result;
}


export function assignRoomValue(room: any, columnName: string, columnValue: string) {
	switch (columnName) {
		case "views-field views-field-field-building-code":
			return room.shortName = columnValue;
		case "views-field views-field-field-building-address":
			return room.address = columnValue;
		case "views-field views-field-title":
			return room.fullName = columnValue;
		case "views-field views-field-field-room-number":
			return room.number = columnValue;
		case "views-field views-field-field-room-capacity":
			return room.seats = columnValue;
		case "views-field views-field-field-room-furniture":
			return room.furniture = columnValue;
		case "views-field views-field-field-room-type":
			return room.type = columnValue;
		case "views-field views-field-nothing":
			return room.href = columnValue;
		default:
			return "null";
	}
}

export function getColumnValue(column: any, columnName: string) {
	switch (columnName) {
		case "views-field views-field-field-building-code":
			return getBuildingCode(column).trim();
		case "views-field views-field-field-building-address":
			return getBuildingAddress(column).trim();
		case "views-field views-field-title":
			return getFullName(column).trim();
		case "views-field views-field-nothing":
			return getHref(column).trim();
		case "views-field views-field-field-room-number":
			return getRoomNumber(column).trim();
		case "views-field views-field-field-room-capacity":
			return getRoomCapacity(column).trim();
		case "views-field views-field-field-room-furniture":
			return getFurnitureType(column).trim();
		case "views-field views-field-field-room-type":
			return getRoomType(column).trim();
		default:
			return "null";
	}
}

export function getRoomNumber(column: any) {
	return column.childNodes[1].childNodes[0]["value"];
}

export function getRoomCapacity(column: any) {
	return column.childNodes[0]["value"];
}

export function getFurnitureType(column: any) {
	return column.childNodes[0]["value"];
}

export function getRoomType(column: any) {
	return column.childNodes[0]["value"];
}

export function getBuildingCode(column: any) {
	return column.childNodes[0]["value"];
}

export function getFullName(column: any) {
	let result = getChildNodeByNodeName(column, "a");
	return result[0]["value"];
}

export function getBuildingAddress(column: any) {
	return column.childNodes[0]["value"];
}

export function getHref(column: any) {
	return column.childNodes[1].attrs[0]["value"];
}

export function filterNodeListByNodeName(tableContents: any[], nodeName: string) {
	let result: any[] = [];
	for (let item of tableContents) {
		if (item.nodeName === nodeName) {
			result.push(item);
		}
	}
	return result;
}

export function getChildNodeByNodeName(startingNode: any, nodeName: string) {
	let frontier: any[] = [];
	let currentNode: any;
	let result: any[] = [];
	frontier.push(startingNode);
	while(!(frontier.length === 0)) {
		currentNode = frontier.pop();
		let keys = Object.keys(currentNode);
		if (currentNode["nodeName"] === nodeName && keys.includes("childNodes")) {
			if (Array.isArray(currentNode.childNodes)) {
				result.push(...currentNode.childNodes);
			}
			break;
		} else if (keys.includes("childNodes")) {
			if (Array.isArray(currentNode.childNodes)) {
				frontier.push(...currentNode.childNodes);
			}
		}
	}
	return result;
}


export async function getGeoLocation(result: Room[]) {
	let jobs = [];
	for (let res of result) {
		jobs.push(fetchWebContent(res.address));
	}
	let jobResult: any[] = await Promise.all(jobs);
	const parsedData = jobResult.map((item) => JSON.parse(item));
	return parsedData;
}

export function mergeArrays(array1: any[], array2: any[]) {
	for (let i = 0; i < array1.length; i++) {
		array1[i] = {...array1[i], ...array2[i]};
	}
}

export function filterSectionFileNames(fileNames: string[]) {
	return fileNames.filter((fileName) => {
		return !fileName.endsWith("/");
	});
}

export async function getContentsOfFiles(fileNames: string[], zip: JSZip, id: string) {
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
		} else {
			return [];
		}
	});
	let contentsInDifferentFiles = await Promise.all(filePromises);
	return [].concat(...contentsInDifferentFiles);
}

export function filterRoomsFileNames(fileNames: string[]) {
	return fileNames.filter((fileName) => {
		return fileName.startsWith("campus/discover/buildings-and-classrooms/") && !fileName.endsWith("/");
	});
}

