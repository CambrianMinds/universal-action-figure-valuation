import { CONDITION_GRADES } from './valuation.js';

export function generateInventoryCSV(inventory) {
  const headers = [
    'ID', 'Franchise', 'Name', 'Release Year', 'Series/Group', 'Packaging Condition', 
    'Condition Multiplier', 'Retail MSRP', 'Market Avg Price', 'Market High Price', 
    'Market Low Price', 'Appraised Valuation', 'Valuation Database Source', 'UPC', 'ASIN', 'Notes', 'Detail URL'
  ];

  const rows = inventory.map(item => {
    const condConfig = CONDITION_GRADES[item.condition] || CONDITION_GRADES.intact;
    return [
      item.id,
      `"${(item.franchise || '').replace(/"/g, '""')}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      item.year || '',
      `"${(item.group || item.series || '').replace(/"/g, '""')}"`,
      `"${condConfig.label}"`,
      condConfig.multiplier,
      item.stats?.retail_price || '',
      item.stats?.avg_price || '',
      item.stats?.high_price || '',
      item.stats?.low_price || '',
      item.appraisedValue || 0,
      `"${(item.valuation_source || 'ActionFigure411 Market Index').replace(/"/g, '""')}"`,
      item.upc || '',
      item.asin || '',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      item.detail_url || ''
    ];
  });

  downloadCSV([headers.join(','), ...rows.map(e => e.join(','))].join('\n'), `Universal_Collectibles_Inventory_${new Date().toISOString().slice(0,10)}.csv`);
}

export function generateEbayBatchCSV(inventory) {
  const headers = [
    'Action', 'Category', 'Title', 'StartPrice', 'BuyItNowPrice', 'Quantity', 
    'Format', 'Duration', 'ConditionID', 'Description', 'UPC'
  ];

  const rows = inventory.map(item => {
    const title = `${item.franchise || ''} ${item.name} (${item.year || 'Vintage'}) Action Figure`.slice(0, 80);
    const startPrice = ((item.appraisedValue || 30) * 0.75).toFixed(2);
    const binPrice = (item.appraisedValue || 30).toFixed(2);
    const desc = `Authentic vintage ${item.franchise || ''} ${item.name} figure from Playmates/Hasbro. Valuation Source: ${item.valuation_source || 'ActionFigure411 Market Index'}. Packaging Condition: ${(CONDITION_GRADES[item.condition] || CONDITION_GRADES.intact).label}. Appraised valuation: $${binPrice}.`;

    return [
      'Add',
      '246',
      `"${title.replace(/"/g, '""')}"`,
      startPrice,
      binPrice,
      '1',
      'Auction',
      '7',
      item.condition === 'intact' ? '1000' : '3000',
      `"${desc.replace(/"/g, '""')}"`,
      item.upc || 'Does Not Apply'
    ];
  });

  downloadCSV([headers.join(','), ...rows.map(e => e.join(','))].join('\n'), `eBay_Whatnot_Batch_Listings_${new Date().toISOString().slice(0,10)}.csv`);
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
