import * as fs from "fs-extra";
import {InsightError} from "./IInsightFacade";
import JSZip from "jszip";

export interface Room {
	fullName: string;
	shortName: string;
	address: string;
	href: string;
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
	let mustHaveFiles: string[] = ["campus/", "campus/discover/", "campus/discover/buildings-and-classrooms/",];
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
			return room.fullName = columnValue;
		case "views-field views-field-field-building-address":
			return room.shortName = columnValue;
		case "views-field views-field-title":
			return room.address = columnValue;
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

