import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {assert, expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives, readFileQueries} from "../TestUtil";

use(chaiAsPromised);

export interface ITestQuery {
	title: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	// Declare datasets used in tests. You should add more datasets like this!
	let facade: IInsightFacade;
	let sections: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		// await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			// await clearDisk();
		});

		it("Fail to addDataset because of blank id", async function () {

			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});
	describe("ListDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			// await clearDisk();
		});
		it ("add once", async function() {
			const result = await facade.listDatasets();
			return expect(result).to.have.deep.members([{id: "sections", kind: InsightDatasetKind.Sections, numRows: 64612}]);
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
			];
			try {
				await Promise.all(loadDatasetPromises);
			} catch(err) {
				console.log(err);
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			// await clearDisk();
		});

		describe("valid queries", function() {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function(test: any) {
				it(`${test.title}`, function () {
					return facade.performQuery(test.input).then((result) => {
						expect(result).to.have.deep.members(test.expected);
					}).catch((err: any) => {
						console.log(err);
						assert.fail("Shouldn't throw anything!");
						// console.log(err);
						// assert.fail(`performQuery threw unexpected error: ${err}`);
					});
				});
			});
		});

		// describe("invalid queries", function() {
		// 	let invalidQueries: ITestQuery[];
		//
		// 	try {
		// 		invalidQueries = readFileQueries("invalid");
		// 	} catch (e: unknown) {
		// 		expect.fail(`Failed to read one or more test queries. ${e}`);
		// 	}
		//
		// 	invalidQueries.forEach(function(test: any) {
		// 		it(`${test.title}`, function () {
		// 			return facade.performQuery(test.input).then((result) => {
		// 				assert.fail(`performQuery resolved when it should have rejected with ${test.expected}`);
		// 			}).catch((err: any) => {
		// 				if (test.expected === "InsightError") {
		// 					expect(err).to.be.instanceOf(InsightError);
		// 				} else {
		// 					assert.fail("Query threw unexpected error");
		// 				}
		// 			});
		// 		});
		// 	});
		// });
	});
});
