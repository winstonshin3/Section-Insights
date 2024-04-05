
import './App.css';
import DatasetList from './DatasetList';
import AddDatasetComponent from './AddDatasetComponent';
import DeleteDatasetComponent from './DeleteDatasetComponent';
import FirstInsight from "./components/FirstInsight";

function App() {
  return (
    <div className="App">
      <header className="App-header">
	  <DatasetList />
	  <AddDatasetComponent />
	  <DeleteDatasetComponent />
		  <FirstInsight/>
      </header>
    </div>

  );
}

export default App;
