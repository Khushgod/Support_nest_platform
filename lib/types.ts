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
  email: string;
  role: Role;
  organization_id: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  program_manager: 'Program Manager',
  talent_acquisition: 'Talent Acquisition',
  employee_hr: 'Employee / HR',
};

/** Landing route for each role after login. */
export const ROLE_HOME: Record<Role, string> = {
  program_manager: '/dashboard',
  talent_acquisition: '/pipeline',
  employee_hr: '/allyship',
};
