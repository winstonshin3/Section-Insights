import React, { useState } from 'react';

function InsightChartComponent() {
    const [queryResults, setQueryResults] = useState(null); // State to store query results

    const handleSubmit = async (event) => {
        event.preventDefault();

        const query = {
            "WHERE": {
                "GT": {
                    "sections_avg": 97
                }
            },
            "OPTIONS": {
                "COLUMNS": [
                    "sections_dept",
                    "sections_avg"
                ],
                "ORDER": "sections_avg"
            }
        };

        try {
            const response = await fetch("http://localhost:4321/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(query),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setQueryResults(data); // Update the state with query results
        } catch (error) {
            console.log("Error fetching data:", error);
        }
    };

    return (
        <div>
        <form onSubmit={handleSubmit}>
            {/* Input fields */}
            <button type="submit">Submit</button>
        </form>
        {queryResults && (
            <div>
                <h2>Query Results</h2>
                {queryResults.result && (
                    <ul>
                        {queryResults.result.map((item, index) => (
                            <li key={index}>
                                Department: {item.sections_dept}, Average: {item.sections_avg}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )}
    </div>
    );
};

export default InsightChartComponent;
