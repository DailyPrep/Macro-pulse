import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LiveTradingDeals = () => {
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        // Fetch whale radar data (large trades)
        const response = await axios.get('/api/whale-radar');
        if (response.data?.data && Array.isArray(response.data.data)) {
          // Format as live deals
          const formattedDeals = response.data.data.slice(0, 20).map(trade => ({
            id: `${trade.symbol}-${trade.timestamp}`,
            symbol: trade.symbol || 'ES1!',
            price: trade.price || 0,
            volume: trade.volume || 0,
            value: trade.tradeValue || 0,
            type: trade.type || 'Trade',
            timestamp: trade.timestamp,
            isBlockPrint: trade.isBlockPrint || false
          }));
          setDeals(formattedDeals);
        }
      } catch (error) {
        console.error('Error fetching live deals:', error);
      }
    };

    fetchDeals();
    const interval = setInterval(fetchDeals, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-tactical-black">
      <div className="p-1.5 border-b border-fluorescent-green">
        <h3 className="text-xs font-mono font-semibold text-safety-orange uppercase">
          LIVE TRADING DEALS
        </h3>
      </div>
      <div className="p-1 space-y-0.5">
        {deals.length > 0 ? (
          deals.map((deal) => (
            <div
              key={deal.id}
              className={`
                p-1.5 border-l-2 transition-all
                ${deal.type === 'Buy' 
                  ? 'border-fluorescent-green bg-[rgba(0,255,0,0.05)]' 
                  : deal.type === 'Sell'
                  ? 'border-emergency-red bg-[rgba(255,0,0,0.05)]'
                  : 'border-cyan-accent bg-[rgba(0,242,255,0.05)]'
                }
                ${deal.isBlockPrint ? 'border-l-4 border-safety-orange' : ''}
              `}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-fluorescent-green">
                    {deal.symbol}
                  </span>
                  <span className={`text-xs font-mono ${
                    deal.type === 'Buy' ? 'text-fluorescent-green' : 'text-emergency-red'
                  }`}>
                    {deal.type}
                  </span>
                  {deal.isBlockPrint && (
                    <span className="text-xs font-mono text-safety-orange bg-[rgba(255,102,0,0.2)] px-1">
                      BLOCK
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-cyan-accent">
                  {(() => {
                    const nyTime = new Date(new Date(deal.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }));
                    let hours = nyTime.getHours();
                    const minutes = nyTime.getMinutes().toString().padStart(2, '0');
                    const seconds = nyTime.getSeconds().toString().padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    return `${hours}:${minutes}:${seconds} ${ampm} ET`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Price: ${deal.price.toFixed(2)}</span>
                <span className="text-gray-400">Vol: {deal.volume.toLocaleString()}</span>
                <span className="text-fluorescent-green font-semibold">
                  ${(deal.value / 1000000).toFixed(2)}M
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-xs font-mono text-gray-500">
            Waiting for live deals...
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTradingDeals;

