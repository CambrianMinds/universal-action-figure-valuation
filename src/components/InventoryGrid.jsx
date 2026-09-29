import React, { useState } from 'react';
import { 
  Search, Trash2, ExternalLink, Barcode, Copy, Check, Database, 
  LayoutGrid, List, Eye, ArrowUpDown, X, Tag, Calendar, DollarSign, ChevronRight, Info 
} from 'lucide-react';
import { CONDITION_GRADES } from '../services/valuation.js';

export default function InventoryGrid({ inventory, onDeleteItem, onUpdateCondition }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' | 'preview'
  const [sortBy, setSortBy] = useState('val_high');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [inspectModalItem, setInspectModalItem] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopySku = (item, e) => {
    if (e) e.stopPropagation();
    const skuText = item.upc || item.asin || item.figure_db_id || item.id;
    navigator.clipboard.writeText(skuText);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Filtering Logic
  const filteredItems = inventory.filter(item => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch = !cleanSearch || 
      item.name.toLowerCase().includes(cleanSearch) ||
      (item.upc && item.upc.toLowerCase().includes(cleanSearch)) ||
      (item.asin && item.asin.toLowerCase().includes(cleanSearch)) ||
      (item.group && item.group.toLowerCase().includes(cleanSearch)) ||
      (item.franchise && item.franchise.toLowerCase().includes(cleanSearch));

    const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  // 2. Sorting Logic
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'val_high':
        return (b.appraisedValue || 0) - (a.appraisedValue || 0);
      case 'val_low':
        return (a.appraisedValue || 0) - (b.appraisedValue || 0);
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'year_new':
        return (b.year || 0) - (a.year || 0);
      case 'year_old':
        return (a.year || 0) - (b.year || 0);
      case 'condition':
        const multA = CONDITION_GRADES[a.condition]?.multiplier || 1.0;
        const multB = CONDITION_GRADES[b.condition]?.multiplier || 1.0;
        return multB - multA;
      default:
        return 0;
    }
  });

  // Keep selected item valid for preview view
  const currentSelectedItem = sortedItems.find(i => i.id === selectedItemId) || sortedItems[0] || null;

  return (
    <div>
      {/* --- CONTROL BAR --- */}
      <div className="inventory-controls">
        {/* Search Bar */}
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="search-input"
            style={{ paddingLeft: '2.5rem', width: '100%' }}
            placeholder="Search figures, UPC barcodes, series..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Condition Filter */}
        <select 
          className="search-input"
          style={{ flex: '0 0 190px' }}
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
        >
          <option value="all">All Conditions</option>
          <option value="intact">Sealed / Mint (100%)</option>
          <option value="shelf_wear">Light Shelf Wear (85%)</option>
          <option value="damaged_box">Damaged Box (65%)</option>
          <option value="loose">Loose Figure (40%)</option>
        </select>

        {/* Sort By Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '0 0 210px' }}>
          <ArrowUpDown size={16} color="var(--primary-accent)" />
          <select 
            className="search-input"
            style={{ width: '100%' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="val_high">Value: High → Low</option>
            <option value="val_low">Value: Low → High</option>
            <option value="name_asc">Name: A → Z</option>
            <option value="name_desc">Name: Z → A</option>
            <option value="year_new">Release: Newest</option>
            <option value="year_old">Release: Oldest</option>
            <option value="condition">Grade Modifier</option>
          </select>
        </div>

        {/* View Mode Toggle Group */}
        <div className="view-toggle-group">
          <button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View (Cards)"
          >
            <LayoutGrid size={16} /> Grid
          </button>
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View (Compact Rows)"
          >
            <List size={16} /> List
          </button>
          <button 
            className={`view-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
            title="Preview Inspector View"
          >
            <Eye size={16} /> Preview
          </button>
        </div>
      </div>

      {/* --- EMPTY STATE --- */}
      {sortedItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>No figures match your filter</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Try adjusting your search criteria or reset filters.
          </div>
        </div>
      ) : (
        <>
          {/* ================= GRID VIEW ================= */}
          {viewMode === 'grid' && (
            <div className="item-grid">
              {sortedItems.map(item => {
                const condConfig = CONDITION_GRADES[item.condition] || CONDITION_GRADES.intact;
                const displayImage = item.main_image_url || item.image_thumb_url || '/common/images/af-price-guide-hero.png';
                const displaySku = item.upc || item.asin || item.figure_db_id || item.id;
                const sourceDb = item.valuation_source || 'ActionFigure411 Market Index';

                return (
                  <div key={item.id} className="figure-card">
                    <div className="card-img-wrap" style={{ cursor: 'pointer' }} onClick={() => setInspectModalItem(item)}>
                      <img src={displayImage} alt={item.name} className="card-img" />
                      
                      <span className={`badge ${condConfig.badgeClass}`} style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        {condConfig.label.split(' ')[0]}
                      </span>

                      <span className="badge" style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.75)', color: 'var(--primary-accent)', border: '1px solid var(--primary-accent)' }}>
                        {item.franchise || 'Collectibles'}
                      </span>
                    </div>

                    <div className="card-body">
                      <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setInspectModalItem(item)}>
                        {item.name}
                      </div>
                      
                      <div className="card-meta">
                        {item.year || 'Vintage'} • {item.series || item.group || 'Action Figures'}
                      </div>

                      {/* Barcode SKU */}
                      <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-accent)' }}>
                          <Barcode size={14} /> {displaySku}
                        </div>
                        <button 
                          onClick={(e) => handleCopySku(item, e)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          title="Copy SKU / UPC"
                        >
                          {copiedId === item.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                      </div>

                      {/* Source notation */}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px dashed var(--glass-border)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Database size={12} color="var(--primary-accent)" /> 
                        <span>Source: <strong style={{ color: '#fff' }}>{sourceDb}</strong></span>
                      </div>

                      {/* Condition Modifier Dropdown */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                          Adjust Grade:
                        </label>
                        <select
                          className="search-input"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', width: '100%' }}
                          value={item.condition || 'intact'}
                          onChange={(e) => onUpdateCondition(item.id, e.target.value)}
                        >
                          {Object.keys(CONDITION_GRADES).map(key => (
                            <option key={key} value={key}>
                              {CONDITION_GRADES[key].label} ({(CONDITION_GRADES[key].multiplier * 100).toFixed(0)}%)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Price & Actions */}
                      <div className="price-box">
                        <div>
                          <div className="val-label">Appraised Value</div>
                          <div className="val-amount">
                            ${(item.appraisedValue || 0).toFixed(2)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                            onClick={() => setInspectModalItem(item)}
                            title="Inspect Item Details"
                          >
                            <Info size={14} />
                          </button>

                          {item.detail_url && (
                            <a 
                              href={item.detail_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                              title="View Market Guide"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          
                          <button 
                            className="btn btn-outline-danger"
                            style={{ padding: '0.4rem' }}
                            onClick={() => onDeleteItem(item.id)}
                            title="Remove Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= LIST VIEW ================= */}
          {viewMode === 'list' && (
            <div className="item-list-container">
              {sortedItems.map(item => {
                const condConfig = CONDITION_GRADES[item.condition] || CONDITION_GRADES.intact;
                const displayImage = item.main_image_url || item.image_thumb_url || '/common/images/af-price-guide-hero.png';
                const displaySku = item.upc || item.asin || item.figure_db_id || item.id;

                return (
                  <div key={item.id} className="list-row-item">
                    <img 
                      src={displayImage} 
                      alt={item.name} 
                      className="list-thumb" 
                      onClick={() => setInspectModalItem(item)}
                      style={{ cursor: 'pointer' }}
                    />

                    <div className="list-col-main" onClick={() => setInspectModalItem(item)} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.franchise || 'Collectibles'} • {item.year || 'Vintage'} • {item.series || item.group}
                      </div>
                    </div>

                    <div className="list-col-meta">
                      {/* Barcode SKU */}
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-accent)', border: '1px solid var(--glass-border)' }}>
                        <Barcode size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        {displaySku}
                      </div>

                      {/* Condition Grade Selector */}
                      <select
                        className="search-input"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', width: '160px' }}
                        value={item.condition || 'intact'}
                        onChange={(e) => onUpdateCondition(item.id, e.target.value)}
                      >
                        {Object.keys(CONDITION_GRADES).map(key => (
                          <option key={key} value={key}>
                            {CONDITION_GRADES[key].label} ({(CONDITION_GRADES[key].multiplier * 100).toFixed(0)}%)
                          </option>
                        ))}
                      </select>

                      {/* Appraised Value */}
                      <div style={{ textAlign: 'right', minWidth: '110px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Appraised</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-accent)', fontFamily: 'var(--font-mono)' }}>
                          ${(item.appraisedValue || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem' }}
                          onClick={() => setInspectModalItem(item)}
                          title="Inspect Details"
                        >
                          <Info size={14} />
                        </button>

                        <button 
                          className="btn btn-outline-danger"
                          style={{ padding: '0.4rem' }}
                          onClick={() => onDeleteItem(item.id)}
                          title="Remove Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= PREVIEW / SPLIT VIEW ================= */}
          {viewMode === 'preview' && (
            <div className="preview-layout">
              {/* Left Sidebar List */}
              <div className="preview-sidebar-list">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Select Item to Preview ({sortedItems.length})
                </div>

                {sortedItems.map(item => {
                  const isSelected = currentSelectedItem && currentSelectedItem.id === item.id;
                  const displayImage = item.main_image_url || item.image_thumb_url || '/common/images/af-price-guide-hero.png';

                  return (
                    <div 
                      key={item.id} 
                      className={`preview-sidebar-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <img src={displayImage} alt={item.name} style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'contain', background: '#000' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.franchise} • ${(item.appraisedValue || 0).toFixed(2)}
                        </div>
                      </div>
                      <ChevronRight size={16} color={isSelected ? 'var(--primary-accent)' : 'var(--text-muted)'} />
                    </div>
                  );
                })}
              </div>

              {/* Right Detail Panel */}
              {currentSelectedItem && (
                <div className="preview-detail-panel">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* High Res Image */}
                    <div style={{ background: '#000', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                      <img 
                        src={currentSelectedItem.main_image_url || currentSelectedItem.image_thumb_url} 
                        alt={currentSelectedItem.name} 
                        style={{ maxHeight: '320px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Detailed Specs */}
                    <div>
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--primary-accent)', border: '1px solid var(--primary-accent)', marginBottom: '0.5rem' }}>
                        {currentSelectedItem.franchise || 'Collectibles'}
                      </span>

                      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' }}>
                        {currentSelectedItem.name}
                      </h2>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        {currentSelectedItem.year || 'Vintage'} • {currentSelectedItem.series || currentSelectedItem.group}
                      </div>

                      {/* Pricing Breakdown Grid */}
                      <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '0.85rem', border: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700 }}>
                          Market Valuation Summary
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <div>Retail MSRP: <strong style={{ color: '#fff' }}>${currentSelectedItem.stats?.retail_price || 4.99}</strong></div>
                          <div>Market Avg: <strong style={{ color: '#fff' }}>${currentSelectedItem.stats?.avg_price || 45.00}</strong></div>
                          <div>Historic High: <strong style={{ color: '#34d399' }}>${currentSelectedItem.stats?.high_price || 75.00}</strong></div>
                          <div>Historic Low: <strong style={{ color: '#f87171' }}>${currentSelectedItem.stats?.low_price || 20.00}</strong></div>
                        </div>

                        <div style={{ borderTop: '1px dashed var(--glass-border)', marginTop: '0.75rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Appraised Value:</span>
                          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-accent)', fontFamily: 'var(--font-mono)' }}>
                            ${(currentSelectedItem.appraisedValue || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Grade Selector */}
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}>
                          Packaging Condition Grade:
                        </label>
                        <select
                          className="search-input"
                          style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}
                          value={currentSelectedItem.condition || 'intact'}
                          onChange={(e) => onUpdateCondition(currentSelectedItem.id, e.target.value)}
                        >
                          {Object.keys(CONDITION_GRADES).map(key => (
                            <option key={key} value={key}>
                              {CONDITION_GRADES[key].label} ({(CONDITION_GRADES[key].multiplier * 100).toFixed(0)}%)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* SKU & Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {currentSelectedItem.detail_url && (
                          <a 
                            href={currentSelectedItem.detail_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-primary"
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            <ExternalLink size={16} /> Market Guide
                          </a>
                        )}

                        <button 
                          className="btn btn-outline-danger" 
                          onClick={() => onDeleteItem(currentSelectedItem.id)}
                        >
                          <Trash2 size={16} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ================= INSPECTOR MODAL ================= */}
      {inspectModalItem && (
        <div className="modal-overlay" onClick={() => setInspectModalItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
                <Info color="var(--primary-accent)" /> Figure Inspector
              </div>
              <button 
                onClick={() => setInspectModalItem(null)} 
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem' }}>
              <div style={{ background: '#000', borderRadius: '10px', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={inspectModalItem.main_image_url || inspectModalItem.image_thumb_url} 
                  alt={inspectModalItem.name} 
                  style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                  {inspectModalItem.name}
                </h3>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Franchise: <strong style={{ color: 'var(--primary-accent)' }}>{inspectModalItem.franchise}</strong> • Year: {inspectModalItem.year || 'Vintage'}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU / UPC / Barcode:</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
                    {inspectModalItem.upc || inspectModalItem.asin || inspectModalItem.figure_db_id}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Appraised Value</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-accent)', fontFamily: 'var(--font-mono)' }}>
                      ${(inspectModalItem.appraisedValue || 0).toFixed(2)}
                    </div>
                  </div>

                  <select
                    className="search-input"
                    style={{ padding: '0.4rem', fontSize: '0.8rem', width: '180px' }}
                    value={inspectModalItem.condition || 'intact'}
                    onChange={(e) => {
                      onUpdateCondition(inspectModalItem.id, e.target.value);
                      setInspectModalItem({ ...inspectModalItem, condition: e.target.value });
                    }}
                  >
                    {Object.keys(CONDITION_GRADES).map(key => (
                      <option key={key} value={key}>
                        {CONDITION_GRADES[key].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
