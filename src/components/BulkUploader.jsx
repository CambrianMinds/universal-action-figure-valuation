import React, { useState } from 'react';
import { Upload, X, ShieldCheck, Zap, Camera } from 'lucide-react';
import { CONDITION_GRADES, calculateValuation } from '../services/valuation.js';

export default function BulkUploader({ onClose, onAddToInventory }) {
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [condition, setCondition] = useState('intact');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    if (type === 'front') {
      setFrontImage(file);
      setFrontPreview(previewUrl);
    } else {
      setBackImage(file);
      setBackPreview(previewUrl);
    }
  };

  const handleScan = async () => {
    if (!frontImage) return;

    setScanning(true);
    const formData = new FormData();
    formData.append('front_image', frontImage);
    if (backImage) formData.append('back_image', backImage);

    try {
      const resp = await fetch('/api/identify', {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      setScanResult(data);
      setScanning(false);
    } catch (err) {
      console.error('Scan error:', err);
      setScanning(false);
    }
  };

  const handleConfirmCandidate = (candidate) => {
    const basePrice = candidate.avg_price || 50.0;
    const val = calculateValuation(basePrice, condition);

    const newItem = {
      id: `${candidate.id}-${Date.now()}`,
      figure_db_id: candidate.id,
      name: candidate.name,
      franchise: candidate.franchise,
      year: candidate.release_year,
      group: candidate.group_name || candidate.series,
      upc: candidate.upc,
      asin: candidate.asin,
      series: candidate.series,
      detail_url: candidate.detail_url,
      image_thumb_url: candidate.image_thumb_url,
      main_image_url: candidate.main_image_url || candidate.image_thumb_url,
      stats: {
        retail_price: candidate.retail_price,
        avg_price: candidate.avg_price,
        high_price: candidate.high_price,
        low_price: candidate.low_price
      },
      condition: condition,
      appraisedValue: val.appraisedValue,
      notes: 'Photo Matcher Verified',
      addedAt: new Date().toISOString()
    };

    onAddToInventory(newItem);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '780px' }}>
        
        {/* Banner with 3D Scanner Graphic */}
        <div style={{ position: 'relative', height: '140px', borderRadius: '12px 12px 0 0', overflow: 'hidden', borderBottom: '1px solid var(--glass-border)' }}>
          <img 
            src="/assets/scanner_hud.png" 
            alt="AI Scanner HUD" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.85)' }}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(8,11,18,0.3) 0%, rgba(8,11,18,0.9) 100%)', display: 'flex', alignItems: 'flex-end', padding: '1.25rem 1.5rem', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={22} color="var(--primary-accent)" /> Box Photo Matcher & Catalog Lookup
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Upload front & back box photos for instant identification & valuation
              </div>
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          
          {/* Upload Dropzones */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            
            {/* Front Box Photo */}
            <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '10px', padding: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
              {frontPreview ? (
                <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={frontPreview} alt="Front Box" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }} />
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'block', padding: '1rem 0' }}>
                  <Upload size={32} color="var(--primary-accent)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Upload Front Box Photo</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click to select photo</div>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {/* Back Box Photo */}
            <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '10px', padding: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
              {backPreview ? (
                <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={backPreview} alt="Back Box" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }} />
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'block', padding: '1rem 0' }}>
                  <Upload size={32} color="var(--secondary-accent)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Upload Back Box Photo</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Optional for UPC scanning</div>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} style={{ display: 'none' }} />
                </label>
              )}
            </div>

          </div>

          {/* Packaging Condition Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
              Packaging Condition Grade:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {Object.keys(CONDITION_GRADES).map(key => {
                const g = CONDITION_GRADES[key];
                const isSel = condition === key;
                return (
                  <button 
                    key={key}
                    className="btn btn-secondary"
                    style={{
                      borderColor: isSel ? 'var(--primary-accent)' : 'var(--glass-border)',
                      background: isSel ? 'rgba(154, 204, 5, 0.15)' : 'transparent',
                      color: isSel ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      justifyContent: 'center'
                    }}
                    onClick={() => setCondition(key)}
                  >
                    {g.shortLabel} ({(g.multiplier * 100).toFixed(0)}%)
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <button 
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem' }}
            disabled={!frontImage || scanning}
            onClick={handleScan}
          >
            <Zap size={18} /> {scanning ? 'Matching Image to Catalog...' : 'Run Box Photo Matcher'}
          </button>

          {/* Candidates Display */}
          {scanResult && scanResult.candidates && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={16} color="var(--primary-accent)" /> Catalog Matches Found ({scanResult.candidates.length}):
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {scanResult.candidates.map((cand, idx) => (
                  <div 
                    key={cand.id}
                    style={{
                      background: idx === 0 ? 'rgba(154, 204, 5, 0.1)' : 'rgba(0,0,0,0.3)',
                      border: `1px solid ${idx === 0 ? 'var(--primary-accent)' : 'var(--glass-border)'}`,
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '45px', height: '45px', background: '#000', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={cand.main_image_url || cand.image_thumb_url} alt={cand.name} style={{ maxHeight: '40px', maxWidth: '40px', objectFit: 'contain' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{cand.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {cand.franchise} • {cand.release_year || 'Vintage'} • Confidence: <strong style={{ color: 'var(--primary-accent)' }}>{cand.confidence}%</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary-accent)', fontFamily: 'var(--font-mono)' }}>
                        ${((cand.avg_price || 50) * (CONDITION_GRADES[condition]?.multiplier || 1.0)).toFixed(2)}
                      </div>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', marginTop: '0.25rem' }}
                        onClick={() => handleConfirmCandidate(cand)}
                      >
                        Confirm Match
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
