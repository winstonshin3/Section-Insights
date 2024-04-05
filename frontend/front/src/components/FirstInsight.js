import React, { useRef, useEffect, useState } from 'react'
import { select, line, curveCardinal, axisBottom, scaleBand, axisRight, scaleLinear} from "d3";
import axios from "axios";
import { max } from 'd3-array';
import { axisLeft } from 'd3-axis';
import { arc, pie } from 'd3-shape';
import { scaleOrdinal } from 'd3-scale';


function FirstInsight(props) {
	const svgRef = useRef();
	const [queryResult, setQueryResult] = useState([]);
	const [queryResult1, setQueryResult1] = useState([]);
	const [queryResult2, setQueryResult2] = useState([]);
	const [queryMessage, setQueryMessage] = useState("No query has been searched");
	const [datasets, setDatasets] = useState([]);
	const [selectedId, setSelectedId] = useState("");

	const barChartRef1 = useRef();
	const barChartRef2 = useRef();
	const barChartRef = useRef();
	const lineChartRef = useRef();
	const pieChartRef = useRef();
	const svgWidth = 550;
	const svgHeight = 200;
	const margin = { top: 20, right: 30, bottom: 40, left: 50 };


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

	const query2 = {
		WHERE: {
			OR: [
				{IS: { [selectedId + "_dept"]: "asia"}},
				{IS: { [selectedId + "_dept"]: "econ"}},
				{IS: { [selectedId + "_dept"]: "engl"}}
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

	const query3 = {
		WHERE: {
			OR: [
				{IS: { [selectedId + "_dept"]: "asia"}},
				{IS: { [selectedId + "_dept"]: "econ"}},
				{IS: { [selectedId + "_dept"]: "engl"}}
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
			const response = await axios.post('http://localhost:4321/query', query, {headers});
			setQueryResult(response.data.result);
			setQueryMessage("Query success!")
		} catch (error) {
			setQueryMessage("Query failed!")
		}
	};
	const queryDataset1 = async () => {
		try {
			const response = await axios.post('http://localhost:4321/query', query2, { headers });
			setQueryResult1(response.data.result);
			setQueryMessage("Query 1 success!");
		} catch (error) {
			setQueryMessage("Query 1 failed!");
		}
	};

	const queryDataset2 = async () => {
		try {
			const response = await axios.post('http://localhost:4321/query', query3, { headers });
			setQueryResult2(response.data.result);
			setQueryMessage("Query 2 success!");
		} catch (error) {
			setQueryMessage("Query 2 failed!");
		}
	};


	useEffect(() => {
		if (queryResult.length === 0) return;

		const svg = select(barChartRef1.current);
		svg.selectAll("*").remove();

		svg.append("g")
			.attr("class", "x-axis")
			.attr("transform", `translate(0, ${svgHeight - margin.bottom})`);

		 svg.append("g")
			.attr("class", "y-axis")
			.attr("transform", `translate(${margin.left}, 0)`)

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
			svg.select(".x-axis").call(xAxis);
			svg.select(".y-axis").call(yAxis);

	}, [queryResult]);

	useEffect(() => {
		if (queryResult1.length === 0) return;

		const svg2 = select(pieChartRef.current);
		svg2.selectAll("*").remove(); // Clear previous SVG contents

		// Pie and Arc setup
		const radius = Math.min(svgWidth, svgHeight) / 2 - margin.top;
		const pieGenerator = pie()
			.value(d => d.count); // Replace 'count' with the correct property name

		const arcGenerator = arc()
			.innerRadius(0)
			.outerRadius(radius);

		// Color Scale
		const colorScale = scaleOrdinal()
			.domain(queryResult1.map(d => d[selectedId + "_dept"])) // Replace with the correct property
			.range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]);

		// Create and position the group element
		const group = svg2
			.attr("width", svgWidth)
			.attr("height", svgHeight)
			.append("g")
			.attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`);

		// Create arcs
		group.selectAll(".arc")
			.data(pieGenerator(queryResult1))
			.enter()
			.append("path")
			.attr("class", "arc")
			.attr("d", arcGenerator)
			.attr("fill", d => colorScale(d.data[selectedId + "_dept"])); // Color based on department

		// Add Labels
		group.selectAll("text")
			.data(pieGenerator(queryResult1))
			.enter()
			.append("text")
			.attr("transform", d => `translate(${arcGenerator.centroid(d)})`)
			.attr("text-anchor", "middle")
			.text(d => `${d.data[selectedId + "_dept"]}: ${d.data.count}`)
			.style("font-size", "10px")
			.style("fill", "black"); // Change font color if needed

	}, [queryResult1]);

	useEffect(() => {
		if (queryResult2.length === 0) return;

		const svg = select(barChartRef2.current);
		svg.selectAll("*").remove();

		svg.append("g")
			.attr("class", "x-axis")
			.attr("transform", `translate(0, ${svgHeight - margin.bottom})`);

		svg.append("g")
			.attr("class", "y-axis")
			.attr("transform", `translate(${margin.left}, 0)`)

		const xScale = scaleBand()
			.domain(queryResult2.map(value => value[selectedId + "_dept"]))
			.range([0, 500])
			.padding(0.5);

		const maxCount = Math.max(...queryResult2.map(value => value.count));
		const yScale = scaleLinear()
			.domain([0, maxCount])
			.range([150, 0]);

		const colorScale = scaleLinear()
			.domain([0, maxCount])
			.range(["orange", "purple"]);

		const xAxis = axisBottom(xScale).ticks(queryResult2.length);

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
			.data(queryResult2)
			.join("rect")
			.attr("class", "bar")
			.attr("fill", value => colorScale(value.count))
			.style("transform", "scale(1, -1)")
			.attr("x", value => xScale(value[selectedId + "_dept"]))
			.attr("y", -150)
			.attr("width", xScale.bandwidth())
			.attr("height", value => 150 - yScale(value.count));
			svg.select(".x-axis").call(xAxis);
			svg.select(".y-axis").call(yAxis);

	}, [queryResult2]);


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
			<button onClick={queryDataset1}>Refresh Graph 1</button>
			<button onClick={queryDataset2}>Refresh Graph 2</button>
			<svg ref={barChartRef1} width={svgWidth} height={svgHeight}>
            {/* Components for the first bar chart */}
			</svg>
			<svg ref={pieChartRef} width={svgWidth} height={svgHeight}>
				{/* Components for the second bar chart */}
			</svg>
			<svg ref={barChartRef2} width={svgWidth} height={svgHeight}>
				{/* Components for the second bar chart */}
			</svg>

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


