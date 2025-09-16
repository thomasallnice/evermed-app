const KNOWN_CODES = [
  { code: '6690-2', display: 'White blood cells', keywords: ['wbc', 'white blood'] },
  { code: '718-7', display: 'Hemoglobin', keywords: ['hemoglobin', 'hgb'] },
  { code: '777-3', display: 'Platelets', keywords: ['platelet'] },
  { code: '4544-3', display: 'Hematocrit', keywords: ['hematocrit', 'hct'] },
  { code: '2345-7', display: 'Glucose', keywords: ['glucose'] },
  { code: '4548-4', display: 'TSH', keywords: ['tsh'] },
  { code: '1558-6', display: 'Hemoglobin A1c', keywords: ['a1c', 'hba1c'] },
  { code: '2085-9', display: 'HDL', keywords: ['hdl'] },
  { code: '2089-1', display: 'LDL', keywords: ['ldl'] },
  { code: '2571-8', display: 'Triglycerides', keywords: ['triglycerides'] },
  { code: '1742-6', display: 'ALT', keywords: ['alt'] },
  { code: '1920-8', display: 'AST', keywords: ['ast'] },
  { code: '1988-5', display: 'CRP', keywords: ['crp', 'c-reactive'] },
  { code: '33914-3', display: 'eGFR', keywords: ['egfr'] },
  { code: '2160-0', display: 'Creatinine', keywords: ['creatinine'] },
  { code: '6301-6', display: 'INR', keywords: ['inr'] },
];

type ExtractOptions = {
  personId: string;
  documentId: string;
};

type ExtractedObservation = {
  personId: string;
  code: string;
  display: string;
  valueNum: number;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  effectiveAt?: Date;
  sourceDocId: string;
  sourceAnchor: string | null;
};

function normalizeNumber(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const normalized = raw.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Support YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY
  const isoMatch = trimmed.match(/^(20\d{2})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [_, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const euMatch = trimmed.match(/^(\d{1,2})[.](\d{1,2})[.](20\d{2})$/);
  if (euMatch) {
    const [_, day, month, year] = euMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function findMatcher(line: string) {
  const lower = line.toLowerCase();
  return KNOWN_CODES.find((item) => item.keywords.some((keyword) => lower.includes(keyword)));
}

function parseObservationLine(line: string, options: ExtractOptions): ExtractedObservation | null {
  const matcher = findMatcher(line);
  if (!matcher) return null;
  const numericMatches = Array.from(line.matchAll(/(-?\d+[.,]?\d*)/g));
  if (numericMatches.length === 0) return null;
  const value = normalizeNumber(numericMatches[0][1]);
  if (value === null) return null;

  let unit: string | null = null;
  const unitMatch = line.match(new RegExp(`${numericMatches[0][1]}\s*([A-Za-zµ/%]+(?:\/[A-Za-z]+)?)`));
  if (unitMatch && unitMatch[1]) {
    unit = unitMatch[1];
  }

  const refMatch = line.match(/\((\d+[.,]?\d*)\s*[-–]\s*(\d+[.,]?\d*)\)/);
  const refLow = refMatch ? normalizeNumber(refMatch[1]) : null;
  const refHigh = refMatch ? normalizeNumber(refMatch[2]) : null;

  const dateMatch = line.match(/(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[.]\d{1,2}[.]20\d{2})/);
  const effectiveAt = parseDate(dateMatch ? dateMatch[1] : null) || undefined;

  return {
    personId: options.personId,
    code: matcher.code,
    display: matcher.display,
    valueNum: value,
    unit,
    refLow,
    refHigh,
    effectiveAt,
    sourceDocId: options.documentId,
    sourceAnchor: null,
  };
}

export function extractObservationsFromText(text: string, options: ExtractOptions): ExtractedObservation[] {
  if (!text.trim()) return [];
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const extracted: ExtractedObservation[] = [];
  for (const line of lines) {
    const obs = parseObservationLine(line, options);
    if (obs && obs.effectiveAt) {
      extracted.push(obs);
    }
  }
  return extracted;
}

export type { ExtractedObservation };

