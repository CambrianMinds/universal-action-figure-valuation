import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { CONDITION_GRADES } from './valuation.js';

const fmt = (num) => `$${(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * EXPORT 1: Official Certified Insurance Valuation & Underwriting Report
 * Dynamic Means & Method Box Sizing + Clean Condition Notation
 */
export function generateInsuranceCertificatePDF(inventory, totalValuation) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const certId = `CERT-VAL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*899+100)}`;

  // Header Banner
  doc.setFillColor(8, 11, 18);
  doc.rect(0, 0, 210, 48, 'F');
  doc.setFillColor(154, 204, 5);
  doc.rect(0, 46, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ACTION FIGURE VALUATION ESTIMATE', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`Market-Based Valuation Estimate  •  Report ID: ${certId}`, 14, 26);
  doc.text(`Appraisal Date: ${currentDate}  |  Total Inventory Count: ${inventory.length} Items`, 14, 32);

  // Total Valuation Box
  doc.setFillColor(18, 24, 38);
  doc.roundedRect(14, 52, 182, 30, 3, 3, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(156, 163, 175);
  doc.text('ESTIMATED TOTAL COLLECTION VALUE', 20, 61);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(154, 204, 5);
  doc.text(`${fmt(totalValuation)} USD`, 20, 74);

  // Calculate Dynamic Height for Means & Method Text Box
  const rawMethods = [
    '1. Data Sourcing: Secondary market sales data compiled from ActionFigure411 Market Index and TMNTToys Collector Archive. Prices reflect historical sold listings.',
    '2. Condition Weighting Matrix: Valuations apply packaging grade multipliers: Fully Intact (1.00x), Light Wear (0.85x), Damaged Box (0.65x), Loose Figure (0.40x).',
    '3. Methodology Note: This estimate is generated algorithmically from publicly available market data. It is not a certified appraisal and does not constitute professional valuation advice.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  const wrappedLines = [];
  rawMethods.forEach(line => {
    const lines = doc.splitTextToSize(line, 174);
    lines.forEach(l => wrappedLines.push(l));
  });

  const methodBoxHeight = 12 + (wrappedLines.length * 5); // header padding + line height

  // Render Background Box perfectly sized for wrapped text
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 88, 182, methodBoxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 88, 182, methodBoxHeight, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('VALUATION METHODOLOGY & DATA SOURCES', 18, 96);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  let curY = 102;
  wrappedLines.forEach(l => {
    doc.text(l, 18, curY);
    curY += 5;
  });

  // Table Data
  const columns = ['#', 'Franchise / Series', 'Item Name', 'Year', 'Condition Grade', 'Valuation Database Source', 'Appraised Value'];
  const rows = inventory.map((item, idx) => {
    const condConfig = CONDITION_GRADES[item.condition] || CONDITION_GRADES.intact;
    return [
      idx + 1,
      `${item.franchise || 'Collectibles'}\n${item.series || item.group || ''}`,
      item.name,
      item.year || 'N/A',
      condConfig.shortLabel || 'Fully Intact',
      item.valuation_source || 'ActionFigure411 Market Index',
      fmt(item.appraisedValue || 0)
    ];
  });

  const tableStartY = 88 + methodBoxHeight + 6;

  doc.autoTable({
    startY: tableStartY,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [18, 24, 38], textColor: [154, 204, 5], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 34 },
      2: { cellWidth: 44 },
      3: { cellWidth: 14 },
      4: { cellWidth: 24, fontStyle: 'bold' },
      5: { cellWidth: 38, fontStyle: 'italic', textColor: [71, 85, 105] },
      6: { cellWidth: 20, fontStyle: 'bold', textColor: [16, 185, 129] }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 12;
  if (finalY < 260) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('COLLECTION OWNER SIGNATURE', 14, finalY);
    doc.line(14, finalY + 12, 85, finalY + 12);
    doc.text('Owner / Authorized Representative', 14, finalY + 16);

    doc.text('REVIEWER ACKNOWLEDGMENT', 115, finalY);
    doc.line(115, finalY + 12, 190, finalY + 12);
    doc.text('Reviewer / Estate Representative', 115, finalY + 16);
  }

  const pageCount = doc.internal.getNumberOfPages();
  const disclaimerText = 'DISCLAIMER: This is an automated market estimate for informational purposes only. It does not constitute a certified appraisal. For insurance claims, consult a credentialed appraiser (ISA/ASA/AAA).';
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}  •  Action Figure Valuation System (${certId})`, 14, 282);
    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    const disclaimerLines = doc.splitTextToSize(disclaimerText, 182);
    disclaimerLines.forEach((line, idx) => {
      doc.text(line, 14, 286 + (idx * 3));
    });
  }

  doc.save(`Certified_Insurance_Appraisal_${certId}.pdf`);
}

/**
 * EXPORT 2: Dealer & Estate Resale Profit Report
 */
export function generateResaleProfitPDF(inventory) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currentDate = new Date().toLocaleDateString();

  doc.setFillColor(18, 12, 38);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 43, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DEALER & ESTATE RESALE PROFIT REPORT', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Acquisition Targets & Profit Margin Calculations  •  ${currentDate}`, 14, 28);

  let totalAppraised = 0;
  let totalTargetBuy = 0;
  let totalEstProfit = 0;

  const rows = inventory.map((item, idx) => {
    const val = item.appraisedValue || 0;
    const targetBuy = val * 0.50;
    const estProfit = val - targetBuy;

    totalAppraised += val;
    totalTargetBuy += targetBuy;
    totalEstProfit += estProfit;

    const condConfig = CONDITION_GRADES[item.condition] || CONDITION_GRADES.intact;

    return [
      idx + 1,
      item.name,
      condConfig.shortLabel || 'Fully Intact',
      item.valuation_source || 'ActionFigure411 Market Index',
      fmt(targetBuy),
      fmt(val),
      fmt(estProfit),
      '100%'
    ];
  });

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 52, 182, 25, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`TOTAL RETAIL VALUE: ${fmt(totalAppraised)}`, 20, 62);
  doc.text(`TARGET BUY COST (50%): ${fmt(totalTargetBuy)}`, 20, 70);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`ESTIMATED DEALER GROSS PROFIT: ${fmt(totalEstProfit)} (100% ROI)`, 105, 66);

  const columns = ['#', 'Item Name', 'Condition Grade', 'Database Source', 'Target Buy Price', 'Retail Val', 'Est Profit', 'ROI'];

  doc.autoTable({
    startY: 84,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [18, 12, 38], textColor: [245, 158, 11], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      4: { fontStyle: 'bold', textColor: [239, 68, 68] },
      5: { fontStyle: 'bold', textColor: [30, 41, 59] },
      6: { fontStyle: 'bold', textColor: [16, 185, 129] }
    }
  });

  const resaleDisclaimer = 'DISCLAIMER: Profit estimates are algorithmic projections based on historical market data and are not guarantees of actual resale value. Prices fluctuate based on market conditions.';
  const resalePageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= resalePageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    const dLines = doc.splitTextToSize(resaleDisclaimer, 182);
    dLines.forEach((line, idx) => {
      doc.text(line, 14, 286 + (idx * 3));
    });
  }

  doc.save(`Dealer_Resale_Profit_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}

/**
 * EXPORT 3: Printable Collector Display Shelf Cards / QR Tags
 */
export async function generateDisplayCardsPDF(inventory) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let cardX = 14;
  let cardY = 14;
  const cardW = 88;
  const cardH = 54;
  const gap = 8;

  for (let idx = 0; idx < inventory.length; idx++) {
    const item = inventory[idx];

    const qrContent = item.detail_url || item.upc || item.asin || `https://www.actionfigure411.com/?sku=${item.id}`;
    let qrDataUrl = null;
    try {
      qrDataUrl = await QRCode.toDataURL(qrContent, {
        margin: 1,
        width: 150,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (e) {
      console.error('QR code generation error:', e);
    }

    doc.setFillColor(18, 24, 38);
    doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'F');
    doc.setDrawColor(154, 204, 5);
    doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    
    const titleLines = doc.splitTextToSize(item.name, 50);
    let nameY = cardY + 8;
    titleLines.slice(0, 3).forEach((line) => {
      doc.text(line, cardX + 5, nameY);
      nameY += 4;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(`${item.franchise || 'Collectibles'} • ${item.year || '1988'}`, cardX + 5, nameY + 1);

    const displaySku = item.upc || item.asin || `#${item.id}`;
    doc.setFontSize(6.5);
    doc.setTextColor(154, 204, 5);
    doc.text(`SKU: ${displaySku}`, cardX + 5, nameY + 5);

    const condConfig = CONDITION_GRADES[item.condition] || CONDITION_GRADES.intact;
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Condition: ${condConfig.shortLabel || 'Fully Intact'}`, cardX + 5, nameY + 9);

    doc.setFillColor(25, 34, 51);
    doc.roundedRect(cardX + 5, cardY + cardH - 14, 46, 10, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text('APPRAISED VALUE', cardX + 8, cardY + cardH - 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(154, 204, 5);
    doc.text(fmt(item.appraisedValue || 0), cardX + 8, cardY + cardH - 6);

    if (qrDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cardX + 58, cardY + 8, 25, 25, 1, 1, 'F');
      doc.addImage(qrDataUrl, 'PNG', cardX + 59, cardY + 9, 23, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(156, 163, 175);
      doc.text('SCAN FOR SPECS', cardX + 59, cardY + 36);
    }

    cardX += cardW + gap;
    if (cardX > 150) {
      cardX = 14;
      cardY += cardH + gap;
      if (cardY > 230 && idx < inventory.length - 1) {
        doc.addPage();
        cardX = 14;
        cardY = 14;
      }
    }
  }

  doc.save(`Printable_Collector_Shelf_Cards_${new Date().toISOString().slice(0,10)}.pdf`);
}
