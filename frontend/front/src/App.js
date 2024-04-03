
import './App.css';
import DatasetList from './DatasetList';
import AddDatasetComponent from './AddDatasetComponent';

function App() {
  return (
    <div className="App">
      <header className="App-header">
	  <DatasetList />
	  <AddDatasetComponent />

      </header>
    </div>

  );
}

export default App;
