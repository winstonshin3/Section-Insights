import React, { useState } from 'react';
import axios from 'axios';
// import { useEffect } from 'react';
import JSZip from 'jszip';

//use path name to zip file to get the name of the dataset, then use JsZip to extract the files


// function AddDatasetComponent() {
//     const [file, setFile] = useState(null);
//     const [datasetId, setDatasetId] = useState('');
//     const [kind, setKind] = useState('');
//     const [submitting, setSubmitting] = useState(false);
//     const [message, setMessage] = useState('');

// 	const [uploadData, setUploadData] = useState('');
// 	// const fs = require('fs').promises;
// 	// const JSZip = require('jszip');

//     const handleSubmit = async (event) => {
//         event.preventDefault();
//         if (!file || !datasetId || !kind) {
//             setMessage('Please fill all fields and select a file.');
//             return;
//         }

//         setSubmitting(true);
//         const formData = new FormData();
//         formData.append('dataset', file);

//         try {
//             const response = await axios.put(`http://localhost:4321/dataset/${datasetId}/${kind}`, formData, {
//                 headers: { 'Content-Type': 'multipart/form-data' }
//             });
// 			console.log('response:', response);
//             setMessage(`Dataset added successfully: ${response.data}`);
//         } catch (error) {
//             console.error('Error adding dataset:', error);
//             setMessage(`Error adding dataset: ${error.message}`);
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     return (
//         <form onSubmit={handleSubmit}>
//             <input
//                 type="text"
//                 value={datasetId}
//                 onChange={e => setDatasetId(e.target.value)}
//                 placeholder="Dataset ID"
//                 disabled={submitting}
//             />
//             <select
//                 value={kind}
//                 onChange={e => setKind(e.target.value)}
//                 disabled={submitting}
//             >
//                 <option value="">Select Type</option>
//                 <option value="rooms">Rooms</option>
//                 <option value="sections">Sections</option>
//             </select>
//             <input
//                 type="text"
//                 onChange={e => setUploadData(e.target.value)}
//                 // accept=".zip"
//                 disabled={submitting}
//             />
//             <button type="submit" disabled={submitting}>Add Dataset</button>
//             {message && <p>{message}</p>}
//         </form>
//     );
// };

// export default AddDatasetComponent;


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

        try {

			const object = {
				// method: 'put',
				url: `http://localhost:4321/dataset/${datasetId}/${kind}`,
				headers: {
				  'Content-Type': 'multipart/form-data'
				},
				data: file
			};

            const response = axios.put(`http://localhost:4321/dataset/${datasetId}/${kind}`, object);

            console.log('response:', response);
            setMessage(`Dataset added successfully: ${response.data}`);
        } catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				console.error('Error response data:', error.response.data);
				setMessage(`Error processing file1: ${error.response.data}`);
			} else {
				console.error('Error processing file:', error);
				setMessage(`Error processing file2: ${error.message}`);
			}
		} finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="file" // Change to file input
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
