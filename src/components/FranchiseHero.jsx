import React, { useState, useEffect } from 'react';

const BASE_CARDS = [
  { id: 'all', name: 'All Franchises', defaultCount: 8651, img: '/assets/hero_logo.png', color: '#9acc05' },
  { id: 'TMNT', name: 'TMNT', defaultCount: 4498, img: '/assets/tmnt_emblem.png', color: '#10b981' },
  { id: 'Star Wars', name: 'Star Wars', defaultCount: 2004, img: '/assets/starwars_emblem.png', color: '#3b82f6' },
  { id: 'DC Multiverse', name: 'DC Multiverse', defaultCount: 1007, img: '/assets/dc_emblem.png', color: '#8b5cf6' },
  { id: 'Marvel', name: 'Marvel', defaultCount: 602, img: '/assets/marvel_emblem.png', color: '#ef4444' },
  { id: 'Transformers', name: 'Transformers', defaultCount: 540, img: '/assets/transformers_emblem.png', color: '#06b6d4' }
];

export default function FranchiseHero({ activeFranchise, onSelectFranchise }) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    fetch('/api/franchises')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const map = {};
          let totalSum = 0;
          data.forEach(row => {
            map[row.franchise] = row.count;
            totalSum += row.count;
          });
          map['all'] = totalSum;
          setCounts(map);
        }
      })
      .catch(err => console.error('Error fetching live franchise counts:', err));
  }, []);

  return (
    <div style={{ marginBottom: '2.25rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Dynamic Franchise Environment & Live Database Index</span>
        <span style={{ color: 'var(--primary-accent)', fontSize: '0.75rem', fontWeight: 800 }}>
          Active Environment: {activeFranchise === 'all' ? 'Multiverse Glass' : `${activeFranchise} Mode`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.1rem' }}>
        {BASE_CARDS.map(card => {
          const isSelected = activeFranchise === card.id;
          const liveCount = counts[card.id] !== undefined ? counts[card.id] : card.defaultCount;

          return (
            <div
              key={card.id}
              onClick={() => onSelectFranchise(card.id)}
              className="glass-panel"
              style={{
                borderColor: isSelected ? card.color : 'var(--glass-border)',
                background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'var(--bg-card)',
                padding: '1.25rem 1.35rem',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '1.1rem',
                boxShadow: isSelected 
                  ? `0 12px 30px rgba(0,0,0,0.6), 0 0 25px ${card.color}50` 
                  : 'var(--glass-shadow)'
              }}
            >
              {/* Prominent Large 3D Emblem Container */}
              <div 
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '16px', 
                  background: isSelected ? `rgba(0,0,0,0.6)` : 'rgba(0,0,0,0.4)', 
                  border: `1.5px solid ${isSelected ? card.color : 'var(--glass-border)'}`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  overflow: 'hidden', 
                  flexShrink: 0,
                  boxShadow: isSelected ? `0 0 15px ${card.color}60` : '0 4px 12px rgba(0,0,0,0.4)',
                  transition: 'transform 0.25s ease'
                }}
              >
                <img 
                  src={card.img} 
                  alt={card.name}
                  style={{ 
                    width: '52px', 
                    height: '52px', 
                    objectFit: 'contain', 
                    filter: isSelected ? 'drop-shadow(0 0 10px currentColor)' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)'
                  }}
                />
              </div>

              <div>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: isSelected ? '#fff' : 'var(--text-main)', letterSpacing: '-0.01em' }}>
                  {card.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: isSelected ? card.color : 'var(--text-muted)', fontWeight: 800, marginTop: '0.15rem' }}>
                  {liveCount.toLocaleString()} Items
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
