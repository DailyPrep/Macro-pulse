import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MacroIntelligence = () => {
  const [fredData, setFredData] = useState(null);
  const [eiaData, setEiaData] = useState(null);
  const [pipelineData, setPipelineData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // FRED Macro Data - Placeholder (FRED removed)
        setFredData(null);

        // EIA Energy Data
        const eiaRes = await axios.get('/api/eia').catch(() => null);
        if (eiaRes?.data?.data) {
          setEiaData(eiaRes.data.data);
        }

        // Strategic Pipeline
        const pipelineRes = await axios.get('/api/strategic-pipeline').catch(() => null);
        if (pipelineRes?.data?.data?.strategicTickers) {
          setPipelineData(pipelineRes.data.data.strategicTickers);
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-tactical-black text-fluorescent-green p-4 overflow-auto">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left: FRED Macro Data */}
        <div className="space-y-4">
          <div className="bg-black border-2 border-cyan-accent rounded p-4">
            <h2 className="text-xl font-mono font-bold text-cyan-accent mb-4 border-b border-cyan-accent pb-2">
              MACRO ENGINE (FRED)
            </h2>
            
            {fredData ? (
              <div className="space-y-4">
                {/* Net Liquidity */}
                {fredData.netLiquidity && (
                  <div className="bg-gray-900 rounded p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Net Liquidity</div>
                    <div className="font-mono font-bold text-fluorescent-green text-lg">
                      ${(fredData.netLiquidity / 1000000000000).toFixed(2)}T
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      WALCL - WTREGEN - RRPONTSYD
                    </div>
                  </div>
                )}

                {/* DXY */}
                {fredData.DXY && (
                  <div className="bg-gray-900 rounded p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Dollar Index (DXY)</div>
                    <div className="font-mono font-bold text-fluorescent-green text-lg">
                      {fredData.DXY.toFixed(2)}
                    </div>
                    <div className={`text-xs mt-1 ${fredData.DXYChange >= 0 ? 'text-fluorescent-green' : 'text-emergency-red'}`}>
                      {fredData.DXYChange >= 0 ? '+' : ''}{fredData.DXYChange?.toFixed(2) || '0.00'}%
                    </div>
                  </div>
                )}

                {/* US10Y */}
                {fredData.US10Y && (
                  <div className="bg-gray-900 rounded p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">10-Year Treasury</div>
                    <div className="font-mono font-bold text-fluorescent-green text-lg">
                      {fredData.US10Y.toFixed(2)}%
                    </div>
                    <div className={`text-xs mt-1 ${fredData.US10YChange >= 0 ? 'text-emergency-red' : 'text-fluorescent-green'}`}>
                      {fredData.US10YChange >= 0 ? '+' : ''}{fredData.US10YChange?.toFixed(2) || '0.00'}%
                    </div>
                  </div>
                )}

                {/* Financial Stress Index */}
                {fredData.STLFSI4 && (
                  <div className="bg-gray-900 rounded p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Financial Stress Index</div>
                    <div className={`font-mono font-bold text-lg ${
                      fredData.STLFSI4 > 0 ? 'text-emergency-red' : 'text-fluorescent-green'
                    }`}>
                      {fredData.STLFSI4.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {fredData.STLFSI4 > 0 ? 'STRESS' : 'NORMAL'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                FRED data unavailable (FRED removed)
              </div>
            )}
          </div>

          {/* DXY Chart */}
          <div className="bg-black border-2 border-cyan-accent rounded" style={{ height: '300px' }}>
            <iframe
              src="https://www.tradingview.com/widgetembed/?symbol=FRED:DTWEXBGS&interval=D&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=false&save_image=false"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="DXY Chart"
            />
          </div>
        </div>

        {/* Right: EIA Energy + Strategic Pipeline */}
        <div className="space-y-4">
          {/* EIA Energy Data */}
          <div className="bg-black border-2 border-safety-orange rounded p-4">
            <h2 className="text-xl font-mono font-bold text-safety-orange mb-4 border-b border-safety-orange pb-2">
              ENERGY FLOOR (EIA)
            </h2>
            
            {eiaData ? (
              <div className="space-y-4">
                {eiaData.crudeOil && (
                  <div className="bg-gray-900 rounded p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Crude Oil Stocks</div>
                    <div className="font-mono font-bold text-safety-orange text-lg">
                      {eiaData.crudeOil.value?.toLocaleString() || 'N/A'} bbl
                    </div>
                    <div className={`text-xs mt-1 ${
                      eiaData.crudeOil.change >= 0 ? 'text-emergency-red' : 'text-fluorescent-green'
                    }`}>
                      {eiaData.crudeOil.change >= 0 ? 'BUILD' : 'DRAW'}: {Math.abs(eiaData.crudeOil.change || 0).toLocaleString()} bbl
                    </div>
                  </div>
                )}

                {eiaData.naturalGas && (
                  <div className="bg-gray-900 rounded p-3 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Natural Gas Storage</div>
                    <div className="font-mono font-bold text-safety-orange text-lg">
                      {eiaData.naturalGas.value?.toLocaleString() || 'N/A'} Bcf
                    </div>
                    <div className={`text-xs mt-1 ${
                      eiaData.naturalGas.change >= 0 ? 'text-emergency-red' : 'text-fluorescent-green'
                    }`}>
                      {eiaData.naturalGas.change >= 0 ? 'BUILD' : 'DRAW'}: {Math.abs(eiaData.naturalGas.change || 0).toLocaleString()} Bcf
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Loading EIA energy data...
              </div>
            )}
          </div>

          {/* WTI Crude Chart */}
          <div className="bg-black border-2 border-safety-orange rounded" style={{ height: '300px' }}>
            <iframe
              src="https://www.tradingview.com/widgetembed/?symbol=NYMEX:CL1!&interval=D&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=false&hide_top_toolbar=true&hide_legend=false&save_image=false"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="WTI Crude Chart"
            />
          </div>

          {/* Strategic Pipeline Summary */}
          <div className="bg-black border-2 border-fluorescent-green rounded p-4">
            <h2 className="text-xl font-mono font-bold text-fluorescent-green mb-4 border-b border-fluorescent-green pb-2">
              STRATEGIC PIPELINE
            </h2>
            <div className="space-y-2">
              {pipelineData.length > 0 ? (
                pipelineData.map((ticker, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-900 rounded border border-gray-700">
                    <span className="font-mono font-bold text-fluorescent-green">{ticker.symbol}</span>
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
                <div className="text-center text-gray-500 py-4 text-sm">
                  Loading pipeline data...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroIntelligence;

