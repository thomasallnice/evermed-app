export type TrendCodeDefinition = {
  code: string;
  label: string;
  group: 'CBC' | 'CMP' | 'Endocrine' | 'Lipids' | 'Coagulation' | 'Inflammation' | 'Renal';
  aliases?: string[];
};

export const TREND_CODE_DEFINITIONS: TrendCodeDefinition[] = [
  { code: '6690-2', label: 'WBC', group: 'CBC', aliases: ['White blood cells'] },
  { code: '718-7', label: 'Hemoglobin', group: 'CBC' },
  { code: '777-3', label: 'Platelets', group: 'CBC' },
  { code: '4544-3', label: 'Hematocrit', group: 'CBC' },
  { code: '2345-7', label: 'Glucose', group: 'CMP' },
  { code: '6299-2', label: 'Sodium', group: 'CMP' },
  { code: '2823-3', label: 'Potassium', group: 'CMP' },
  { code: '2075-0', label: 'Chloride', group: 'CMP' },
  { code: '2028-9', label: 'CO2', group: 'CMP', aliases: ['Bicarbonate'] },
  { code: '3094-0', label: 'BUN', group: 'CMP' },
  { code: '2160-0', label: 'Creatinine', group: 'Renal' },
  { code: '33914-3', label: 'eGFR', group: 'Renal' },
  { code: '4548-4', label: 'TSH', group: 'Endocrine' },
  { code: '4549-2', label: 'Free T4', group: 'Endocrine' },
  { code: '1558-6', label: 'HbA1c', group: 'Endocrine', aliases: ['A1C'] },
  { code: '2085-9', label: 'HDL', group: 'Lipids' },
  { code: '2089-1', label: 'LDL', group: 'Lipids' },
  { code: '2571-8', label: 'Triglycerides', group: 'Lipids' },
  { code: '1742-6', label: 'ALT', group: 'Inflammation' },
  { code: '1920-8', label: 'AST', group: 'Inflammation' },
  { code: '1988-5', label: 'CRP', group: 'Inflammation', aliases: ['C-reactive protein'] },
  { code: '6301-6', label: 'INR', group: 'Coagulation' },
];

export function topTrendCodes(limit = 6): string[] {
  return TREND_CODE_DEFINITIONS.slice(0, limit).map((item) => item.code);
}

