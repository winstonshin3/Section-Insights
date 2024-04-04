import React, { useState } from 'react';
import axios from 'axios';

function DatasetList() {
	const [datasets, setDatasets] = useState([]);
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
        <div>
            <button onClick={listDatasets}>Refresh List</button>
            <ul id="datasetList">
				{datasets.map((dataset, index) => (
					<li key={index}>
                    ID: {dataset.id}, Kind: {dataset.kind}, Number of Rows: {dataset.numRows}
                </li>
				))}
            </ul>
        </div>


    );
};

export default DatasetList;
