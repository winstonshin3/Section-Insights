import React, { useRef, useEffect, useState } from 'react'
import { select, line, curveCardinal, axisBottom, scaleBand, axisRight, scaleLinear} from "d3";
import axios from "axios";
function FirstInsight(props) {
	const svgRef = useRef();
	const [queryResult, setQueryResult] = useState([]);
	const [queryMessage, setQueryMessage] = useState("No query has been searched");
	const [datasets, setDatasets] = useState([]);
	const [selectedId, setSelectedId] = useState("");

	const handleDatasetChange = (selectedId) => {
		console.log("Selected Dataset ID:", selectedId);
		setSelectedId(selectedId);
	};

	const listDatasets = async () => {
        try {
            const response = await axios.get('http://localhost:4321/datasets');
            setDatasets(response.data.result); // Assuming the response structure
        } catch (error) {
            console.error('Error fetching datasets', error);
        }
    };

	useEffect(() => {
        listDatasets(); // Fetch datasets on component mount
    }, []);

	const query = {
		WHERE: {
			OR: [
				{IS: { [selectedId + "_dept"]: "math"}},
				{IS: { [selectedId + "_dept"]: "biol"}},
				{IS: { [selectedId + "_dept"]: "cpsc"}}
			]
		},
		OPTIONS: {
			"COLUMNS": [
				selectedId + "_dept",
				"count"
			]
		},
		TRANSFORMATIONS: {
			GROUP: [
				// [`${selectedId}_dept`],
				selectedId +"_dept"
			],
			APPLY: [
				{
					"count": {
						"COUNT": selectedId + "_id"
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


	useEffect(() => {
		if (queryResult.length === 0) return;

		const xScale = scaleBand()
			.domain(queryResult.map(value => value[selectedId + "_dept"]))
			.range([0, 500])
			.padding(0.5);

		const maxCount = Math.max(...queryResult.map(value => value.count));
		const yScale = scaleLinear()
			.domain([0, maxCount])
			.range([150, 0]);

		const colorScale = scaleLinear()
			.domain([0, maxCount])
			.range(["orange", "purple"]);

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
			.attr("fill", value => colorScale(value.count))
			.style("transform", "scale(1, -1)")
			.attr("x", value => xScale(value[selectedId + "_dept"]))
			.attr("y", -150)
			.attr("width", xScale.bandwidth())
			.attr("height", value => 150 - yScale(value.count));
	}, [queryResult]);

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
			<select onChange={(e) => handleDatasetChange(e.target.value)}>
    			{datasets.map((dataset, index) => (
        		<option key={index} value={dataset.id}>{dataset.id}</option>
    			))}
			</select>
		</div>
	);
}

export default FirstInsight


