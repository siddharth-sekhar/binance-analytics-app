import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PriceChart from './PriceChart';
import PairAnalytics from './PairAnalytics';
import SummaryStats from './SummaryStats';
import ControlPanel from './ControlPanel';
import CorrelationHeatmap from './CorrelationHeatmap';

function Dashboard({ symbols, apiBase }) {
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [timeframe, setTimeframe] = useState('1s');
  const [rollWindow, setRollWindow] = useState(60);
  const [minVolume, setMinVolume] = useState(0);
  const [activeProduct, setActiveProduct] = useState(0);
  const [priceData, setPriceData] = useState({});
  const [loading, setLoading] = useState(false);

  // Auto-select first two symbols if available
  useEffect(() => {
    if (symbols.length >= 2 && selectedSymbols.length === 0) {
      setSelectedSymbols([symbols[0], symbols[1]]);
    }
  }, [symbols, selectedSymbols.length]);

  const fetchPriceData = useCallback(async (symbol) => {
    try {
      const response = await axios.get(`${apiBase}/resampled/${symbol}`, {
        params: { timeframe }
      });
      return { symbol, data: response.data.data || [] };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return { symbol, data: [] };
    }
  }, [apiBase, timeframe]);

  const loadAllData = useCallback(async () => {
    if (selectedSymbols.length === 0) return;
    
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedSymbols.map(symbol => fetchPriceData(symbol))
      );
      
      const newData = {};
      results.forEach(({ symbol, data }) => {
        newData[symbol] = data;
      });
      setPriceData(newData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbols, fetchPriceData]);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [loadAllData]);

  const handleSymbolSelect = (symbol) => {
    if (selectedSymbols.includes(symbol)) {
      setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    } else {
      setSelectedSymbols([...selectedSymbols, symbol]);
    }
  };

  const handleRemoveSymbol = (symbol) => {
    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    if (activeProduct >= selectedSymbols.length - 1) {
      setActiveProduct(Math.max(0, selectedSymbols.length - 2));
    }
  };

  if (symbols.length === 0) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>No symbols available. Please ingest data first.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <ControlPanel
        symbols={symbols}
        selectedSymbols={selectedSymbols}
        onSymbolSelect={handleSymbolSelect}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        rollWindow={rollWindow}
        onRollWindowChange={setRollWindow}
        minVolume={minVolume}
        onMinVolumeChange={setMinVolume}
        onRefresh={loadAllData}
        loading={loading}
      />

      {selectedSymbols.length === 0 && (
        <div className="error">
          Please select at least one symbol from the control panel above.
        </div>
      )}

      {selectedSymbols.length > 0 && (
        <>
          {/* Product Tabs */}
          <div className="product-tabs">
            {selectedSymbols.map((symbol, idx) => (
              <div
                key={symbol}
                className={`product-tab ${activeProduct === idx ? 'active' : ''}`}
                onClick={() => setActiveProduct(idx)}
              >
                {symbol.toUpperCase()}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveSymbol(symbol);
                  }}
                  style={{
                    marginLeft: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    color: '#fff'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Active Product Dashboard */}
          {selectedSymbols[activeProduct] && (
            <>
              {/* Summary Statistics */}
              <SummaryStats 
                symbol={selectedSymbols[activeProduct]}
                data={priceData[selectedSymbols[activeProduct]]}
              />

              {/* Price Chart */}
              <PriceChart
                symbol={selectedSymbols[activeProduct]}
                data={priceData[selectedSymbols[activeProduct]]}
                timeframe={timeframe}
                apiBase={apiBase}
              />

              {/* Pair Analytics */}
              {selectedSymbols.length >= 2 && (
                <PairAnalytics
                  symbolX={selectedSymbols[activeProduct]}
                  symbolY={selectedSymbols[(activeProduct + 1) % selectedSymbols.length]}
                  apiBase={apiBase}
                  timeframe={timeframe}
                  rollWindow={rollWindow}
                  minVolume={minVolume}
                />
              )}

              {/* Correlation Heatmap */}
              {selectedSymbols.length >= 2 && (
                <CorrelationHeatmap
                  symbols={selectedSymbols}
                  apiBase={apiBase}
                  timeframe={timeframe}
                  minVolume={minVolume}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;
