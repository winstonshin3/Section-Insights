import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {assert, expect} from "chai";
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
		return server
			.start()
			.then(() => {
				console.info("App::initServer() - started");
			})
			.catch((err: Error) => {
				console.error(`App::initServer() - ERROR: ${err.message}`);
			});
	});

	after(async function () {
		// TODO: stop server here once!
		await clearDisk();
		return server
			.stop()
			.then(() => {
				console.info("App::initServer() - stopped");
			})
			.catch((err: Error) => {
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
	it("Successfully add dataset", async function () {
		try {
			return request("http://localhost:4321")
				.put("/dataset/sections/sections")
				.send(content)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.have.deep.members(["sections"]);
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it("Fail add duplicate dataset", async function () {
		try {
			return request("http://localhost:4321")
				.put("/dataset/sections/sections")
				.send(content)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(400);
					expect(typeof res.body.error).to.be.equal("string");
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it("Successfully query dataset", async function () {
		const fileQuery = fs.readJSONSync("test/resources/queries/valid/simple.json");
		const queryString = JSON.stringify(fileQuery.input);
		try {
			return request("http://localhost:4321")
				.post("/query")
				.send(queryString)
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.have.deep.members(fileQuery.expected);
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it("Fail query dataset", async function () {
		const fileQuery = fs.readJSONSync("test/resources/queries/invalid/invalidWhereType3.json");
		const queryString = JSON.stringify(fileQuery.input);
		try {
			return request("http://localhost:4321")
				.post("/query")
				.send(queryString)
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(400);
					expect(typeof res.body.error).to.be.equal("string");
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it("Successfully delete datatset", async function () {
		try {
			return request("http://localhost:4321")
				.delete("/dataset/sections")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.be.equal("sections");
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it("Fail to delete dataset notFoundError", async function () {
		try {
			return request("http://localhost:4321")
				.delete("/dataset/sections")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(404);
					expect(typeof res.body.error).to.be.equal("string");
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	it("Fail to delete dataset insightError", async function () {
		try {
			return request("http://localhost:4321")
				.delete("/dataset/_")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(400);
					expect(typeof res.body.error).to.be.equal("string");
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});


	it("Get test for list dataset", function () {
		try {
			return request("http://localhost:4321")
				.get("/datasets")
				.set("Content-Type", "application/")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.be.deep.equal([]);
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			expect.fail();
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
});
