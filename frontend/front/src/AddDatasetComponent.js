import React, { useState } from 'react';
import axios from 'axios';
// import { useEffect } from 'react';
import JSZip from 'jszip';


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
        		setMessage(`Dataset added successfully: ${JSON.stringify(responseData)}`);
            } catch (error) {
                setMessage(`Error processing file: ${error.message}`);
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
        <form onSubmit={handleSubmit}>
            <input
                type="file"
                onChange={e => setFile(e.target.files[0])} // Set the selected file
				accept=".zip"
                disabled={submitting}
            />
            <input
                type="text"
                value={datasetId}
                onChange={e => setDatasetId(e.target.value)}
                placeholder="Dataset ID"
                disabled={submitting}
				// ref = {fileInputRef}
            />
            <select
                value={kind}
                onChange={e => setKind(e.target.value)}
                disabled={submitting}
            >
                <option value="">Select Type</option>
                <option value="rooms">Rooms</option>
                <option value="sections">Sections</option>
            </select>
            <button type="submit" disabled={submitting}>Add Dataset</button>
            {message && <p>{message}</p>}
        </form>
    );
};

export default AddDatasetComponent;
