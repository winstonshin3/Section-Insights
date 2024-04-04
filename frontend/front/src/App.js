
import './App.css';
import DatasetList from './DatasetList';
import AddDatasetComponent from './AddDatasetComponent';
import DeleteDatasetComponent from './DeleteDatasetComponent';

function App() {
  return (
    <div className="App">
      <header className="App-header">
	  <DatasetList />
	  <AddDatasetComponent />
	  <DeleteDatasetComponent />

      </header>
    </div>

  );
}

export default App;
