import React, { useState, useEffect } from 'react';
import { DollarSign, Package, Award, TrendingUp, Clock } from 'lucide-react';
import { CONDITION_GRADES } from '../services/valuation.js';

export default function ValuationSummary({ inventory, totalValuation }) {
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    fetch('/api/db-status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(() => {});
  }, []);

  if (inventory.length === 0) return null;

  const totalItems = inventory.length;
  const avgItemVal = totalValuation / totalItems;
  
  // Find highest value item
  let topItem = inventory[0];
  inventory.forEach(item => {
    if ((item.appraisedValue || 0) > (topItem.appraisedValue || 0)) {
      topItem = item;
    }
  });

  // Packaging condition breakdown counts
  const conditionCounts = {
    intact: 0,
    shelf_wear: 0,
    damaged_box: 0,
    loose: 0
  };

  inventory.forEach(item => {
    const c = item.condition || 'intact';
    conditionCounts[c] = (conditionCounts[c] || 0) + 1;
  });

  // Data freshness calculation
  let freshnessLabel = 'Unknown';
  let freshnessColor = '#ef4444';
  let freshnessSub = 'Run UPDATE_PRICES.bat to refresh';
  if (dbStatus && dbStatus.last_price_update) {
    const daysSince = Math.floor((Date.now() - new Date(dbStatus.last_price_update).getTime()) / (1000 * 60 * 60 * 24));
    freshnessColor = daysSince <= 7 ? '#10b981' : daysSince <= 30 ? '#f59e0b' : '#ef4444';
    freshnessLabel = daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`;
    freshnessSub = `${dbStatus.items_updated_last_run || 0} prices updated last run`;
  }

  return (
    <div className="summary-grid">
      <div className="metric-card">
        <div className="metric-label">Total Portfolio Valuation</div>
        <div className="metric-value" style={{ color: 'var(--tmnt-green)' }}>
          ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="metric-sub">Market-Based Valuation Estimate</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Cataloged Collection</div>
        <div className="metric-value">{totalItems} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Items</span></div>
        <div className="metric-sub">Avg Value: ${avgItemVal.toFixed(2)} / item</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Highest Value Item</div>
        <div className="metric-value" style={{ fontSize: '1.4rem' }}>
          ${(topItem.appraisedValue || 0).toFixed(2)}
        </div>
        <div className="metric-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {topItem.name} ({topItem.year || '1988'})
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Packaging Grade Mix</div>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          {Object.keys(CONDITION_GRADES).map(key => (
            <span key={key} className={`badge ${CONDITION_GRADES[key].badgeClass}`}>
              {conditionCounts[key]} {key === 'intact' ? 'Sealed' : key === 'shelf_wear' ? 'Wear' : key === 'damaged_box' ? 'Damaged' : 'Loose'}
            </span>
          ))}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Clock size={14} color={freshnessColor} /> Price Data Freshness
        </div>
        <div className="metric-value" style={{ fontSize: '1.4rem', color: freshnessColor }}>
          {freshnessLabel}
        </div>
        <div className="metric-sub">{freshnessSub}</div>
      </div>
    </div>
  );
}
