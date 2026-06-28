import Papa from 'papaparse';

export interface CsvRow {
  name: string;
  email: string;
  applied_date?: string;
  resume_link?: string;
}

export interface CsvError {
  row: number;
  field: string;
  value: string;
  reason: string;
}

export interface CsvValidationResult {
  valid: CsvRow[];
  errors: CsvError[];
  totalRows: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse a LinkedIn-style applicant CSV. Required headers: name, email.
 * Optional: applied_date, resume_link. Returns valid rows + per-row errors.
 */
export function parseAndValidateCsv(csvText: string): CsvValidationResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const valid: CsvRow[] = [];
  const errors: CsvError[] = [];
  const data = result.data;

  data.forEach((row, index) => {
    const rowNum = index + 2; // header occupies row 1
    const name = (row.name ?? '').trim();
    const email = (row.email ?? '').trim();

    if (!name) {
      errors.push({ row: rowNum, field: 'name', value: name, reason: 'Name is required' });
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push({ row: rowNum, field: 'email', value: email, reason: 'Invalid email format' });
      return;
    }

    valid.push({
      name,
      email: email.toLowerCase(),
      applied_date: row.applied_date?.trim() || undefined,
      resume_link: row.resume_link?.trim() || undefined,
    });
  });

  return { valid, errors, totalRows: data.length };
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
