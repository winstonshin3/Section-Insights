import React, { useState } from 'react';
import axios from 'axios';

const DeleteDatasetComponent = () => {
    const [datasetId, setDatasetId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!datasetId) {
            setMessage('Please enter a Dataset ID.');
            return;
        }

        try {
            setSubmitting(true);
            const response = await axios.delete(`http://localhost:4321/dataset/${datasetId}`);
            setMessage(`Dataset deleted successfully: ${response.data}`);
        } catch (error) {
            console.error('Error deleting dataset:', error);
            setMessage(`Error deleting dataset: ${error.message}`);
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
            <button type="submit" disabled={submitting}>Delete Dataset</button>
            {message && <p>{message}</p>}
        </form>
    );
};

export default DeleteDatasetComponent;
