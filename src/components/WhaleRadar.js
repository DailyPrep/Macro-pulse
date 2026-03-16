import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WhaleRadar = () => {
  const [whaleData, setWhaleData] = useState([]);
  const [filter, setFilter] = useState('all'); // all, es1, large

  useEffect(() => {
    const fetchWhaleData = async () => {
      try {
        const res = await axios.get('/api/whale-radar').catch(() => null);
        if (res?.data?.data) {
          setWhaleData(res.data.data);
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchWhaleData();
    const interval = setInterval(fetchWhaleData, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const filteredData = whaleData.filter(whale => {
    if (filter === 'es1') return whale.symbol?.includes('ES1') || whale.symbol?.includes('ES');
    if (filter === 'large') return whale.volume >= 1000000;
    return true;
  });

  return (
    <div className="h-full w-full bg-tactical-black text-fluorescent-green p-4 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-black border-2 border-emergency-red rounded p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-mono font-bold text-emergency-red">WHALE RADAR</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded border font-mono text-sm transition ${
                  filter === 'all' 
                    ? 'bg-emergency-red text-black border-emergency-red' 
                    : 'bg-gray-900 text-fluorescent-green border-gray-700 hover:border-emergency-red'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setFilter('es1')}
                className={`px-4 py-2 rounded border font-mono text-sm transition ${
                  filter === 'es1' 
                    ? 'bg-emergency-red text-black border-emergency-red' 
                    : 'bg-gray-900 text-fluorescent-green border-gray-700 hover:border-emergency-red'
                }`}
              >
                ES1!
              </button>
              <button
                onClick={() => setFilter('large')}
                className={`px-4 py-2 rounded border font-mono text-sm transition ${
                  filter === 'large' 
                    ? 'bg-emergency-red text-black border-emergency-red' 
                    : 'bg-gray-900 text-fluorescent-green border-gray-700 hover:border-emergency-red'
                }`}
              >
                $1M+
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm font-mono">
            <div className="text-center">
              <div className="text-gray-400">Total Trades</div>
              <div className="text-fluorescent-green text-xl font-bold">{filteredData.length}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Total Volume</div>
              <div className="text-fluorescent-green text-xl font-bold">
                ${(filteredData.reduce((sum, w) => sum + (w.volume || 0), 0) / 1000000).toFixed(2)}M
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Avg Size</div>
              <div className="text-fluorescent-green text-xl font-bold">
                ${(filteredData.length > 0 ? filteredData.reduce((sum, w) => sum + (w.volume || 0), 0) / filteredData.length / 1000 : 0).toFixed(0)}K
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Threshold</div>
              <div className="text-emergency-red text-xl font-bold">$500K+</div>
            </div>
          </div>
        </div>

        {/* Whale Trades List */}
        <div className="space-y-2">
          {filteredData.length > 0 ? (
            filteredData.map((whale, idx) => (
              <div
                key={idx}
                className="bg-black border-2 border-gray-700 rounded p-4 hover:border-emergency-red transition"
              >
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div>
                    <div className="font-mono font-bold text-emergency-red text-lg">{whale.symbol || 'ES1!'}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {whale.timestamp ? (() => {
                        const nyTime = new Date(new Date(whale.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }));
                        let hours = nyTime.getHours();
                        const minutes = nyTime.getMinutes().toString().padStart(2, '0');
                        const seconds = nyTime.getSeconds().toString().padStart(2, '0');
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        const month = monthNames[nyTime.getMonth()];
                        const day = nyTime.getDate();
                        return `${hours}:${minutes}:${seconds} ${ampm} ${month} ${day} ET`;
                      })() : 'Just now'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Volume</div>
                    <div className="font-mono font-bold text-fluorescent-green">
                      ${whale.volume ? (whale.volume / 1000000).toFixed(2) + 'M' : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Price</div>
                    <div className="font-mono font-bold text-fluorescent-green">
                      ${whale.price?.toFixed(2) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Change</div>
                    <div className={`font-mono font-bold ${whale.priceChange >= 0 ? 'text-fluorescent-green' : 'text-emergency-red'}`}>
                      {whale.priceChange >= 0 ? '+' : ''}{whale.priceChange?.toFixed(2) || '0.00'}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Type</div>
                    <div className="font-mono text-safety-orange">
                      {whale.type || 'BLOCK'}
                    </div>
                  </div>
                </div>
                {whale.description && (
                  <div className="mt-2 text-xs text-gray-400 border-t border-gray-700 pt-2">
                    {whale.description}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-black border-2 border-gray-700 rounded p-8 text-center">
              <div className="text-gray-500 text-lg mb-2">No whale trades detected</div>
              <div className="text-xs text-gray-600">Monitoring for large block trades ($500K+)...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhaleRadar;

