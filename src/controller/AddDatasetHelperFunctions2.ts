import JSZip from "jszip";
import * as parse5 from "parse5";
import {InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import http from "node:http";
import {assignRoomValue, filterNodeListByNodeName, getColumnValue} from "./AddDatasetHelperFunctions1";

export async function getContentsRoomFiles(fileNames: string[], zip: JSZip, id: string) {
	let filePromises = fileNames.map(async (fileName) => {
		let file = zip.file(fileName);
		if (file != null) {
			try {
				let fileContent = await file.async("string");
				let parsedContent = parse5.parse(fileContent);
				let tableRows = getNodesByNodeName(parsedContent, "tr");
				// TODO To validate tableRows can be filtered.
				let columnContents = [];
				for (let tableRow of tableRows) {
					let columnContent = getTableColumns(tableRow.childNodes);
					columnContent["marker"] = fileName;
					columnContents.push(columnContent);
				}
				return columnContents;
			} catch (e) {
				throw new InsightError("Error processing file: " + fileName);
			}
		} else {
			return [];
		}
	});
	let contentsInDifferentFiles = await Promise.all(filePromises);
	return ([] as any[][]).concat(...contentsInDifferentFiles);
}

export function getTableColumns(tableRow: any[]) {
	let filteredTableRow = filterNodeListByNodeName(tableRow, "td");
	let room: any = {marker: "null", number: "null", seats: "null", type: "null", furniture: "null", href: "null"};
	for (let column of filteredTableRow) {
		let columnName = column.attrs[0]["value"];
		let columnValue = getColumnValue(column, columnName);
		assignRoomValue(room, columnName, columnValue);
	}
	return room;
}

export function parseBuildingRow(row: any) {
	let rowContents = row.childNodes;
	let room: any = {fullName: "null", shortName: "null", address: "null"};
	rowContents = filterNodeListByNodeName(rowContents, "td");
	for (let column of rowContents) {
		let columnName = column.attrs[0]["value"];
		let columnValue = getColumnValue(column, columnName);
		assignRoomValue(room, columnName, columnValue);
		// TODO Could use an else statement here to handle invalid (incomplete) rooms.
	}
	delete room["href"];
	return room;
}

export function addRoomId(unLabeledCacheData: any[], id: string) {
	return unLabeledCacheData.map((data: any) => ({
		[`${id}_fullname`]: data.fullName as string,
		[`${id}_shortname`]: data.shortName as string,
		[`${id}_number`]: data.number as string,
		[`${id}_name`]: (`${data.shortName}_${data.number}`) as string,
		[`${id}_address`]: data.address as string,
		[`${id}_lat`]: Number(data.lat),
		[`${id}_lon`]: Number(data.lon),
		[`${id}_seats`]: Number(data.seats),
		[`${id}_type`]: data.type as string,
		[`${id}_furniture`]: data.furniture as string,
		[`${id}_href`]: data.href as string,
	}));
}

export function filterCacheData(unfilteredCacheData: any[]) {
	return unfilteredCacheData.filter((data) => {
		let dataValues = Object.values(data);
		return !dataValues.includes("null");
	});
}

// export function filterValidRoomTable(allTables: any[]) {
// 	return allTables.filter((table) => {
// 		return validRoomTable(table);
// 	});
// }
//
// export function validRoomTable(table: any) {
// 	let rowNode = getFirstNodeByNodeName(table, "tr");
// 	let columnNodes = getNodesByNodeName(rowNode, "th");
// 	let columnNames = columnNodes.map((columnNode) => {
// 		for (let attr of columnNode.attrs) {
// 			if (attr["name"] === "class") {
// 				return attr["value"];
// 			} else {
// 				return "";
// 			}
// 		}
// 	});
// }

export function getNodesByNodeName(startingNode: any, nodeName: string) {
	let frontier: any[] = [];
	let currentNode: any;
	let result: any[] = [];
	frontier.push(startingNode);
	while(!(frontier.length === 0)) {
		currentNode = frontier.pop();
		let keys = Object.keys(currentNode);
		if (currentNode["nodeName"] === nodeName && keys.includes("childNodes")) {
			result.push(currentNode);
		} else if (keys.includes("childNodes")) {
			if (Array.isArray(currentNode.childNodes)) {
				frontier.push(...currentNode.childNodes);
			}
		}
	}
	return result;
}

// export function getFirstNodeByNodeName(startingNode: any, nodeName: string) {
// 	let frontier: any[] = [];
// 	let currentNode: any;
// 	let result: any[] = [];
// 	frontier.push(startingNode);
// 	while(!(frontier.length === 0)) {
// 		currentNode = frontier.pop();
// 		let keys = Object.keys(currentNode);
// 		if (currentNode["nodeName"] === nodeName && keys.includes("childNodes")) {
// 			result.push(currentNode);
// 			break;
// 		} else if (keys.includes("childNodes")) {
// 			if (Array.isArray(currentNode.childNodes)) {
// 				frontier.push(...currentNode.childNodes);
// 			}
// 		}
// 	}
// 	return result;
// }

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

export function matchByMarker(roomTables: any[], buildingTable: any[]){
	let result = [];
	let count = 0;
	for (let roomTable of roomTables) {
		for (let building of buildingTable) {
			let marker = roomTable["marker"].slice(41, -4);
			if (marker === building["shortName"]) {
				count++;
				let roomDataRow = {...roomTable, ...building};
				delete roomDataRow["marker"];
				result.push(roomDataRow);
			}
		}
	}
	return result;
}
