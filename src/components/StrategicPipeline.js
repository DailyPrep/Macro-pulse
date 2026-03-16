import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

/**
 * Custom Hook: Momentum Tracker
 * Polls asset data every 5 seconds for active assets to sync with Bookmap feeds
 */
const useMomentumTracker = (activeAssets, setAssetData, assetData, onLargeOrderDetected) => {
  const prevMomentumRef = useRef({});
  const momentumVelocityRef = useRef({});
  
  useEffect(() => {
    if (activeAssets.length === 0) return;

    const fetchMomentumData = async () => {
      try {
        const [es1Res, goldRes, silverRes, btcRes] = await Promise.allSettled([
          axios.get('/api/strategic-pipeline').catch(() => null),
          axios.get('/api/commodities/gold').catch(() => null),
          axios.get('/api/commodities/silver').catch(() => null),
          axios.get('/api/crypto/btc').catch(() => null)
        ]);

        const now = Date.now();
        const newAssetData = { ...assetData };

        // ES1
        if (activeAssets.includes('ES1') && es1Res.status === 'fulfilled' && es1Res.value?.data?.data?.strategicTickers) {
          const es1 = es1Res.value.data.data.strategicTickers.find(t => t.symbol === 'ES1!' || t.symbol === '$ES');
          if (es1 && es1.price) {
            const prevPrice = newAssetData.ES1.price || es1.price;
            const prevCvd = newAssetData.ES1.cvd || 0;
            const prevMomentum = prevMomentumRef.current.ES1 || 0;
            
            const priceChange = es1.price - prevPrice;
            // Simulate order book pressure: larger price moves = larger volume dots in Bookmap
            const volume = es1.volume || Math.abs(priceChange) * 15;
            const cvdDelta = priceChange > 0 ? volume : -volume;
            const newCvd = prevCvd + cvdDelta;
            const momentum = Math.max(-100, Math.min(100, (newCvd / 2000) * 100));
            
            // Calculate momentum velocity (rate of change) - detects rapid shifts
            const momentumVelocity = Math.abs(momentum - prevMomentum);
            momentumVelocityRef.current.ES1 = momentumVelocity;
            
            // Detect large order flow (bubble/iceberg) - rapid momentum shift
            const LARGE_ORDER_THRESHOLD = 15; // Momentum change > 15 in 5 seconds = large order
            const isLargeOrder = momentumVelocity > LARGE_ORDER_THRESHOLD;
            
            newAssetData.ES1 = {
              ...newAssetData.ES1,
              price: es1.price,
              change: es1.change || 0,
              volume: volume,
              cvd: newCvd,
              momentum: momentum,
              lastUpdate: now,
              isStale: false,
              largeOrder: isLargeOrder,
              momentumVelocity: momentumVelocity
            };
            
            prevMomentumRef.current.ES1 = momentum;
            
            // Trigger alert if large order detected
            if (isLargeOrder && onLargeOrderDetected) {
              onLargeOrderDetected({
                asset: 'ES1',
                type: momentum > prevMomentum ? 'BUBBLE' : 'ICEBERG',
                momentum: momentum,
                velocity: momentumVelocity,
                timestamp: now
              });
            }
          }
        }

        // Gold
        if (activeAssets.includes('Gold') && goldRes.status === 'fulfilled' && goldRes.value?.data) {
          const goldData = goldRes.value.data.data;
          let goldPrice = 0;
          let goldChange = 0;
          
          if (Array.isArray(goldData) && goldData.length > 0) {
            goldPrice = goldData[goldData.length - 1]?.value || 0;
            if (goldData.length >= 2) {
              const current = goldData[goldData.length - 1]?.value || 0;
              const previous = goldData[goldData.length - 2]?.value || 0;
              goldChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
            }
          } else if (goldData && typeof goldData === 'object' && goldData.price) {
            goldPrice = goldData.price || 0;
            goldChange = goldData.change || 0;
          }
          
          if (goldPrice > 0) {
            const prevPrice = newAssetData.Gold.price || goldPrice;
            const prevCvd = newAssetData.Gold.cvd || 0;
            const prevMomentum = prevMomentumRef.current.Gold || 0;
            
            const priceChange = goldPrice - prevPrice;
            const volume = Math.abs(goldChange) * 1200;
            const cvdDelta = goldChange > 0 ? volume : -volume;
            const newCvd = prevCvd + cvdDelta;
            const momentum = Math.max(-100, Math.min(100, (newCvd / 200000) * 100));
            
            const momentumVelocity = Math.abs(momentum - prevMomentum);
            momentumVelocityRef.current.Gold = momentumVelocity;
            const isLargeOrder = momentumVelocity > 12;
            
            newAssetData.Gold = {
              ...newAssetData.Gold,
              price: goldPrice,
              change: goldChange,
              volume: volume,
              cvd: newCvd,
              momentum: momentum,
              lastUpdate: now,
              isStale: false,
              largeOrder: isLargeOrder,
              momentumVelocity: momentumVelocity
            };
            
            prevMomentumRef.current.Gold = momentum;
            
            if (isLargeOrder && onLargeOrderDetected) {
              onLargeOrderDetected({
                asset: 'Gold',
                type: momentum > prevMomentum ? 'BUBBLE' : 'ICEBERG',
                momentum: momentum,
                velocity: momentumVelocity,
                timestamp: now
              });
            }
          }
        }

        // Silver
        if (activeAssets.includes('Silver') && silverRes.status === 'fulfilled' && silverRes.value?.data?.data) {
          const silver = silverRes.value.data.data;
          if (silver.price) {
            const prevPrice = newAssetData.Silver.price || silver.price;
            const prevCvd = newAssetData.Silver.cvd || 0;
            const prevMomentum = prevMomentumRef.current.Silver || 0;
            
            const priceChange = silver.price - prevPrice;
            const volume = Math.abs(silver.change || 0) * 600;
            const cvdDelta = (silver.change || 0) > 0 ? volume : -volume;
            const newCvd = prevCvd + cvdDelta;
            const momentum = Math.max(-100, Math.min(100, (newCvd / 100000) * 100));
            
            const momentumVelocity = Math.abs(momentum - prevMomentum);
            momentumVelocityRef.current.Silver = momentumVelocity;
            const isLargeOrder = momentumVelocity > 10;
            
            newAssetData.Silver = {
              ...newAssetData.Silver,
              price: silver.price,
              change: silver.change || 0,
              volume: volume,
              cvd: newCvd,
              momentum: momentum,
              lastUpdate: now,
              isStale: false,
              largeOrder: isLargeOrder,
              momentumVelocity: momentumVelocity
            };
            
            prevMomentumRef.current.Silver = momentum;
            
            if (isLargeOrder && onLargeOrderDetected) {
              onLargeOrderDetected({
                asset: 'Silver',
                type: momentum > prevMomentum ? 'BUBBLE' : 'ICEBERG',
                momentum: momentum,
                velocity: momentumVelocity,
                timestamp: now
              });
            }
          }
        }

        // Bitcoin
        if (activeAssets.includes('Bitcoin') && btcRes.status === 'fulfilled' && btcRes.value?.data?.data) {
          const btcData = btcRes.value.data.data;
          let btcPrice = 0;
          let btcChange = 0;
          
          if (Array.isArray(btcData) && btcData.length > 0) {
            const latest = btcData[btcData.length - 1];
            btcPrice = latest.close || latest.value || 0;
            if (btcData.length >= 2) {
              const current = btcData[btcData.length - 1]?.close || btcData[btcData.length - 1]?.value || 0;
              const previous = btcData[btcData.length - 2]?.close || btcData[btcData.length - 2]?.value || 0;
              btcChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
            }
          } else if (btcData && typeof btcData === 'object' && btcData.price) {
            btcPrice = btcData.price || 0;
            btcChange = btcData.change || 0;
          }
          
          if (btcPrice > 0) {
            const prevPrice = newAssetData.Bitcoin.price || btcPrice;
            const prevCvd = newAssetData.Bitcoin.cvd || 0;
            const prevMomentum = prevMomentumRef.current.Bitcoin || 0;
            
            const priceChange = btcPrice - prevPrice;
            const volume = Math.abs(btcChange) * 12000;
            const cvdDelta = btcChange > 0 ? volume : -volume;
            const newCvd = prevCvd + cvdDelta;
            const momentum = Math.max(-100, Math.min(100, (newCvd / 2000000) * 100));
            
            const momentumVelocity = Math.abs(momentum - prevMomentum);
            momentumVelocityRef.current.Bitcoin = momentumVelocity;
            const isLargeOrder = momentumVelocity > 18;
            
            newAssetData.Bitcoin = {
              ...newAssetData.Bitcoin,
              price: btcPrice,
              change: btcChange,
              volume: volume,
              cvd: newCvd,
              momentum: momentum,
              lastUpdate: now,
              isStale: false,
              largeOrder: isLargeOrder,
              momentumVelocity: momentumVelocity
            };
            
            prevMomentumRef.current.Bitcoin = momentum;
            
            if (isLargeOrder && onLargeOrderDetected) {
              onLargeOrderDetected({
                asset: 'Bitcoin',
                type: momentum > prevMomentum ? 'BUBBLE' : 'ICEBERG',
                momentum: momentum,
                velocity: momentumVelocity,
                timestamp: now
              });
            }
          }
        }

        setAssetData(newAssetData);
      } catch (error) {
        console.error('Error in momentum tracker:', error);
      }
    };

    // Initial fetch
    fetchMomentumData();
    
    // Poll every 5 seconds to sync with Bookmap feeds (more responsive)
    const interval = setInterval(fetchMomentumData, 5000);
    return () => clearInterval(interval);
  }, [activeAssets, setAssetData, onLargeOrderDetected]);
};

/**
 * TAB 2: STRATEGIC PIPELINE - LIVE EXECUTION HUB
 * Left Column (35%): LIVE BOOKMAP STREAMS - 4 videos stacked vertically (16:9, scrollable)
 * Right Column (65%): STRATEGIC ANALYSIS HUB - Fixed, no scroll, reacts to left side
 */
const StrategicPipeline = () => {
  const [assetData, setAssetData] = useState({
    ES1: { price: 0, change: 0, volume: 0, cvd: 0, lastUpdate: null, isStale: false, largeOrder: false, momentum: 0 },
    Gold: { price: 0, change: 0, volume: 0, cvd: 0, lastUpdate: null, isStale: false, largeOrder: false, momentum: 0 },
    Silver: { price: 0, change: 0, volume: 0, cvd: 0, lastUpdate: null, isStale: false, largeOrder: false, momentum: 0 },
    Bitcoin: { price: 0, change: 0, volume: 0, cvd: 0, lastUpdate: null, isStale: false, largeOrder: false, momentum: 0 }
  });
  
  const [priceHistory, setPriceHistory] = useState({
    ES1: [],
    Gold: [],
    Silver: [],
    Bitcoin: []
  });
  
  const [correlationMatrix, setCorrelationMatrix] = useState({});
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [activeAssets, setActiveAssets] = useState([]); // Track which assets are "playing"
  const [syncStatus, setSyncStatus] = useState({}); // Track sync status for each asset
  
  // Track previous CVD values to detect spikes (bubbles/icebergs)
  const prevCvdRef = useRef({
    ES1: 0,
    Gold: 0,
    Silver: 0,
    Bitcoin: 0
  });

  // Handle large order detection callback
  const handleLargeOrderDetected = (alert) => {
    setActiveAlerts(prev => {
      // Check if alert already exists (prevent duplicates)
      const exists = prev.some(a => a.asset === alert.asset && Math.abs(a.timestamp - alert.timestamp) < 3000);
      if (exists) return prev;
      
      const newAlerts = [alert, ...prev].slice(0, 10);
      
      // Auto-remove after 8 seconds
      setTimeout(() => {
        setActiveAlerts(current => current.filter(a => a.timestamp !== alert.timestamp));
      }, 8000);
      
      return newAlerts;
    });
    
    // Update sync status to show active detection
    setSyncStatus(prev => ({
      ...prev,
      [alert.asset]: { active: true, timestamp: alert.timestamp }
    }));
    
    // Reset sync status after 3 seconds
    setTimeout(() => {
      setSyncStatus(current => ({
        ...current,
        [alert.asset]: { active: false, timestamp: current[alert.asset]?.timestamp }
      }));
    }, 3000);
  };

  // Whale Radar and Global Flow Delta Calculations (24/7 Global Scope)
  const [whaleRadarData, setWhaleRadarData] = useState([]);
  const [globalFlowData, setGlobalFlowData] = useState([]);
  const [deltaCalculations, setDeltaCalculations] = useState({
    liquidityClusters: 0,
    volumeDeltas: 0,
    netFlow: 0
  });

  useEffect(() => {
    const fetchWhaleRadarAndFlow = async () => {
      try {
        const [whaleRes, flowRes] = await Promise.allSettled([
          axios.get('/api/whale-radar').catch(() => null),
          axios.get('/api/global-flow').catch(() => null)
        ]);

        // Whale Radar (Liquidity Clusters)
        if (whaleRes.status === 'fulfilled' && whaleRes.value?.data?.data) {
          const whaleData = whaleRes.value.data.data;
          setWhaleRadarData(whaleData);
          
          // Calculate liquidity clusters (sum of large trades > $500K)
          const liquidityClusters = whaleData
            .filter(w => {
              const value = parseFloat(String(w.value || w.usdValue || '0').replace(/[^0-9.]/g, '')) || 0;
              return value >= 500000;
            })
            .reduce((sum, w) => {
              const value = parseFloat(String(w.value || w.usdValue || '0').replace(/[^0-9.]/g, '')) || 0;
              return sum + value;
            }, 0);
          
          setDeltaCalculations(prev => ({
            ...prev,
            liquidityClusters: liquidityClusters / 1000000 // Convert to millions
          }));
        }

        // Global Flow (Volume Deltas)
        if (flowRes.status === 'fulfilled' && flowRes.value?.data?.data) {
          const flowData = flowRes.value.data.data;
          setGlobalFlowData(flowData);
          
          // Calculate volume deltas (net volume change across regions)
          const volumeDeltas = flowData.reduce((sum, region) => {
            const volume = parseFloat(region.volume || 0);
            return sum + volume;
          }, 0);
          
          setDeltaCalculations(prev => ({
            ...prev,
            volumeDeltas: volumeDeltas / 1000000, // Convert to millions
            netFlow: (prev.liquidityClusters - volumeDeltas / 1000000) // Delta between Whale Radar and Global Flow
          }));
        }
      } catch (error) {
        console.error('Error fetching Whale Radar/Global Flow:', error);
      }
    };

    fetchWhaleRadarAndFlow();
    const interval = setInterval(fetchWhaleRadarAndFlow, 5000); // 5-second refresh (24/7 Global Scope)
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection for OCR data from market_reader.py
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    
    const connectWebSocket = () => {
      try {
        // Connect to local WebSocket server from market_reader.py
        ws = new WebSocket('ws://localhost:8000');
        
        ws.onopen = () => {
          console.log('✅ Connected to Market Reader WebSocket');
          setSyncStatus(prev => ({
            ...prev,
            'websocket': { connected: true, timestamp: Date.now() }
          }));
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'market_data' && message.data) {
              // Update asset data from OCR readings
              message.data.forEach(ocrData => {
                const assetMap = {
                  'ES1': 'ES1',
                  'Gold': 'Gold',
                  'Silver': 'Silver',
                  'BTC': 'Bitcoin'
                };
                
                const assetKey = assetMap[ocrData.asset];
                if (!assetKey) return;
                
                // Calculate momentum from CVD
                const prevCvd = assetData[assetKey]?.cvd || 0;
                const cvdDelta = ocrData.cvd - prevCvd;
                
                // Normalize momentum based on asset
                const momentumRanges = {
                  'ES1': 2000,
                  'Gold': 200000,
                  'Silver': 100000,
                  'Bitcoin': 2000000
                };
                
                const momentum = Math.max(-100, Math.min(100, (ocrData.cvd / momentumRanges[assetKey]) * 100));
                const prevMomentum = assetData[assetKey]?.momentum || 0;
                const momentumVelocity = Math.abs(momentum - prevMomentum);
                
                // Detect large orders
                const velocityThresholds = {
                  'ES1': 15,
                  'Gold': 12,
                  'Silver': 10,
                  'Bitcoin': 18
                };
                
                const isLargeOrder = momentumVelocity > (velocityThresholds[assetKey] || 15);
                
                // Update asset data
                setAssetData(prev => ({
                  ...prev,
                  [assetKey]: {
                    ...prev[assetKey],
                    price: ocrData.price,
                    cvd: ocrData.cvd,
                    momentum: momentum,
                    momentumVelocity: momentumVelocity,
                    largeOrder: isLargeOrder,
                    lastUpdate: Date.now(),
                    isStale: false,
                    source: 'ocr' // Mark as OCR data
                  }
                }));
                
                // Trigger alert if large order detected
                if (isLargeOrder && activeAssets.includes(assetKey)) {
                  handleLargeOrderDetected({
                    asset: assetKey,
                    type: momentum > prevMomentum ? 'BUBBLE' : 'ICEBERG',
                    momentum: momentum,
                    velocity: momentumVelocity,
                    timestamp: Date.now(),
                    source: 'ocr'
                  });
                }
                
                // Update price history for correlation calculations
                setPriceHistory(prev => ({
                  ...prev,
                  [assetKey]: [...(prev[assetKey] || []), { 
                    price: ocrData.price, 
                    timestamp: Date.now() 
                  }].slice(-30)
                }));
              });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setSyncStatus(prev => ({
            ...prev,
            'websocket': { connected: false, error: true }
          }));
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected, reconnecting in 5 seconds...');
          setSyncStatus(prev => ({
            ...prev,
            'websocket': { connected: false }
          }));
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
        
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };
    
    // Connect on mount
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []); // Run once on mount
  
  // Use momentum tracker hook with callback (fallback if WebSocket not available)
  useMomentumTracker(activeAssets, setAssetData, assetData, handleLargeOrderDetected);
  
  // Update sync status on each momentum update
  useEffect(() => {
    activeAssets.forEach(asset => {
      const data = assetData[asset];
      if (data.lastUpdate) {
        setSyncStatus(prev => ({
          ...prev,
          [asset]: { 
            active: prev[asset]?.active || false, 
            lastUpdate: data.lastUpdate,
            syncing: true
          }
        }));
      }
    });
  }, [assetData, activeAssets]);

  // Calculate Pearson correlation coefficient
  const calculateCorrelation = (x, y) => {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Calculate 30-day rolling correlations
  useEffect(() => {
    if (Object.values(priceHistory).some(arr => arr.length < 30)) return;
    
    const assets = ['ES1', 'Gold', 'Silver', 'Bitcoin'];
    const matrix = {};
    
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const asset1 = assets[i];
        const asset2 = assets[j];
        const key = `${asset1}-${asset2}`;
        
        const hist1 = priceHistory[asset1].slice(-30).map(p => p.price);
        const hist2 = priceHistory[asset2].slice(-30).map(p => p.price);
        
        const correlation = calculateCorrelation(hist1, hist2);
        matrix[key] = correlation;
      }
    }
    
    setCorrelationMatrix(matrix);
  }, [priceHistory]);

  // Visual sync indicator - shows when right side is reading left side
  const SyncIndicator = ({ asset, isActive }) => {
    const sync = syncStatus[asset];
    if (!isActive || !sync) return null;
    
    return (
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
        <div 
          className={`px-2 py-1 rounded border font-mono text-[8px] font-bold transition-all duration-300 ${
            sync.active 
              ? 'bg-[#00F2FF] text-black border-[#00F2FF] animate-pulse' 
              : 'bg-black text-[#00FF00] border-[#00FF00] opacity-70'
          }`}
          style={{
            boxShadow: sync.active ? '0 0 15px #00F2FF' : '0 0 5px #00FF00'
          }}
        >
          {sync.active ? '● SYNC: ORDER DETECTED' : '● SYNC: MONITORING'}
        </div>
      </div>
    );
  };

  // Toggle asset activation
  const toggleAsset = (asset) => {
    setActiveAssets(prev => {
      if (prev.includes(asset)) {
        return prev.filter(a => a !== asset);
      } else {
        return [...prev, asset];
      }
    });
  };

  // Calculate Safe-Haven Pulse for Strength Slider
  const goldBtcCorrelation = correlationMatrix['Gold-Bitcoin'] || 0;
  const getStrengthSliderValue = () => {
    if (goldBtcCorrelation > 0.5) return { position: 50, label: 'HEDGE', color: '#00FF00' };
    if (goldBtcCorrelation < -0.3) return { position: 90, label: 'RISK-ON', color: '#FF6600' };
    if (goldBtcCorrelation < 0.3) return { position: 10, label: 'RISK-OFF', color: '#FF0000' };
    return { position: 50, label: 'NEUTRAL', color: '#808080' };
  };

  const strengthSlider = getStrengthSliderValue();

  // Bookmap feed configurations
  const bookmapFeeds = [
    { id: 'Rnv2spnuRCQ', label: 'ES1', asset: 'ES1' },
    { id: 'XIyocP-yr9E', label: 'Gold', asset: 'Gold' },
    { id: 'QJnmKZK1_kA', label: 'Silver', asset: 'Silver' },
    { id: '69jd1dOq4C8', label: 'BTC', asset: 'Bitcoin' }
  ];

  // Whale Order Flow Sentinel Gauge (Semi-circular)
  const WhaleSentinelGauge = ({ asset, momentum, largeOrder, isActive }) => {
    const gaugeSize = 100;
    const centerX = gaugeSize / 2;
    const centerY = gaugeSize * 0.75;
    const radius = 40;
    
    // Map momentum (-100 to +100) to angle (0° to 180°)
    const angle = ((momentum + 100) / 200) * 180;
    const angleRad = (angle * Math.PI) / 180;
    
    const needleX = centerX + radius * Math.cos(Math.PI - angleRad);
    const needleY = centerY - radius * Math.sin(Math.PI - angleRad);
    
    const getZoneColor = (mom) => {
      if (mom > 50) return '#00FF00';
      if (mom > 10) return '#66FF66';
      if (mom > -10) return '#808080';
      if (mom > -50) return '#FF6666';
      return '#FF0000';
    };
    
    const zoneColor = getZoneColor(momentum);
    const opacity = isActive ? 1 : 0.3;
    const grayscale = isActive ? 'none' : 'grayscale(100%)';
    
    return (
      <div className="relative" style={{ width: gaugeSize, height: gaugeSize, filter: grayscale, opacity }}>
        <svg width={gaugeSize} height={gaugeSize} style={{ overflow: 'visible' }}>
          {/* Semi-circle background */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke={isActive ? "#0a0a0a" : "#1a1a1a"}
            strokeWidth="8"
          />
          
          {/* Red zone */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY - radius}`}
            fill="none"
            stroke={isActive ? "#FF0000" : "#666666"}
            strokeWidth="6"
            opacity={isActive ? 0.6 : 0.3}
          />
          
          {/* Green zone */}
          <path
            d={`M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke={isActive ? "#00FF00" : "#666666"}
            strokeWidth="6"
            opacity={isActive ? 0.6 : 0.3}
          />
          
          {/* Needle */}
          <line
            x1={centerX}
            y1={centerY}
            x2={needleX}
            y2={needleY}
            stroke={isActive ? zoneColor : "#666666"}
            strokeWidth="3"
            strokeLinecap="round"
            style={{ 
              filter: isActive ? `drop-shadow(0 0 3px ${zoneColor})` : 'none',
              transition: 'all 1s ease-in-out'
            }}
          />
          
          {/* Center dot */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r="4" 
            fill={isActive ? zoneColor : "#666666"}
            style={{ 
              filter: isActive ? `drop-shadow(0 0 5px ${zoneColor})` : 'none',
              transition: 'all 1s ease-in-out'
            }}
          />
        </svg>
        
        {/* Asset label */}
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className={`text-[9px] font-mono font-bold ${isActive ? 'text-[#00FF00]' : 'text-gray-600'}`}>
            {asset}
          </div>
        </div>
        
        {/* Pulse glow */}
        {isActive && largeOrder && (
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: '2px solid #00F2FF',
              animation: 'scan-pulse 1s ease-in-out infinite',
              boxShadow: '0 0 20px #00F2FF',
              transition: 'all 1s ease-in-out'
            }}
          />
        )}
      </div>
    );
  };

  // Momentum Gauge Component (Visual Meter with Heat Bar)
  const MomentumGauge = ({ asset, momentum, largeOrder, isActive }) => {
    const gaugeWidth = 200;
    const gaugeHeight = 30;
    const centerX = gaugeWidth / 2;
    
    // Normalize momentum to 0-100% for visual display
    const normalizedMomentum = (momentum + 100) / 2; // -100 to +100 becomes 0 to 100
    
    // Calculate fill positions (from center)
    const buyFill = normalizedMomentum > 50 ? ((normalizedMomentum - 50) / 50) * 100 : 0;
    const sellFill = normalizedMomentum < 50 ? ((50 - normalizedMomentum) / 50) * 100 : 0;
    
    // Color based on momentum
    const getMomentumColor = (mom) => {
      if (mom > 70) return '#00FF00'; // Aggressive buying
      if (mom > 40) return '#66FF66'; // Moderate buying
      if (mom > 30) return '#808080'; // Neutral
      if (mom > 10) return '#FF6666'; // Moderate selling
      return '#FF0000'; // Aggressive selling
    };
    
    const zoneColor = getMomentumColor(normalizedMomentum);
    const opacity = isActive ? 1 : 0.3;
    const grayscale = isActive ? 'none' : 'grayscale(100%)';
    
    return (
      <div className="relative" style={{ width: gaugeWidth, height: gaugeHeight, filter: grayscale, opacity }}>
        {/* Background bar */}
        <div className={`absolute inset-0 bg-black border-2 ${isActive ? 'border-[#00FF00]' : 'border-gray-600'} rounded`}>
          {/* Red zone (left) */}
          <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-red-900 opacity-30 rounded-l" />
          {/* Green zone (right) */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-green-900 opacity-30 rounded-r" />
          {/* Neutral zone (center) */}
          <div className="absolute left-1/3 top-0 bottom-0 w-1/3 bg-gray-800 opacity-50" />
        </div>
        
        {/* Heat bar fills from center */}
        {isActive && (
          <>
            {/* Red fill (left - selling) */}
            {sellFill > 0 && (
              <div
                className="absolute top-0 bottom-0 rounded-l transition-all duration-1000 ease-in-out"
                style={{
                  right: `${centerX}px`,
                  width: `${(sellFill / 100) * centerX}px`,
                  backgroundColor: '#FF0000',
                  opacity: 0.7,
                  boxShadow: '0 0 10px #FF0000'
                }}
              />
            )}
            
            {/* Green fill (right - buying) */}
            {buyFill > 0 && (
              <div
                className="absolute top-0 bottom-0 rounded-r transition-all duration-1000 ease-in-out"
                style={{
                  left: `${centerX}px`,
                  width: `${(buyFill / 100) * centerX}px`,
                  backgroundColor: '#00FF00',
                  opacity: 0.7,
                  boxShadow: '0 0 10px #00FF00'
                }}
              />
            )}
          </>
        )}
        
        {/* Center indicator */}
        <div
          className="absolute top-0 bottom-0 rounded transition-all duration-1000 ease-in-out"
          style={{
            left: `${normalizedMomentum}%`,
            width: '4px',
            backgroundColor: isActive ? zoneColor : '#666666',
            boxShadow: isActive ? `0 0 10px ${zoneColor}, 0 0 20px ${zoneColor}` : 'none',
            transform: 'translateX(-50%)',
            zIndex: 10
          }}
        />
        
        {/* Asset label */}
        <div className="absolute -top-5 left-0 flex items-center gap-2">
          <div className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#00FF00]' : 'text-gray-600'}`}>
            {asset}
          </div>
          {/* Live Sync blinking dot */}
          {isActive && (
            <div 
              className="w-2 h-2 rounded-full bg-[#00FF00]"
              style={{
                animation: 'blink 1s ease-in-out infinite',
                boxShadow: '0 0 5px #00FF00'
              }}
            />
          )}
        </div>
        
        {/* Pulse glow for large orders */}
        {isActive && largeOrder && (
          <div 
            className="absolute inset-0 rounded pointer-events-none"
            style={{
              border: '2px solid #00F2FF',
              animation: 'scan-pulse 1s ease-in-out infinite',
              boxShadow: '0 0 20px #00F2FF, inset 0 0 20px #00F2FF',
              transition: 'all 1s ease-in-out'
            }}
          />
        )}
      </div>
    );
  };

  // Strength Slider Component
  const StrengthSlider = ({ position, label, color }) => {
    return (
      <div className="w-full">
        <div className="text-[10px] font-mono font-bold text-[#00FF00] mb-2 text-center uppercase">
          Safe-Haven Strength
        </div>
        <div className="relative h-8 bg-black border-2 border-[#00FF00] rounded">
          {/* Zones */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-red-900 opacity-30" style={{ borderRight: '1px solid #FF0000' }}>
              <div className="text-[8px] text-red-500 text-center mt-1">RISK-OFF</div>
            </div>
            <div className="flex-1 bg-[#00FF00] opacity-30" style={{ borderRight: '1px solid #00FF00' }}>
              <div className="text-[8px] text-[#00FF00] text-center mt-1">HEDGE</div>
            </div>
            <div className="flex-1 bg-orange-900 opacity-30">
              <div className="text-[8px] text-orange-500 text-center mt-1">RISK-ON</div>
            </div>
          </div>
          
          {/* Slider indicator */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-[#00FF00] transition-all duration-1000 ease-in-out"
            style={{
              left: `${position}%`,
              boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`
            }}
          />
          
          {/* Label */}
          <div
            className="absolute top-0 left-0 right-0 text-center font-mono font-bold text-sm transition-all duration-1000 ease-in-out"
            style={{ color, textShadow: `0 0 10px ${color}` }}
          >
            {label}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-black text-[#00FF00] overflow-hidden" style={{ fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace" }}>
      <style>{`
        @keyframes scan-pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
            box-shadow: 0 0 20px #00F2FF, inset 0 0 20px #00F2FF;
          }
          50% { 
            opacity: 0.6; 
            transform: scale(1.05);
            box-shadow: 0 0 40px #00F2FF, inset 0 0 40px #00F2FF;
          }
        }
        @keyframes alert-scan {
          0% { 
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% { 
            transform: translateX(100%);
            opacity: 0;
          }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      
      <div className="h-full w-full bg-black">
        {/* EXPANDED STRATEGIC PIPELINE: Whale Radar & Global Flow Deltas (24/7 Global Scope) */}
        <div className="h-full w-full p-3">
          {/* Delta Calculations Header */}
          <div className="mb-3 border-b-2 border-[#00FF00] pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-[#00FF00] uppercase">STRATEGIC PIPELINE</span>
                <span className="text-[10px] text-gray-500">24/7 GLOBAL SCOPE</span>
              </div>
              {/* Whale Radar vs Global Flow Delta Display */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-gray-500 uppercase">Whale Radar</span>
                  <span className="text-[12px] font-bold text-cyan-accent">
                    ${deltaCalculations.liquidityClusters.toFixed(1)}M
                  </span>
                </div>
                <div className="text-[10px] text-gray-500">Δ</div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-gray-500 uppercase">Global Flow</span>
                  <span className="text-[12px] font-bold text-fluorescent-green">
                    ${deltaCalculations.volumeDeltas.toFixed(1)}M
                  </span>
                </div>
                <div className="text-[10px] text-gray-500">=</div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-gray-500 uppercase">Net Flow</span>
                  <span className={`text-[12px] font-bold ${
                    deltaCalculations.netFlow > 0 ? 'text-fluorescent-green' : 
                    deltaCalculations.netFlow < 0 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    ${deltaCalculations.netFlow.toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-3 border-b-2 border-[#00FF00] pb-2">
            <div className="text-xs font-mono font-bold text-[#00FF00] uppercase tracking-wider">
              LIVE BOOKMAP STREAMS
            </div>
          </div>
          
          {/* 2x2 Grid Layout - Full Screen */}
          <div className="grid grid-cols-2 grid-rows-2 gap-3 h-[calc(100%-60px)]">
            {/* Top Left: ES1 */}
            <div className="bg-black border-2 border-[#00FF00] rounded relative overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-90 px-2 py-1 rounded border border-[#00FF00]">
                <div className="text-[10px] font-mono font-bold text-[#00FF00]">ES1</div>
              </div>
              <iframe
                src={`https://www.youtube.com/embed/${bookmapFeeds.find(f => f.label === 'ES1')?.id || 'Rnv2spnuRCQ'}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="ES1 Bookmap"
              />
            </div>
            
            {/* Top Right: GOLD */}
            <div className="bg-black border-2 border-[#FFD700] rounded relative overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-90 px-2 py-1 rounded border border-[#FFD700]">
                <div className="text-[10px] font-mono font-bold text-[#FFD700]">GOLD</div>
              </div>
              <iframe
                src={`https://www.youtube.com/embed/${bookmapFeeds.find(f => f.label === 'Gold')?.id || 'Rnv2spnuRCQ'}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Gold Bookmap"
              />
            </div>
            
            {/* Bottom Left: BITCOIN */}
            <div className="bg-black border-2 border-[#FF6600] rounded relative overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-90 px-2 py-1 rounded border border-[#FF6600]">
                <div className="text-[10px] font-mono font-bold text-[#FF6600]">BITCOIN</div>
              </div>
              <iframe
                src={`https://www.youtube.com/embed/${bookmapFeeds.find(f => f.label === 'BTC')?.id || 'Rnv2spnuRCQ'}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Bitcoin Bookmap"
              />
            </div>
            
            {/* Bottom Right: SILVER */}
            <div className="bg-black border-2 border-[#C0C0C0] rounded relative overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-90 px-2 py-1 rounded border border-[#C0C0C0]">
                <div className="text-[10px] font-mono font-bold text-[#C0C0C0]">SILVER</div>
              </div>
              <iframe
                src={`https://www.youtube.com/embed/${bookmapFeeds.find(f => f.label === 'Silver')?.id || 'Rnv2spnuRCQ'}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Silver Bookmap"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategicPipeline;
