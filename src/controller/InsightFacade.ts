import JSZip = require("jszip");
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import * as fs from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, InsightDataset>;
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasets = new Map<string, InsightDataset>();

	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// if (id === "" || id.includes("_") || id.trim() === "") {
		// 	return Promise.reject(new InsightError("Invalid id"));
		// }
		// if (this.datasets.has(id)) {
		// 	return Promise.reject(new InsightError("Dataset already exists"));
		// }
		if (id === "" || id.includes("_") || id.trim() === "" || this.datasets.has(id)) {
			return Promise.reject(new InsightError(this.datasets.has(id) ? "Dataset already exists" : "Invalid id"));
		}
		let zip = await JSZip.loadAsync(content, {base64: true});
		let folder = zip.folder("courses");
		if (folder === null) {
			return Promise.reject(new InsightError("Folder not found in zip"));
		}
		let array = [];
		let fileInFolder = zip.files;
		let fileNames = Object.keys(fileInFolder);
		const filePromises = fileNames.map(async (fileName) => {
			let file = zip.file(fileName);
			if (file != null) {
				try {
					let jsonContent = await file.async("string");
					let data = JSON.parse(jsonContent);
					let dataPoints = data.result;
					return dataPoints.map((l: any) => ({
						[`${id}_uuid`]: l.id,
						[`${id}_id`]: l.Course,
						[`${id}_title`]: l.Title,
						[`${id}_instructor`]: l.Professor,
						[`${id}_subject`]: l.Subject,
						[`${id}_year`]: l.Year,
						[`${id}_avg`]: l.Avg,
						[`${id}_pass`]: l.Pass,
						[`${id}_fail`]: l.Fail,
						[`${id}_audit`]: l.Audit,
					}));
				} catch (e) {
					throw new InsightError("Error processing file: " + fileName);
				}
			}
			return [];
		});
		try {
			const results = await Promise.all(filePromises);
			for (const result of results) {
				array.push(...result);
			}
			await fs.ensureDir("./data");
			await fs.writeJson("./data/test.json", array);
		} catch (err) {
			return Promise.reject(err);
		}
		return Promise.reject(new InsightError());
	}

	public async removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}

