import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CriticalFeeds = () => {
  const [pipelineData, setPipelineData] = useState([]);
  const [whaleData, setWhaleData] = useState([]);
  const [marketContext, setMarketContext] = useState(null);

  // Fetch critical data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Strategic Pipeline (ES1!, US10Y, DXY)
        const pipelineRes = await axios.get('/api/strategic-pipeline').catch(() => null);
        if (pipelineRes?.data?.data?.strategicTickers) {
          setPipelineData(pipelineRes.data.data.strategicTickers);
        }

        // Whale Radar (Large block trades)
        const whaleRes = await axios.get('/api/whale-radar').catch(() => null);
        if (whaleRes?.data?.data) {
          setWhaleData(whaleRes.data.data.slice(0, 15));
        }

        // Global Market Context
        const contextRes = await axios.get('/api/global-market-context').catch(() => null);
        if (contextRes?.data?.data) {
          setMarketContext(contextRes.data.data);
        }
      } catch (error) {
        // Silent fail - widgets will still work
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-tactical-black text-fluorescent-green p-4 overflow-auto">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left Column: Strategic Pipeline + ES1! Chart */}
        <div className="flex flex-col gap-4">
          {/* Strategic Pipeline */}
          <div className="bg-black border-2 border-fluorescent-green rounded p-3">
            <div className="flex items-center justify-between mb-3 border-b border-fluorescent-green pb-2">
              <h2 className="text-lg font-mono font-bold text-fluorescent-green">STRATEGIC PIPELINE</h2>
              <span className="text-xs text-safety-orange">LIVE</span>
            </div>
            <div className="space-y-2">
              {pipelineData.length > 0 ? (
                pipelineData.map((ticker, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-900 rounded border border-gray-700 hover:border-fluorescent-green transition">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-fluorescent-green">{ticker.symbol}</span>
                      <span className="text-xs text-gray-400">{ticker.name}</span>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${ticker.change >= 0 ? 'text-fluorescent-green' : 'text-emergency-red'}`}>
                        {ticker.price?.toFixed(2) || 'N/A'}
                      </div>
                      <div className={`text-xs ${ticker.change >= 0 ? 'text-fluorescent-green' : 'text-emergency-red'}`}>
                        {ticker.change >= 0 ? '+' : ''}{ticker.change?.toFixed(2) || '0.00'}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <div className="text-sm">Loading Strategic Pipeline...</div>
                  <div className="text-xs mt-2">ES1! • US10Y • DXY</div>
                </div>
              )}
            </div>
          </div>

          {/* ES1! Chart */}
          <div className="bg-black border-2 border-fluorescent-green rounded flex-1 min-h-[400px]">
            <div className="h-full">
              <iframe
                src="https://www.tradingview.com/widgetembed/?symbol=CME_MINI:ES1!&interval=5&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=false&save_image=false&container_id=tradingview_es1"
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="ES1! Chart"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Whale Radar + Market Context */}
        <div className="flex flex-col gap-4">
          {/* Whale Radar */}
          <div className="bg-black border-2 border-emergency-red rounded p-3 flex-1 min-h-[300px]">
            <div className="flex items-center justify-between mb-3 border-b border-emergency-red pb-2">
              <h2 className="text-lg font-mono font-bold text-emergency-red">WHALE RADAR</h2>
              <span className="text-xs text-safety-orange">BLOCK TRADES</span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {whaleData.length > 0 ? (
                whaleData.map((whale, idx) => (
                  <div key={idx} className="p-2 bg-gray-900 rounded border border-gray-700 hover:border-emergency-red transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-mono font-bold text-emergency-red">{whale.symbol || 'ES1!'}</div>
                        <div className="text-xs text-gray-400 mt-1">{whale.description || 'Large block trade detected'}</div>
                        <div className="text-xs text-safety-orange mt-1">
                          {whale.timestamp ? (() => {
                            const nyTime = new Date(new Date(whale.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }));
                            let hours = nyTime.getHours();
                            const minutes = nyTime.getMinutes().toString().padStart(2, '0');
                            const seconds = nyTime.getSeconds().toString().padStart(2, '0');
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            hours = hours % 12;
                            hours = hours ? hours : 12;
                            return `${hours}:${minutes}:${seconds} ${ampm} ET`;
                          })() : 'Just now'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-fluorescent-green">
                          ${whale.volume ? (whale.volume / 1000000).toFixed(2) + 'M' : 'N/A'}
                        </div>
                        <div className={`text-xs ${whale.priceChange >= 0 ? 'text-fluorescent-green' : 'text-emergency-red'}`}>
                          {whale.priceChange >= 0 ? '+' : ''}{whale.priceChange?.toFixed(2) || '0.00'}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <div className="text-sm">Monitoring for large block trades...</div>
                  <div className="text-xs mt-2">Threshold: $500K+</div>
                </div>
              )}
            </div>
          </div>

          {/* Market Context */}
          <div className="bg-black border-2 border-cyan-accent rounded p-3">
            <div className="flex items-center justify-between mb-3 border-b border-cyan-accent pb-2">
              <h2 className="text-lg font-mono font-bold text-cyan-accent">MARKET CONTEXT</h2>
              <span className="text-xs text-safety-orange">24/7</span>
            </div>
            {marketContext ? (
              <div className="space-y-2">
                {marketContext.regions?.map((region, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-900 rounded border border-gray-700">
                    <div>
                      <span className="font-mono font-bold text-cyan-accent">{region.name}</span>
                      <span className={`ml-2 text-xs ${region.status === 'OPEN' ? 'text-fluorescent-green' : 'text-gray-500'}`}>
                        {region.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {region.sessions?.map((s, i) => (
                        <span key={i} className="ml-2">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4 text-sm">
                Loading market context...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriticalFeeds;

