import React, { useState, useEffect } from 'react';
import { Camera, FileText, Download, Plus, ShieldCheck, DollarSign, Tag, ShoppingCart, ChevronDown, Clock } from 'lucide-react';
import { generateInsuranceCertificatePDF, generateResaleProfitPDF, generateDisplayCardsPDF } from '../services/pdfExporter.js';
import { generateInventoryCSV, generateEbayBatchCSV } from '../services/csvExporter.js';

export default function Navbar({ inventory, onOpenUploader, onOpenManualAdd, totalValuation }) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [totalDbCount, setTotalDbCount] = useState(8651);
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    fetch('/api/franchises')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const sum = data.reduce((acc, row) => acc + (row.count || 0), 0);
          if (sum > 0) setTotalDbCount(sum);
        }
      })
      .catch(err => console.error('Error fetching navbar DB count:', err));

    fetch('/api/db-status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(() => {});
  }, []);

  const handleExportCards = async () => {
    setIsExporting(true);
    try {
      await generateDisplayCardsPDF(inventory);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <nav className="navbar" style={{ padding: '1.25rem 2rem' }}>
      
      {/* Modernized Prominent Brand Header */}
      <div className="brand-logo" style={{ gap: '1.1rem' }}>
        <img 
          src="/assets/hero_logo.png" 
          alt="Universal Appraiser Logo" 
          style={{ 
            width: '56px', 
            height: '56px', 
            objectFit: 'contain', 
            filter: 'drop-shadow(0 0 16px var(--primary-glow)) drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
            transition: 'transform 0.3s ease'
          }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ 
              fontSize: '1.45rem',
              fontWeight: 900, 
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 40%, var(--primary-accent) 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              UNIVERSAL FIGURE APPRAISER
            </span>
            <span className="brand-badge" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>
              PRO SAAS
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--primary-accent)', fontWeight: 800 }}>{totalDbCount.toLocaleString()} Verified Items</span>
            <span>•</span>
            <span>TMNT, Star Wars, DC Multiverse, Marvel & Transformers</span>
            {dbStatus && (() => {
              const lastUpdate = dbStatus.last_price_update;
              if (!lastUpdate) return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Clock size={11} /> No price data timestamp
                </span>
              );
              const daysSince = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24));
              const color = daysSince <= 7 ? '#10b981' : daysSince <= 30 ? '#f59e0b' : '#ef4444';
              const bgColor = daysSince <= 7 ? 'rgba(16,185,129,0.15)' : daysSince <= 30 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
              const label = daysSince === 0 ? 'Updated today' : daysSince === 1 ? 'Updated yesterday' : `Updated ${daysSince}d ago`;
              return (
                <span title={`Last price update: ${new Date(lastUpdate).toLocaleString()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color, background: bgColor, padding: '0.15rem 0.5rem', borderRadius: '4px', border: `1px solid ${color}40`, cursor: 'help' }}>
                  <Clock size={11} /> {label}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="nav-actions" style={{ gap: '0.85rem' }}>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.7rem 1.25rem', fontSize: '0.88rem' }}
          onClick={onOpenManualAdd}
        >
          <Plus size={18} color="var(--primary-accent)" /> Add Manually
        </button>

        <button 
          className="btn btn-primary" 
          style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}
          onClick={onOpenUploader}
        >
          <Camera size={18} /> Box Photo Matcher
        </button>

        {inventory.length > 0 && (
          <div className="dropdown-wrap">
            <button 
              className="btn btn-secondary" 
              style={{ borderColor: 'var(--primary-accent)', color: 'var(--primary-accent)', padding: '0.7rem 1.25rem' }}
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
            >
              <FileText size={18} /> {isExporting ? 'Generating...' : 'Commercial Exports'} <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div className="dropdown-menu-box" onClick={() => setShowExportMenu(false)}>
                <button 
                  className="dropdown-item-btn"
                  onClick={() => generateInsuranceCertificatePDF(inventory, totalValuation)}
                >
                  <ShieldCheck size={18} color="#10b981" />
                  <div>
                    <div>Insurance Appraisal Certificate (PDF)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Includes legal means & method proof</div>
                  </div>
                </button>

                <button 
                  className="dropdown-item-btn"
                  onClick={() => generateResaleProfitPDF(inventory)}
                >
                  <DollarSign size={18} color="#f59e0b" />
                  <div>
                    <div>Dealer Resale & Profit Report (PDF)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target buy prices & gross margin ROI</div>
                  </div>
                </button>

                <button 
                  className="dropdown-item-btn"
                  onClick={handleExportCards}
                >
                  <Tag size={18} color="#3b82f6" />
                  <div>
                    <div>Printable Shelf Display Cards (PDF)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Full titles + real scannable QR codes</div>
                  </div>
                </button>

                <button 
                  className="dropdown-item-btn"
                  onClick={() => generateEbayBatchCSV(inventory)}
                >
                  <ShoppingCart size={18} color="#ec4899" />
                  <div>
                    <div>eBay & Whatnot Batch Listing (CSV)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pre-formatted seller upload file</div>
                  </div>
                </button>

                <button 
                  className="dropdown-item-btn"
                  onClick={() => generateInventoryCSV(inventory)}
                >
                  <Download size={18} color="#cbd5e1" />
                  <div>
                    <div>Standard Inventory Spreadsheet (CSV)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Full catalog data table</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
