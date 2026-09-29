import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import FranchiseHero from './components/FranchiseHero.jsx';
import ValuationSummary from './components/ValuationSummary.jsx';
import InventoryGrid from './components/InventoryGrid.jsx';
import BulkUploader from './components/BulkUploader.jsx';
import ManualAddModal from './components/ManualAddModal.jsx';
import { calculateValuation } from './services/valuation.js';

export default function App() {
  const [inventory, setInventory] = useState([]);
  const [activeFranchise, setActiveFranchise] = useState('all');
  const [showUploader, setShowUploader] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);

  // Apply dynamic franchise theme attribute to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeFranchise);
  }, [activeFranchise]);

  useEffect(() => {
    fetch('/api/inventory')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setInventory(data);
        } else {
          loadSampleInventory();
        }
      })
      .catch(() => loadSampleInventory());
  }, []);

  const loadSampleInventory = async () => {
    try {
      const resp = await fetch('/api/figures?search=Vader');
      const data = await resp.json();
      if (data && data.length > 0) {
        const fig = data[0];
        const sampleItem = {
          id: `${fig.id}-sample-1`,
          figure_db_id: fig.id,
          name: fig.name,
          franchise: fig.franchise || 'Star Wars',
          year: fig.release_year || 1980,
          group: fig.group_name || fig.series || 'Vintage Collection',
          upc: fig.upc,
          asin: fig.asin,
          series: fig.series,
          detail_url: fig.detail_url,
          image_thumb_url: fig.image_thumb_url,
          main_image_url: fig.main_image_url || fig.image_thumb_url,
          stats: {
            retail_price: fig.retail_price,
            avg_price: fig.avg_price,
            high_price: fig.high_price,
            low_price: fig.low_price
          },
          condition: 'intact',
          appraisedValue: calculateValuation(fig.avg_price || 120.0, 'intact').appraisedValue,
          notes: 'Sample Star Wars vintage collectible',
          addedAt: new Date().toISOString()
        };
        setInventory([sampleItem]);
      }
    } catch (e) {}
  };

  const handleAddToInventory = (newItem) => {
    const updated = [newItem, ...inventory];
    setInventory(updated);
    saveInventoryToServer(updated);
  };

  const handleDeleteItem = (itemId) => {
    const updated = inventory.filter(item => item.id !== itemId);
    setInventory(updated);
    saveInventoryToServer(updated);
  };

  const handleUpdateCondition = (itemId, newCondition) => {
    const updated = inventory.map(item => {
      if (item.id === itemId) {
        const baseAvg = item.stats?.avg_price || 50.0;
        const val = calculateValuation(baseAvg, newCondition);
        return {
          ...item,
          condition: newCondition,
          appraisedValue: val.appraisedValue
        };
      }
      return item;
    });
    setInventory(updated);
    saveInventoryToServer(updated);
  };

  const saveInventoryToServer = (inv) => {
    fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inv)
    }).catch(err => console.error('Error saving inventory:', err));
  };

  const filteredInventory = activeFranchise === 'all' 
    ? inventory 
    : inventory.filter(item => item.franchise === activeFranchise);

  const totalValuation = filteredInventory.reduce((sum, item) => sum + (item.appraisedValue || 0), 0);

  return (
    <div className="app-container">
      <Navbar 
        inventory={filteredInventory}
        onOpenUploader={() => setShowUploader(true)}
        onOpenManualAdd={() => setShowManualAdd(true)}
        totalValuation={totalValuation}
      />

      <FranchiseHero 
        activeFranchise={activeFranchise}
        onSelectFranchise={setActiveFranchise}
      />

      <ValuationSummary 
        inventory={filteredInventory}
        totalValuation={totalValuation}
      />

      <InventoryGrid 
        inventory={filteredInventory}
        onDeleteItem={handleDeleteItem}
        onUpdateCondition={handleUpdateCondition}
      />

      {showUploader && (
        <BulkUploader 
          onClose={() => setShowUploader(false)}
          onAddToInventory={handleAddToInventory}
        />
      )}

      {showManualAdd && (
        <ManualAddModal 
          onClose={() => setShowManualAdd(false)}
          onAddToInventory={handleAddToInventory}
        />
      )}
    </div>
  );
}
