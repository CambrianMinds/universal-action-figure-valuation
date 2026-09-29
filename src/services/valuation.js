export const CONDITION_GRADES = {
  intact: { 
    label: 'Fully Intact Packaging (100%)', 
    shortLabel: 'Fully Intact', 
    multiplier: 1.0, 
    badgeClass: 'badge-intact' 
  },
  shelf_wear: { 
    label: 'Light Shelf Wear (85%)', 
    shortLabel: 'Light Wear', 
    multiplier: 0.85, 
    badgeClass: 'badge-shelf_wear' 
  },
  damaged_box: { 
    label: 'Damaged Packaging (65%)', 
    shortLabel: 'Damaged Box', 
    multiplier: 0.65, 
    badgeClass: 'badge-damaged_box' 
  },
  loose: { 
    label: 'Loose Figure (40%)', 
    shortLabel: 'Loose Figure', 
    multiplier: 0.40, 
    badgeClass: 'badge-loose' 
  }
};

export function calculateValuation(basePrice, conditionKey) {
  const base = parseFloat(basePrice) || 0;
  const grade = CONDITION_GRADES[conditionKey] || CONDITION_GRADES.intact;
  const appraisedValue = base * grade.multiplier;

  return {
    basePrice: base,
    conditionKey: conditionKey,
    gradeLabel: grade.label,
    shortLabel: grade.shortLabel,
    multiplier: grade.multiplier,
    appraisedValue: Math.round(appraisedValue * 100) / 100
  };
}
