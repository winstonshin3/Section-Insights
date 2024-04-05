import React, { useState } from 'react';
import axios from 'axios';
import './DeleteDatasetComponent.css';

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
        // <form onSubmit={handleSubmit}>
        //     <input
        //         type="text"
        //         value={datasetId}
        //         onChange={e => setDatasetId(e.target.value)}
        //         placeholder="Dataset ID"
        //         disabled={submitting}
        //     />
        //     <button type="submit" disabled={submitting}>Delete Dataset</button>
        //     {message && <p>{message}</p>}
        // </form>
		<div className="delete-dataset-container">
            <h2>Delete Dataset</h2>
            <form onSubmit={handleSubmit} className="delete-dataset-form">
                <div className="form-group">
                    <input
                        type="text"
                        className="input-field"
                        value={datasetId}
                        onChange={e => setDatasetId(e.target.value)}
                        placeholder="Dataset ID"
                        disabled={submitting}
                    />
                </div>
                <button type="submit" disabled={submitting} className="delete-button">Delete Dataset</button>
                {message && <p className="message">{message}</p>}
            </form>
        </div>
    );
};

export default DeleteDatasetComponent;
