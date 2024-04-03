import React, { useState } from 'react';
import axios from 'axios';

const AddDatasetComponent = () => {
    const [file, setFile] = useState(null);
    const [datasetId, setDatasetId] = useState('');
    const [kind, setKind] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!file || !datasetId || !kind) {
            setMessage('Please fill all fields and select a file.');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('dataset', file);

        try {
            const response = await axios.put(`http://localhost:4321/dataset/${datasetId}/${kind}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
			console.log('response:', response);
            setMessage(`Dataset added successfully: ${response.data}`);
        } catch (error) {
            console.error('Error adding dataset:', error);
            setMessage(`Error adding dataset: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
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
            <input
                type="file"
                onChange={e => setFile(e.target.files[0])}
                accept=".zip"
                disabled={submitting}
            />
            <button type="submit" disabled={submitting}>Add Dataset</button>
            {message && <p>{message}</p>}
        </form>
    );
};

export default AddDatasetComponent;
