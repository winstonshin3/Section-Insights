import {InsightDatasetKind, InsightError, ResultTooLargeError,} from "../../src/controller/IInsightFacade";

import InsightFacade from "../../src/controller/InsightFacade";
import {assert, expect} from "chai";
import * as fs from "fs-extra";
// import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives, readFileQueries} from "../TestUtil";
import chai = require("chai");

chai.use(require("chai-as-promised"));
// use(chaiAsPromised);

export interface ITestQuery {
	title: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let facade: InsightFacade;
	let failData: string;
	let missingKey: string;
	let emptyCourse: string;
	let rooms: string;

	before(async function () {
		// This block runs once and loads the datasets.
		// sections = await getContentFromArchives("pair.zip");
		try {
			sections = await getContentFromArchives("pair.zip");
			failData = await getContentFromArchives("failData.zip");
			missingKey = await getContentFromArchives("missingKey.zip");
			emptyCourse = await getContentFromArchives("emptyCourseData.zip");
			rooms = await getContentFromArchives("campus.zip");
			await clearDisk();
		} catch (err) {
			console.log(err);
		}
		// Just in case there is anything hanging around from a previous run of the test suite
	});

	describe("RemoveDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("Should remove data", async function () {
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			const result = facade.removeDataset("sections");
			return expect(result).to.eventually.deep.equal("sections");
		});

		it("Should reject data", async function () {
			const result = facade.removeDataset("");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("ListDataset", async function () {
		beforeEach(async function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
			await clearDisk();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});
		it("add once", async function () {
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			const result = await facade.listDatasets();
			let expected = [{id: "sections", kind: InsightDatasetKind.Sections, numRows: 64612}];
			return expect(result).to.have.deep.members(expected);
		});
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			// This section resets the insightFacade instance
			// This runs before each test
			await clearDisk();
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("Fail to addDataset because of blank id", async function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("successfully add a sections dataset", async function () {
			const result = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			return expect(result).to.have.deep.members(["sections"]);
		});

		it("successfully add a rooms dataset", async function () {
			const result = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			return expect(result).to.have.deep.members(["rooms"]);
		});

		it("should reject adding duplicate dataset", async function () {
			await facade.addDataset("ubc", rooms, InsightDatasetKind.Rooms);
			const result = facade.addDataset("ubc", rooms, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with white space only dataset id", function () {
			const result = facade.addDataset(" ", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject id with underscore in it", function () {
			const result = facade.addDataset("_", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject because not base64", async function () {
			const failSection = await fs.readFile("test/resources/archives/testData.zip").toString();
			const result = facade.addDataset("base64", failSection, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with not valid folder", function () {
			const result = facade.addDataset("noCourseFolder", failData, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject as course file is empty", function () {
			const result = facade.addDataset("emptyCourseFolder", emptyCourse, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject as there are missing keys", function () {
			const result = facade.addDataset("emptyCourseFolder", missingKey, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You can and should still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", function () {
		before(async function () {
			facade = new InsightFacade();
			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
			];
			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		describe("valid queries", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test: any) {
				it(`${test.title}`, function () {
					return facade
						.performQuery(test.input)
						.then((result) => {
							expect(result).to.have.deep.members(test.expected);
						})
						.catch((err: any) => {
							assert.fail(`performQuery threw unexpected error: ${err}`);
						});
				});
			});
		});

		describe("invalid queries", function () {
			let inValidQueries: ITestQuery[];
			try {
				inValidQueries = readFileQueries("invalid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			inValidQueries.forEach(function (test: any) {
				it(`${test.title}`, function () {
					return facade
						.performQuery(test.input)
						.then((result) => {
							assert.fail("Shouldn't throw anything!");
						})
						.catch((err: any) => {
							// console.log(err.message.substring(0,50));
							if (test.expected === "ResultTooLargeError") {
								expect(err).to.be.instanceOf(ResultTooLargeError);
							} else {
								expect(err).to.be.instanceOf(InsightError);
							}
						});
				});
			});
		});
	});
});
