import React, { useRef, useEffect, useState } from 'react'
import { select, line, curveCardinal, axisBottom, scaleBand, axisRight, scaleLinear} from "d3";
import axios from "axios";
function FirstInsight(props) {
	const svgRef = useRef();
	const [queryResult, setQueryResult] = useState([]);
	const [queryMessage, setQueryMessage] = useState("No query has been searched");
	const query = {
		WHERE: {
			OR: [
				{IS: { "sections_dept": "math"}},
				{IS: { "sections_dept": "biol"}},
				{IS: { "sections_dept": "cpsc"}}
			]
		},
		OPTIONS: {
			"COLUMNS": [
				"sections_dept",
				"count"
			]
		},
		TRANSFORMATIONS: {
			GROUP: [
				"sections_dept"
			],
			APPLY: [
				{
					"count": {
						"COUNT": "sections_id"
					}
				}
			]
		}
	};

	const headers = {
		'Content-Type': 'application/json' // Example header
	};
	const queryDataset = async () => {
		try {
			const response = await axios.post('http://localhost:4321/query', query , {headers});
			setQueryResult(response.data.result);
			setQueryMessage("Query success!")
		} catch (error) {
			setQueryMessage("Query failed!")
		}
	};

	const svg = select(svgRef.current);


	useEffect( () => {
		//define two things for xScale which is the visual representation object of my data
		console.log(queryResult);
		const xScale = scaleBand()
			.domain(queryResult.map((value, index) => value.sections_dept))
			.range([0, 500])
			.padding(0.5);

		const yScale = scaleLinear()
			.domain([0, 150])
			.range([150, 0]); // top left hand is 0,0 where svg starts.

		const colorScale = scaleLinear()
			.domain([0, 150])
			.range(["orange", "purple"]); // top left hand is 0,0 where svg starts.

		const xAxis = axisBottom(xScale).ticks(queryResult.length);

		svg.select(".x-axis")
			.style("transform", "translate(0px, 150px)")
			.call(xAxis)
			.selectAll("text")
			.style("text-anchor", "end")
			.attr("transform", "rotate(-90) translate(-10, -10)");


		const yAxis = axisRight(yScale);

		svg.select(".y-axis")
			.style("transform", "translate(500px, 0px)")
			.call(yAxis);

		svg.selectAll(".bar")
			.data(queryResult)
			.join("rect")
			.attr("class", "bar")
			.attr("fill", (value) => colorScale(value.count))
			.style("transform", "scale(1, -1)")
			.attr("x", (value, index) => xScale(value.sections_dept))
			.attr("y", -150)
			.attr("width", xScale.bandwidth())
			.attr("height", (value, index) => 150 - yScale(value.count));
	},[queryResult]);

	return (
		<div>
			<p>Display of Number of Unique Course Code For BIOL CPSC MATH</p>
			<div>
				<svg ref={svgRef} width="550" height="200">
					<g className="x-axis"></g>
					<g className="y-axis"></g>
				</svg>

			</div>
			<button onClick={queryDataset}>Refresh Graph</button>

			<p>{queryMessage}</p>
		</div>
	);
}

export default FirstInsight

