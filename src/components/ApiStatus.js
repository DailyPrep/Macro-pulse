import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ApiStatus = () => {
  const [status, setStatus] = useState({});

  useEffect(() => {
    const checkApis = async () => {
      const apis = [
        { name: 'Whale Radar', endpoint: '/api/whale-radar' },
        { name: 'Strategic Pipeline', endpoint: '/api/strategic-pipeline' },
        { name: 'Global Market Context', endpoint: '/api/global-market-context' },
        { name: 'EIA', endpoint: '/api/eia' },
        { name: 'FinancialJuice', endpoint: '/api/financialjuice/news' },
        { name: 'BTC Data', endpoint: '/api/crypto/btc' }
      ];

      const results = {};
      for (const api of apis) {
        try {
          const res = await axios.get(api.endpoint, { timeout: 5000 });
          results[api.name] = {
            status: res.data?.status || 'unknown',
            hasData: res.data?.data && (
              Array.isArray(res.data.data) ? res.data.data.length > 0 :
              typeof res.data.data === 'object' ? Object.keys(res.data.data).length > 0 :
              res.data.data !== null && res.data.data !== undefined
            ),
            error: res.data?.message || null
          };
        } catch (error) {
          results[api.name] = {
            status: 'error',
            hasData: false,
            error: error.message
          };
        }
      }
      setStatus(results);
    };

    checkApis();
    const interval = setInterval(checkApis, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border border-fluorescent-green bg-tactical-black p-2">
      <h3 className="text-xs font-mono font-semibold text-safety-orange uppercase mb-2">
        API Status
      </h3>
      <div className="space-y-1 text-xs font-mono">
        {Object.entries(status).map(([name, info]) => (
          <div key={name} className="flex justify-between items-center">
            <span className="text-gray-400">{name}:</span>
            <div className="flex items-center gap-2">
              <span className={`${
                info.status === 'success' && info.hasData
                  ? 'text-fluorescent-green'
                  : info.status === 'success' && !info.hasData
                  ? 'text-yellow-500'
                  : 'text-emergency-red'
              }`}>
                {info.status === 'success' && info.hasData ? '✅ DATA' :
                 info.status === 'success' && !info.hasData ? '⚠️ NO DATA' :
                 '❌ ERROR'}
              </span>
              {info.error && (
                <span className="text-gray-500 text-[10px]">{info.error.substring(0, 20)}...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiStatus;

