import React, { useState, useEffect } from 'react';
import { Search, X, Plus, ShieldCheck, Barcode, Copy, Check } from 'lucide-react';
import { CONDITION_GRADES, calculateValuation } from '../services/valuation.js';

export default function ManualAddModal({ onClose, onAddToInventory }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [skuQuery, setSkuQuery] = useState('');
  const [selectedFranchise, setSelectedFranchise] = useState('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState('all');
  const [figures, setFigures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState(null);
  const [condition, setCondition] = useState('intact');
  const [notes, setNotes] = useState('');
  const [copiedSku, setCopiedSku] = useState(false);

  useEffect(() => {
    fetchFigures('', 'all', 'all', '');
  }, []);

  const fetchFigures = async (query, franchiseFilter, yearFilter, directSku) => {
    setLoading(true);
    try {
      let url = `/api/figures?1=1`;
      if (franchiseFilter && franchiseFilter !== 'all') {
        url += `&franchise=${encodeURIComponent(franchiseFilter)}`;
      }
      if (directSku) {
        url += `&sku=${encodeURIComponent(directSku)}`;
      } else if (query) {
        url += `&search=${encodeURIComponent(query)}`;
      }
      if (yearFilter && yearFilter !== 'all') {
        url += `&year=${yearFilter}`;
      }
      const resp = await fetch(url);
      const data = await resp.json();
      setFigures(data);
      if (data.length > 0) {
        setSelectedFigure(data[0]);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchTerm(q);
    setSkuQuery('');
    fetchFigures(q, selectedFranchise, selectedYearFilter, '');
  };

  const handleFranchiseChange = (fr) => {
    setSelectedFranchise(fr);
    fetchFigures(searchTerm, fr, selectedYearFilter, skuQuery);
  };

  const handleSkuSearch = (e) => {
    e.preventDefault();
    if (!skuQuery.trim()) return;
    setSearchTerm('');
    fetchFigures('', selectedFranchise, selectedYearFilter, skuQuery.trim());
  };

  const handleCopySku = (skuText) => {
    navigator.clipboard.writeText(skuText);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  const handleAdd = () => {
    if (!selectedFigure) return;

    const basePrice = selectedFigure.avg_price || 50.0;
    const val = calculateValuation(basePrice, condition);

    const newItem = {
      id: `${selectedFigure.id}-${Date.now()}`,
      figure_db_id: selectedFigure.id,
      name: selectedFigure.name,
      franchise: selectedFigure.franchise,
      year: selectedFigure.release_year || selectedFigure.year,
      group: selectedFigure.group_name || selectedFigure.series || selectedFigure.group,
      upc: selectedFigure.upc,
      asin: selectedFigure.asin,
      series: selectedFigure.series,
      detail_url: selectedFigure.detail_url,
      image_thumb_url: selectedFigure.image_thumb_url,
      main_image_url: selectedFigure.main_image_url || selectedFigure.image_thumb_url,
      stats: {
        retail_price: selectedFigure.retail_price,
        avg_price: selectedFigure.avg_price,
        high_price: selectedFigure.high_price,
        low_price: selectedFigure.low_price
      },
      condition: condition,
      appraisedValue: val.appraisedValue,
      notes: notes,
      addedAt: new Date().toISOString()
    };

    onAddToInventory(newItem);
    onClose();
  };

  const currentValuation = selectedFigure 
    ? calculateValuation(selectedFigure.avg_price || 50.0, condition).appraisedValue 
    : 0;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-card" 
        style={{ 
          maxWidth: '920px', 
          height: '85vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '0', 
          overflow: 'hidden' 
        }}
      >
        {/* Modal Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="#9acc05" /> Add Figure from Universal 4,864 Database
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Search across Star Wars, TMNT, Marvel, Transformers & DC Multiverse
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Dual Search Options: Text Search + SKU Lookup */}
        <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
            
            {/* General Text Search */}
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input" 
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="Search figure name (e.g. Darth Vader, April O'Neil, Optimus Prime)..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>

            {/* SKU / UPC Quick Lookup Form */}
            <form onSubmit={handleSkuSearch} style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Barcode size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--tmnt-green)' }} />
                <input 
                  type="text" 
                  className="search-input"
                  style={{ paddingLeft: '2.2rem', width: '100%', borderColor: 'rgba(154, 204, 5, 0.4)' }}
                  placeholder="SKU / UPC Barcode / ASIN..."
                  value={skuQuery}
                  onChange={(e) => setSkuQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}>
                Lookup SKU
              </button>
            </form>

          </div>

          {/* Franchise Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Franchise:</span>
            {['all', 'Star Wars', 'TMNT', 'Marvel', 'Transformers', 'DC Multiverse'].map(fr => (
              <button 
                key={fr} 
                className="btn btn-secondary"
                style={{ 
                  padding: '0.2rem 0.55rem', 
                  fontSize: '0.75rem',
                  borderColor: selectedFranchise === fr ? 'var(--tmnt-green)' : 'var(--border-color)',
                  color: selectedFranchise === fr ? 'var(--tmnt-green)' : 'var(--text-muted)',
                  background: selectedFranchise === fr ? 'rgba(154, 204, 5, 0.1)' : 'transparent'
                }}
                onClick={() => handleFranchiseChange(fr)}
              >
                {fr === 'all' ? 'All Franchises' : fr}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body - 2 Columns */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', overflow: 'hidden' }}>
          
          {/* Left Panel: Figure Grid */}
          <div style={{ overflowY: 'auto', padding: '1rem', borderRight: '1px solid var(--border-color)' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Searching 4,864 Universal database...
              </div>
            ) : figures.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No matching figures found for that query or SKU.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>
                {figures.map(fig => {
                  const isSelected = selectedFigure?.id === fig.id;
                  const thumb = fig.image_thumb_url || fig.main_image_url || '/common/images/af-price-guide-hero.png';
                  const displaySku = fig.upc || fig.asin || `ID:#${fig.id}`;

                  return (
                    <div 
                      key={fig.id} 
                      onClick={() => setSelectedFigure(fig)}
                      style={{
                        background: isSelected ? 'rgba(154, 204, 5, 0.12)' : 'var(--bg-card)',
                        border: `1px solid ${isSelected ? 'var(--tmnt-green)' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        padding: '0.6rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', background: '#090d14', borderRadius: '4px', overflow: 'hidden' }}>
                        <img src={thumb} alt={fig.name} style={{ maxHeight: '80px', maxWidth: '90%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fig.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--tmnt-green)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                        [{fig.franchise}]
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <span>{fig.release_year || 'Vintage'}</span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>
                          ${fig.avg_price ? fig.avg_price.toFixed(0) : '50'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Selected Figure SKU Specs & Configuration */}
          <div style={{ padding: '1.25rem', overflowY: 'auto', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}>
            {selectedFigure ? (
              <>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '70px', height: '70px', background: '#090d14', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={selectedFigure.main_image_url || selectedFigure.image_thumb_url} 
                      alt={selectedFigure.name} 
                      style={{ maxHeight: '60px', maxWidth: '90%', objectFit: 'contain' }} 
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{selectedFigure.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {selectedFigure.franchise} • {selectedFigure.series || 'Vintage'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--tmnt-green)', marginTop: '0.2rem' }}>
                      Online Avg Sold: ${selectedFigure.avg_price ? selectedFigure.avg_price.toFixed(2) : '50.00'}
                    </div>
                  </div>
                </div>

                {/* SKU / UPC / ASIN Spec Box */}
                <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Barcode size={14} color="var(--tmnt-green)" /> Identifiers & SKU Specs
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>UPC Barcode: </span>
                      <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{selectedFigure.upc || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Amazon ASIN: </span>
                      <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{selectedFigure.asin || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Database ID: </span>
                      <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>#{selectedFigure.id}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>MSRP: </span>
                      <strong style={{ color: '#fff' }}>${selectedFigure.retail_price || '19.99'}</strong>
                    </div>
                  </div>

                  {selectedFigure.upc && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '0.3rem' }}
                      onClick={() => handleCopySku(selectedFigure.upc)}
                    >
                      {copiedSku ? <Check size={14} color="#10b981" /> : <Copy size={14} />} 
                      {copiedSku ? 'UPC Barcode Copied!' : `Copy UPC (${selectedFigure.upc})`}
                    </button>
                  )}
                </div>

                {/* Condition Selector */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Packaging Condition Grade:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {Object.keys(CONDITION_GRADES).map(key => {
                      const g = CONDITION_GRADES[key];
                      const isSel = condition === key;
                      return (
                        <div 
                          key={key} 
                          onClick={() => setCondition(key)}
                          style={{
                            padding: '0.6rem 0.8rem',
                            borderRadius: '6px',
                            border: `1px solid ${isSel ? 'var(--tmnt-green)' : 'var(--border-color)'}`,
                            background: isSel ? 'rgba(154, 204, 5, 0.1)' : 'var(--bg-dark)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSel ? '#fff' : 'var(--text-muted)' }}>
                            {g.label.split(' ')[0]} ({g.label.split('(')[1]?.replace(')', '') || ''})
                          </span>
                          <span className={`badge ${g.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                            {(g.multiplier * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes Input */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Collector Notes (Optional):
                  </label>
                  <input 
                    type="text" 
                    className="search-input"
                    style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                    placeholder="e.g. Sealed box, punch tab intact."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a figure from the left panel to configure valuation.
              </div>
            )}
          </div>
        </div>

        {/* Fixed Sticky Footer Bar */}
        <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-dark)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Calculated Valuation
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--tmnt-green)', fontFamily: 'var(--font-mono)' }}>
              ${currentValuation.toFixed(2)} USD
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              style={{ padding: '0.65rem 1.5rem' }}
              disabled={!selectedFigure}
              onClick={handleAdd}
            >
              <Plus size={16} /> Add to Collection Catalog
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
