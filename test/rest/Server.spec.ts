import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import {clearDisk, getBuffer} from "../TestUtil";
import * as fs from "fs-extra";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;
	let id: string;
	let kind: InsightDatasetKind;
	let content: Buffer;

	before(async function () {
		await clearDisk();
		facade = new InsightFacade();
		server = new Server(4321);
		id = "sections";
		kind = InsightDatasetKind.Sections;
		content = await getBuffer("pair.zip");
		// TODO: start server here once and handle errors properly
		return server.start().then(() => {
			console.info("App::initServer() - started");
		}).catch((err: Error) => {
			console.error(`App::initServer() - ERROR: ${err.message}`);
		});
	});

	after( async function () {
		// TODO: stop server here once!
		await clearDisk();
		return server.stop().then(() => {
			console.info("App::initServer() - stopped");
		}).catch((err: Error) => {
			console.error(`App::initServer() - ERROR: ${err.message}`);
		});
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests

	it("Get test for list dataset", function () {
		try {
			return request("http://localhost:4321")
				.get("/listDataSet")
				.set("Content-Type", "application/")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it.only("Successfully add dataset", async function () {
		try {
			return request("http://localhost:4321")
				.put("/addDataSet/sections/sections")
				.send(content)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it.only("Successfully delete datatset", async function () {
		try {
			return request("http://localhost:4321")
				.delete("/deleteDataset/sections")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it.only("Fail to delete dataset", async function () {
		try {
			return request("http://localhost:4321")
				.delete("/deleteDataset/sections")
				.then(function (res: Response) {
					expect.fail();
				})
				.catch(function (err) {
					// TEST PASSED
				});
		} catch (err) {
			expect.fail();
		}
	});

	it("Post test for querying dataset", async function () {
		const fileQuery = fs.readJSONSync("test/resources/queries/valid/simple.json");
		const queryString = JSON.stringify(fileQuery.input);
		try {
			return request("http://localhost:4321")
				.post("/queryDataset")
				.send(queryString)
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});


	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
});
