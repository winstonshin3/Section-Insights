import React, { useState, useRef } from 'react';
import axios from 'axios';
// import React, { useRef } from 'react';
import './DatasetList.css';

function DatasetList() {
	// const [datasets, setDatasets] = useState([]);
	const [datasets, setDatasets] = useState([]);
    const [queryResult, setQueryResult] = useState([]);
    const [queryMessage, setQueryMessage] = useState("No query has been searched");
const svgRef = useRef();

	const listDatasets = async () => {
        try {
            const response = await axios.get('http://localhost:4321/datasets');
			console.log(response.data.result);
            setDatasets(response.data.result);
        } catch (error) {
            console.error('error fetching data', error);
			setDatasets(null);
        }
    };

    return (
        // <div>
		// 	<button onClick={listDatasets}>Refresh List</button>
        //     <ul id="datasetList">
		// 		{datasets.map((dataset, index) => (
		// 			<li key={index}>
        //             ID: {dataset.id}, Kind: {dataset.kind}, Number of Rows: {dataset.numRows}
        //         </li>
		// 		))}
        //     </ul>
        // </div>
		<div className="dataset-container">
            <h2 className="dataset-header">Datasets</h2>
            <button className="refresh-button" onClick={listDatasets}>Refresh List</button>
            <ul className="dataset-list">
                {datasets.map((dataset, index) => (
                    <li key={index} className="dataset-item">
                        <span>ID: {dataset.id}</span>,
                        <span> Kind: {dataset.kind}</span>,
                        <span> Number of Rows: {dataset.numRows}</span>
                    </li>
                ))}
            </ul>
        </div>


    );
};

export default DatasetList;
