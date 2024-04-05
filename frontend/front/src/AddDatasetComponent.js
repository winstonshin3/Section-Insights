import React, { useState } from 'react';
import axios from 'axios';
// import { useEffect } from 'react';
import JSZip from 'jszip';
import './AddDatasetComponent.css';


function AddDatasetComponent() {
    const [file, setFile] = useState(null);
    const [datasetId, setDatasetId] = useState('');
    const [kind, setKind] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (event) => {
		event.preventDefault();
		if (!file || !datasetId || !kind) {
			setMessage('Please fill all fields and provide a file path.');
			return;
		}

		setSubmitting(true);

		//const formData = new FormData();
		//formData.append('dataset', file); // Append the file directly without converting to Buffer


		const reader = new FileReader();
		reader.readAsArrayBuffer(file);
        reader.onload = async () => {
            const rawBuffer = reader.result;
            try {
                const response = await fetch(`http://localhost:4321/dataset/${datasetId}/${kind}`, {
					method: 'put',
					// url: 'http://localhost:4321/dataset/${datasetId}/${kind}',
					headers: {
				  'Content-Type': file.type,
					},
					body : rawBuffer
				});
                // setMessage(`Dataset added successfully: ${response}`);
				const responseData = await response.json(); // Or response.text(), if the response is plain text
        		setMessage(`${JSON.stringify(responseData)}`);
            } catch (error) {
                setMessage(`Error processing file: ${error.message.error}`);
            } finally {
                setSubmitting(false);
            }
        };
        reader.onerror = () => {
            setMessage('Error reading the file.');
            setSubmitting(false);
        };
        // reader.readAsArrayBuffer(file);

	};


    return (
        // <form onSubmit={handleSubmit}>
        //     <input
        //         type="file"
        //         onChange={e => setFile(e.target.files[0])} // Set the selected file
		// 		accept=".zip"
        //         disabled={submitting}
        //     />
        //     <input
        //         type="text"
        //         value={datasetId}
        //         onChange={e => setDatasetId(e.target.value)}
        //         placeholder="Dataset ID"
        //         disabled={submitting}
		// 		// ref = {fileInputRef}
        //     />
        //     <select
        //         value={kind}
        //         onChange={e => setKind(e.target.value)}
        //         disabled={submitting}
        //     >
        //         <option value="">Select Type</option>
        //         <option value="rooms">Rooms</option>
        //         <option value="sections">Sections</option>
        //     </select>
        //     <button type="submit" disabled={submitting}>Add Dataset</button>
        //     {message && <p>{message}</p>}
        // </form>
		<div className="add-dataset-container">
		<h2>Add Dataset</h2>
		<form onSubmit={handleSubmit} className="add-dataset-form">
			<div className="form-group">
				<label htmlFor="fileInput">Dataset File : </label>
				<input
					id="fileInput"
					type="file"
					onChange={e => setFile(e.target.files[0])}
					accept=".zip"
					disabled={submitting}
				/>
			</div>
			<div className="form-group">
				<label htmlFor="datasetIdInput">Dataset ID : </label>
				<input
					id="datasetIdInput"
					type="text"
					value={datasetId}
					onChange={e => setDatasetId(e.target.value)}
					placeholder="Dataset ID"
					disabled={submitting}
				/>
			</div>
			<div className="form-group">
				<label htmlFor="kindSelect">Dataset Type : </label>
				<select
					id="kindSelect"
					value={kind}
					onChange={e => setKind(e.target.value)}
					disabled={submitting}
				>
					<option value="">Select Type</option>
					<option value="rooms">Rooms</option>
					<option value="sections">Sections</option>
				</select>
			</div>
			<button type="submit" disabled={submitting} className="submit-button">Add Dataset</button>
			{message && <p className="feedback-message">{message}</p>}
		</form>
	</div>
    );
};

export default AddDatasetComponent;
