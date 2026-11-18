export type SystemRole = 'employee' | 'dept_head' | 'hr' | 'manager' | 'admin';

export type AccessLevel = 'admin' | 'hr' | 'supervisor' | 'staff' | 'employee';

export function isHrDepartment(department?: string | null): boolean {
  const dept = String(department || '').trim();
  return /\bhr\b|hr\/ga|ฝ่ายบุคคล|ทรัพยากรบุคคล/i.test(dept);
}

export function isStaffPosition(position?: string | null): boolean {
  return /\b(?:staff|satff)\b/i.test(String(position || '').trim());
}

export function extractPrimaryDepartment(department?: string | null): string {
  const raw = String(department || '').trim();
  if (!raw) return '';
  return raw.split('(')[0].trim().toLowerCase();
}

export function samePrimaryDepartment(
  deptA?: string | null,
  deptB?: string | null
): boolean {
  const a = extractPrimaryDepartment(deptA);
  const b = extractPrimaryDepartment(deptB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(`${b} /`) || b.startsWith(`${a} /`)) return true;
  return false;
}

/**
 * Automatically maps corporate job positions & departments to system roles:
 * - Position containing "Administrator" -> 'admin'
 * - Position containing "Assistant Manager" / "Assistmanager" / "Asst. Manager" -> 'dept_head'
 * - Explicit admin / manager roles (e.g. Managing Director, Plant Manager, Supervisor) -> preserved
 * - HR / HR/GA officers (excluding Driver) -> 'hr'
 */
export function resolveRoleFromPosition(
  position?: string | null,
  fallbackRole?: string | null,
  department?: string | null
): SystemRole {
  const pos = String(position || '').trim();
  const normalized = String(fallbackRole || '')
    .trim()
    .toLowerCase();

  if (/administrator/i.test(pos) || normalized === 'admin') {
    return 'admin';
  }

  if (/assist(?:ant)?\s*\.?\s*manager|asst\.?\s*manager/i.test(pos)) {
    return 'dept_head';
  }

  if (
    isHrDepartment(department) &&
    !/\bdriver\b|\boperator\b|\btechnician\b/i.test(pos) &&
    (/\b(?:hr|general affairs|senior officer)\b/i.test(pos) ||
      normalized === 'hr')
  ) {
    return 'hr';
  }

  if (
    normalized === 'dept_head' ||
    normalized === 'hr' ||
    normalized === 'manager' ||
    normalized === 'employee'
  ) {
    return normalized as SystemRole;
  }

  return 'employee';
}

export function isItOfficerUser(
  user?: {
    uid?: string | null;
    employeeCode?: string | null;
    position?: string | null;
  } | null
): boolean {
  if (!user) return false;
  const empCode = String(user.employeeCode || '').trim().toUpperCase();
  const uid = String(user.uid || '').trim().toUpperCase();
  const pos = String(user.position || '').trim();
  return (
    empCode === 'SAT0417' ||
    uid === 'EMP:SAT0417' ||
    /\bIT\s*Officer\b/i.test(pos)
  );
}

export function isHrApproverUser(
  user?: {
    role?: string | null;
    position?: string | null;
    department?: string | null;
  } | null
): boolean {
  if (!user) return false;
  if (user.role === 'hr') return true;
  if (
    isHrDepartment(user.department) &&
    !/\bdriver\b|\boperator\b|\btechnician\b/i.test(String(user.position || '')) &&
    user.role !== 'dept_head' &&
    user.role !== 'manager'
  ) {
    return /\b(?:hr|general affairs|senior officer)\b/i.test(
      String(user.position || '')
    );
  }
  return false;
}

export function canAccessEmployeeDatabaseMenu(
  user?: {
    role?: string | null;
    position?: string | null;
    department?: string | null;
  } | null
): boolean {
  if (!user) return false;
  const pos = String(user.position || '').trim();
  const dept = String(user.department || '').trim();
  return (
    user.role === 'admin' ||
    /administrator/i.test(pos) ||
    /administrator/i.test(dept)
  );
}

export function getUserAccessLevel(user: {
  role?: string | null;
  position?: string | null;
  department?: string | null;
}): AccessLevel {
  if (user.role === 'admin') return 'admin';
  if (isHrApproverUser(user)) return 'hr';
  if (user.role === 'dept_head' || user.role === 'manager') return 'supervisor';
  if (isStaffPosition(user.position)) return 'staff';
  return 'employee';
}

export function canUserViewRequest(
  user: {
    uid: string;
    employeeCode?: string | null;
    role?: string | null;
    position?: string | null;
    department?: string | null;
  },
  req: {
    formType?: string | null;
    requesterUid: string;
    requesterDepartment: string;
    formData?: Record<string, unknown> | null;
  }
): boolean {
  if (req.requesterUid === user.uid) return true;

  const userEmpCode = String(user.employeeCode || '').trim().toUpperCase();
  const reqEmpCode = String(
    (req.formData as Record<string, unknown> | undefined)?.employeeCode || ''
  )
    .trim()
    .toUpperCase();
  if (userEmpCode && reqEmpCode && userEmpCode === reqEmpCode) {
    return true;
  }

  if (req.formType === 'F-GA-007' && isItOfficerUser(user)) {
    return true;
  }

  const level = getUserAccessLevel(user);
  if (level === 'admin' || level === 'hr') {
    return true;
  }
  if (level === 'supervisor' || level === 'staff') {
    return samePrimaryDepartment(user.department, req.requesterDepartment);
  }
  return false;
}
