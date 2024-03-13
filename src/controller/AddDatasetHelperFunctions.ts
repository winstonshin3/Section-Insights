import * as fs from "fs-extra";
import {InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";
import http from "node:http";

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
	"views-field views-field-nothing"];

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

export function validateSectionsFile(fileNames: string[]) {
	if (!fileNames.includes("courses/")) {
		throw new InsightError("No courses folder");
	}
}

export function validateRoomsFile(fileNames: string[]) {
	let mustHaveFiles: string[] = ["campus/",
		"campus/discover/", "campus/discover/buildings-and-classrooms/", "index.htm"];
	for (let fileName of mustHaveFiles) {
		if (!fileNames.includes(fileName)) {
			throw new InsightError("Rooms is missing the folder: " + [`${fileName}`]);
		}
	}
}


export function parseTable(tableRows: any) {
	let rows = filterNodeListByNodeName(tableRows, "tr");
	let result = [];
	for (let row of rows) {
		result.push(parseRow(row));
	}
	return result;
}


export function parseRow(row: any) {
	let rowContents = row.childNodes;
	let room: Room = {fullName: "null", shortName: "null", address: "null", href: "null"};
	rowContents = filterNodeListByNodeName(rowContents, "td");
	for (let column of rowContents) {
		let columnName = column.attrs[0]["value"];
		let columnValue = getColumnValue(column, columnName);
		if (columnValue !== undefined) {
			assignRoomValue(room, columnName, columnValue);
		} // TODO Could use an else statement here to handle invalid (incomplete) rooms.
	}
	return room;
}

export function assignRoomValue(room: Room, columnName: string, columnValue: string) {
	switch (columnName) {
		case "views-field views-field-field-building-code":
			return room.shortName = columnValue;
		case "views-field views-field-field-building-address":
			return room.address = columnValue;
		case "views-field views-field-title":
			return room.fullName = columnValue;
		case "views-field views-field-nothing":
			return room.href = columnValue;
		default:
			break;
	}
}

export function getColumnValue(column: any, columnName: string) {
	if (validColumnNames.includes(columnName)) {
		switch (columnName) {
			case "views-field views-field-field-building-code":
				return getBuildingCode(column).trim();
			case "views-field views-field-field-building-address":
				return getBuildingAddress(column).trim();
			case "views-field views-field-title":
				return getFullName(column).trim();
			case "views-field views-field-nothing":
				return getHref(column).trim();
			default:
				break;
		}
	}
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
	let currentNode: Element;
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

export function mergeArrays(result: Room[], geoLocations: any[]) {
	for (let i = 0; i < result.length; i++) {
		result[i] = {...geoLocations[i], ...result[i]};
	}
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
		[`${section}_uuid`]: data.id.toString(),
		[`${section}_id`]: data.Course as string,
		[`${section}_title`]: data.Title as string,
		[`${section}_instructor`]: data.Professor as string,
		[`${section}_dept`]: data.Subject as string,
		[`${section}_year`]: data.Section === "overall" ? 1900 : Number(data.Year),
		[`${section}_avg`]: data.Avg as number,
		[`${section}_pass`]: data.Pass as number,
		[`${section}_fail`]: data.Fail as number,
		[`${section}_audit`]: data.Audit as number,
	}));
}

export function makeInsightResult(id: string, kind: InsightDatasetKind, array: any[]): InsightResult {
	let cachedData: {[key: string]: any} = {};
	cachedData["id"] = id;
	cachedData["kind"] = kind;
	cachedData["numRows"] = array.length;
	cachedData["data"] = array;
	return cachedData;
}


export function fetchWebContent(address: string) {
	let uri = encodeURIComponent(address);
	return new Promise((resolve, reject) => {
		http.get(`http://cs310.students.cs.ubc.ca:11316/api/v1/project_team203/${uri}`, (res) => {
			let data = "";
			// A chunk of data has been received
			res.on("data", (chunk) => {
				data += chunk;
			});

			// The whole response has been received
			res.on("end", () => {
				return resolve(data);
			}).on("error", (error) => {
				reject(error);
			});
		});
	});
}


