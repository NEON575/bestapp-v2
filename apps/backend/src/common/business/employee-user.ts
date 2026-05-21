export type EmployeeUserRoleKey =
  | 'owner'
  | 'manager'
  | 'production'
  | 'accountant'
  | 'warehouse'
  | 'other';

const MANAGER_ROLE_KEYS = new Set(['super_admin', 'owner', 'manager']);
const EMPLOYEE_USER_ROLE_MAP: Record<string, string[]> = {
  owner: ['owner'],
  manager: ['manager'],
  production: ['production'],
  accountant: ['accountant'],
  warehouse: ['warehouse']
};

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function normalizeEmployeeRoleKey(roleKey?: string | null): EmployeeUserRoleKey {
  const normalized = roleKey?.trim().toLowerCase();
  if (normalized === 'owner') return 'owner';
  if (normalized === 'manager') return 'manager';
  if (normalized === 'production') return 'production';
  if (normalized === 'accountant') return 'accountant';
  if (normalized === 'warehouse') return 'warehouse';
  return 'other';
}

export function mapEmployeeRoleToUserRoles(roleKey?: string | null) {
  return EMPLOYEE_USER_ROLE_MAP[normalizeEmployeeRoleKey(roleKey)] ?? [];
}

export function employeeShouldSyncToUser(roleKey?: string | null) {
  return mapEmployeeRoleToUserRoles(roleKey).length > 0;
}

export function employeeAppearsInManagers(roleKey?: string | null) {
  const normalized = normalizeEmployeeRoleKey(roleKey);
  return normalized === 'owner' || normalized === 'manager';
}

export function roleSetHasManagerAccess(roles?: string[] | null) {
  return (roles ?? []).some((role) => MANAGER_ROLE_KEYS.has(role));
}

export function buildEmployeePlaceholderEmail(fullName: string, employeeId: string) {
  const slug = slugify(fullName) || 'employee';
  return `${slug}.${employeeId.slice(0, 8)}@bestapp.local`;
}
