// Shared domain types for Support Nest.

export type Role = 'program_manager' | 'talent_acquisition' | 'employee_hr';

export interface User {
  id: string;
  organization_id: string;
  email: string;
  role: Role;
  full_name: string;
  created_at: string;
}

/** The shape stored inside the JWT and exposed on authenticated requests. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization_id: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  program_manager: 'Program Manager',
  talent_acquisition: 'Talent Acquisition / HR',
  employee_hr: 'Hired ND Talent',
};

/** Landing route for each role after login. */
export const ROLE_HOME: Record<Role, string> = {
  program_manager: '/dashboard',
  talent_acquisition: '/pipeline',
  employee_hr: '/allyship',
};

// ── Hiring domain ────────────────────────────────────────────────────────────

export type RequisitionStatus = 'open' | 'closed' | 'on_hold';
export type Neurodivergence = 'autistic' | 'adhd' | 'both' | 'other';
export type CandidateStatus =
  | 'pending_docs'
  | 'docs_submitted'
  | 'applied'
  | 'matched'
  | 'assessing'
  | 'interviewing'
  | 'offered'
  | 'rejected';
export type PhaseName =
  | 'apply'
  | 'match'
  | 'assess'
  | 'interview'
  | 'onboard'
  | 'thrive';

export const PHASE_ORDER: PhaseName[] = [
  'apply',
  'match',
  'assess',
  'interview',
  'onboard',
  'thrive',
];

export interface Requisition {
  id: string;
  organization_id: string;
  title: string;
  team: string;
  description: string | null;
  openings: number;
  status: RequisitionStatus;
  created_by: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  neurodivergence: Neurodivergence;
  years_experience: number;
  status: CandidateStatus;
  created_at: string;
}

export const NEURODIVERGENCE_LABELS: Record<Neurodivergence, string> = {
  autistic: 'Autistic',
  adhd: 'ADHD',
  both: 'Autistic + ADHD',
  other: 'Other',
};

/** PII-free profile produced by genetranslate. */
export interface NeuroProfile {
  neurodivergence: Neurodivergence;
  traits: string[];
  strengths: string[];
  accommodations: string[];
  workStyleProfile: {
    summary: string;
    communication: string;
    environment: string;
  };
  confidence: number;
}
