import { useState, useEffect, useCallback } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import DataIngestion from './components/DataIngestion';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [symbols, setSymbols] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const fetchSymbols = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/symbols`);
      setSymbols(response.data.symbols || []);
    } catch (error) {
      console.error('Error fetching symbols:', error);
    }
  }, []);

  useEffect(() => {
    fetchSymbols();
    const interval = setInterval(fetchSymbols, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchSymbols]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Binance Analytics Dashboard</h1>
        <nav className="tabs">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''} 
            onClick={() => setActiveTab('dashboard')}
          >
            Analytics Dashboard
          </button>
          <button 
            className={activeTab === 'ingestion' ? 'active' : ''} 
            onClick={() => setActiveTab('ingestion')}
          >
            Data Ingestion
          </button>
        </nav>
      </header>
      
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <Dashboard symbols={symbols} apiBase={API_BASE} />
        )}
        {activeTab === 'ingestion' && (
          <DataIngestion apiBase={API_BASE} onSymbolsUpdate={fetchSymbols} />
        )}
      </main>
    </div>
  );
}

export default App;
