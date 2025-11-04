function SummaryStats({ symbol, data }) {
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate summary statistics
  const prices = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  
  const currentPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;
  
  const highPrice = Math.max(...prices);
  const lowPrice = Math.min(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const totalVolume = volumes.reduce((a, b) => a + b, 0);
  const avgVolume = totalVolume / volumes.length;
  
  // Calculate volatility (standard deviation)
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
  const volatility = Math.sqrt(variance);
  const volatilityPercent = (volatility / avgPrice) * 100;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ color: '#8b7ab8', marginBottom: '1rem' }}>
        Summary Statistics - {symbol?.toUpperCase()}
      </h3>
      
      <div className="summary-stats">
        <div className="stats-card">
          <h4>Current Price</h4>
          <div className="value">{currentPrice?.toFixed(6)}</div>
          <small style={{ 
            color: priceChange >= 0 ? '#26a69a' : '#ef5350',
            fontWeight: 'bold'
          }}>
            {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(6)} 
            ({priceChangePercent.toFixed(2)}%)
          </small>
        </div>

        <div className="stats-card">
          <h4>24h High</h4>
          <div className="value" style={{ color: '#26a69a' }}>
            {highPrice?.toFixed(6)}
          </div>
          <small style={{ color: '#aaa' }}>
            +{((highPrice - avgPrice) / avgPrice * 100).toFixed(2)}% from avg
          </small>
        </div>

        <div className="stats-card">
          <h4>24h Low</h4>
          <div className="value" style={{ color: '#ef5350' }}>
            {lowPrice?.toFixed(6)}
          </div>
          <small style={{ color: '#aaa' }}>
            {((lowPrice - avgPrice) / avgPrice * 100).toFixed(2)}% from avg
          </small>
        </div>

        <div className="stats-card">
          <h4>Average Price</h4>
          <div className="value">{avgPrice?.toFixed(6)}</div>
          <small style={{ color: '#aaa' }}>
            Over {data.length} periods
          </small>
        </div>

        <div className="stats-card">
          <h4>Volatility (σ)</h4>
          <div className="value" style={{ color: '#ffa726' }}>
            {volatility?.toFixed(6)}
          </div>
          <small style={{ color: '#aaa' }}>
            {volatilityPercent.toFixed(2)}% of avg price
          </small>
        </div>

        <div className="stats-card">
          <h4>Total Volume</h4>
          <div className="value">{totalVolume?.toFixed(2)}</div>
          <small style={{ color: '#aaa' }}>
            Avg: {avgVolume?.toFixed(2)} per period
          </small>
        </div>

        <div className="stats-card">
          <h4>Price Range</h4>
          <div className="value">{(highPrice - lowPrice)?.toFixed(6)}</div>
          <small style={{ color: '#aaa' }}>
            {((highPrice - lowPrice) / avgPrice * 100).toFixed(2)}% of avg
          </small>
        </div>

        <div className="stats-card">
          <h4>Data Points</h4>
          <div className="value">{data.length}</div>
          <small style={{ color: '#aaa' }}>
            Observations
          </small>
        </div>
      </div>
    </div>
  );
}

export default SummaryStats;
