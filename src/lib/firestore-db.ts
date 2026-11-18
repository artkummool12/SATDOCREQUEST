import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { CORPORATE_EMPLOYEES } from './corporate-employees';
import {
  canUserViewRequest,
  getUserAccessLevel,
  isHrApproverUser,
  isItOfficerUser,
  resolveRoleFromPosition,
} from './roles';
import type {
  AppUser,
  ApprovalLog,
  BellNotificationItem,
  DeliveryMethod,
  DocumentRequest,
  EmailNotification,
  EmployeeDirectoryRecord,
  FormCode,
  RequestStatus,
  UserRole,
} from '../types/document';

const FORM_TITLE_TH: Record<string, string> = {
  'F-HR-011': 'ใบไม่ได้สแกนนิ้ว',
  'F-HR-012': 'ใบขออนุญาตออกนอกบริเวณบริษัท',
  'F-HR-029': 'แบบขอหนังสือรับรอง',
  'F-HR-032': 'แบบฟอร์มขออนุมัติค่าพาหนะ / ค่าน้ำมัน',
  'F-HR-036': 'แบบฟอร์มการขอใช้รถบริษัทฯ',
  'F-HR-051': 'แบบฟอร์มการเบิกสวัสดิการ กรณีจดทะเบียนสมรส',
  'F-GA-007': 'ใบร้องขอดำเนินการเกี่ยวข้องกับสารสนเทศ (IT)',
  'ADV-PCV': 'ใบเบิกเงินทดลอง / ใบสั่งจ่ายเงินสดย่อย',
};

const STATUS_TH_SHORT: Record<string, string> = {
  pending_dept_head: 'รอหัวหน้าแผนกอนุมัติ',
  pending_hr: 'รอฝ่ายบุคคล/บัญชีตรวจสอบ',
  pending_manager: 'รอผู้บริหารอนุมัติขั้นสุดท้าย',
  approved: 'อนุมัติแล้ว (รอยืนยันรับเอกสาร)',
  completed: 'รับเอกสารเรียบร้อยแล้ว',
  rejected: 'ไม่อนุมัติ / ส่งกลับแก้ไข',
};

function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as T;
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item)) as T;
  }
  if (val && typeof val === 'object' && !(val instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return val;
}

function clampString(val: unknown, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function validateSignatureSize(sig?: string | null): string | null {
  if (!sig) return null;
  if (sig.length > 500000) {
    throw new Error('ขนาดไฟล์ลายเซ็นใหญ่เกิน 500KB กรุณาใช้ไฟล์ที่มีขนาดเล็กลง');
  }
  return sig;
}

function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

function generateDocNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DOC-${y}${m}${d}-${rand}`;
}

let seedPromise: Promise<void> | null = null;

export async function ensureInitialEmployeesSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const snap = await getDocs(collection(db, 'employees'));
        const existingIds = new Set(snap.docs.map((d) => d.id));
        const missing = CORPORATE_EMPLOYEES.filter(
          (emp) => !existingIds.has(emp.empNo)
        );

        if (missing.length > 0) {
          const nowIso = new Date().toISOString();
          const chunkSize = 20;
          for (let i = 0; i < missing.length; i += chunkSize) {
            const chunk = missing.slice(i, i + chunkSize);
            await Promise.all(
              chunk.map((emp) => {
                const deptFull = emp.division
                  ? `${emp.department} (${emp.division})`
                  : emp.department;
                const role = resolveRoleFromPosition(
                  emp.position,
                  emp.role,
                  deptFull
                );
                return setDoc(doc(db, 'employees', emp.empNo), {
                  empNo: emp.empNo,
                  nameTh: clampString(emp.nameTh, 200),
                  department: clampString(emp.department, 120),
                  division: clampString(emp.division, 120),
                  position: clampString(emp.position, 120),
                  role,
                  createdAt: nowIso,
                });
              })
            );
          }
        }
      } catch (error) {
        seedPromise = null;
        handleFirestoreError(error, OperationType.WRITE, 'employees');
      }
    })();
  }
  return seedPromise;
}

export async function syncCorporateDirectoryToFirestore(): Promise<number> {
  const res = await upsertEmployees(CORPORATE_EMPLOYEES);
  seedPromise = Promise.resolve();
  return res.importedCount;
}

export interface EmployeeInput {
  empNo: string;
  nameTh: string;
  department?: string;
  division?: string;
  position?: string;
  role?: string;
}

export async function listEmployees(): Promise<EmployeeDirectoryRecord[]> {
  await ensureInitialEmployeesSeeded();
  try {
    const snap = await getDocs(collection(db, 'employees'));
    const list: EmployeeDirectoryRecord[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        empNo: String(data.empNo || d.id),
        nameTh: String(data.nameTh || ''),
        department: String(data.department || ''),
        division: String(data.division || ''),
        position: String(data.position || ''),
        role: String(data.role || 'employee'),
        createdAt: String(data.createdAt || ''),
      };
    });
    return list.sort((a, b) => a.empNo.localeCompare(b.empNo));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'employees');
  }
}

export async function findEmployeeByCode(
  empNo: string
): Promise<EmployeeDirectoryRecord | null> {
  await ensureInitialEmployeesSeeded();
  const code = empNo.trim().toUpperCase().replace(/[^A-Z0-9_:-]/g, '');
  if (!code) return null;

  try {
    const ref = doc(db, 'employees', code);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        empNo: String(data.empNo || snap.id),
        nameTh: String(data.nameTh || ''),
        department: String(data.department || ''),
        division: String(data.division || ''),
        position: String(data.position || ''),
        role: String(data.role || 'employee'),
        createdAt: String(data.createdAt || ''),
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `employees/${code}`);
  }
}

export async function upsertEmployees(
  items: EmployeeInput[]
): Promise<{ importedCount: number; records: EmployeeDirectoryRecord[] }> {
  const cleaned = items
    .map((item) => {
      const empNo = String(item.empNo || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_:-]/g, '')
        .slice(0, 32);
      const nameTh = clampString(item.nameTh, 200);
      const department = clampString(item.department, 120);
      const division = clampString(item.division, 120);
      const position = clampString(item.position, 120);
      const deptFull = division ? `${department} (${division})` : department;
      const role = resolveRoleFromPosition(position, item.role, deptFull);
      return {
        empNo,
        nameTh,
        department,
        division,
        position,
        role,
      };
    })
    .filter((item) => item.empNo.length > 0 && item.nameTh.length > 0);

  if (cleaned.length === 0) {
    return { importedCount: 0, records: [] };
  }

  try {
    const existingSnap = await getDocs(collection(db, 'employees'));
    const existingCreatedMap = new Map<string, string>();
    existingSnap.forEach((d) => {
      const c = d.data()?.createdAt;
      if (typeof c === 'string' && c) {
        existingCreatedMap.set(d.id, c);
      }
    });

    const nowIso = new Date().toISOString();
    const records: EmployeeDirectoryRecord[] = [];

    for (const row of cleaned) {
      const createdAt = existingCreatedMap.get(row.empNo) || nowIso;
      const payload = {
        empNo: row.empNo,
        nameTh: row.nameTh,
        department: row.department,
        division: row.division,
        position: row.position,
        role: row.role,
        createdAt,
      };
      await setDoc(doc(db, 'employees', row.empNo), payload);
      records.push({ id: row.empNo, ...payload });
    }

    return { importedCount: records.length, records };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'employees');
  }
}

export async function deleteEmployee(empNo: string): Promise<void> {
  const safeId = empNo.trim().toUpperCase();
  try {
    await deleteDoc(doc(db, 'employees', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `employees/${safeId}`);
  }
}

function docToAppUser(data: Record<string, any>, fallbackUid: string): AppUser {
  return {
    uid: String(data.uid || fallbackUid),
    name: String(data.name || ''),
    email: String(data.email || ''),
    employeeCode: String(data.employeeCode || ''),
    position: String(data.position || ''),
    department: String(data.department || ''),
    role: (data.role as UserRole) || 'employee',
    signatureUrl: data.signatureUrl ?? null,
    createdAt: String(data.createdAt || ''),
  };
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return docToAppUser(snap.data(), snap.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function loginOrSyncEmployeeUser(
  emp: EmployeeDirectoryRecord
): Promise<AppUser> {
  const normalizedCode = emp.empNo.trim().toUpperCase();
  const empUid = `emp:${normalizedCode}`;
  const deptLabel = emp.division
    ? `${emp.department} (${emp.division})`
    : emp.department || 'ทั่วไป';
  const resolvedRole = resolveRoleFromPosition(
    emp.position,
    emp.role,
    deptLabel
  );

  try {
    const userRef = doc(db, 'users', empUid);
    const existingSnap = await getDoc(userRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;
    const nowIso = new Date().toISOString();

    const payload: Record<string, any> = {
      uid: empUid,
      name: clampString(emp.nameTh, 200),
      email: clampString(
        existingData?.email ||
          `${normalizedCode.toLowerCase()}@suminoaapico.local`,
        200
      ),
      employeeCode: clampString(normalizedCode, 32),
      position: clampString(emp.position, 120),
      department: clampString(deptLabel, 120),
      role: resolvedRole,
      createdAt: String(existingData?.createdAt || nowIso),
    };
    if (existingData?.signatureUrl) {
      payload.signatureUrl = existingData.signatureUrl;
    }

    await setDoc(userRef, payload);
    return docToAppUser(payload, empUid);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${empUid}`);
  }
}

export async function getOrCreateFirebaseUser(
  fbUser: FirebaseUser
): Promise<AppUser> {
  const uid = fbUser.uid;
  const email = clampString(fbUser.email || '', 200);
  const displayName = clampString(
    fbUser.displayName || email.split('@')[0] || 'พนักงาน',
    200
  );
  const isAdminEmail =
    email.toLowerCase() === 'it.sumino.apico@gmail.com' ||
    email.toLowerCase() === 'admin.it@suminoaapico.com' ||
    /^admin(\.|_|-|$)/i.test(email.split('@')[0] || '');

  try {
    const userRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(userRef);
    const nowIso = new Date().toISOString();

    if (existingSnap.exists()) {
      const current = existingSnap.data();
      const posRole = resolveRoleFromPosition(
        current.position,
        current.role,
        current.department
      );
      const nextRole: UserRole =
        posRole === 'admin' || isAdminEmail ? 'admin' : posRole;

      const payload: Record<string, any> = {
        uid,
        name: clampString(current.name || displayName, 200),
        email,
        employeeCode: clampString(current.employeeCode || '', 32),
        position: clampString(current.position || 'พนักงาน', 120),
        department: clampString(
          current.department || 'ฝ่ายทรัพยากรบุคคลและธุรการ',
          120
        ),
        role:
          posRole === 'admin' ||
          posRole === 'dept_head' ||
          posRole === 'hr' ||
          isAdminEmail
            ? nextRole
            : (current.role as UserRole) || 'employee',
        createdAt: String(current.createdAt || nowIso),
      };
      if (current.signatureUrl) {
        payload.signatureUrl = current.signatureUrl;
      }

      await setDoc(userRef, payload);
      return docToAppUser(payload, uid);
    }

    const usersSnap = await getDocs(collection(db, 'users'));
    const isFirstUser = usersSnap.empty;
    const defaultRole: UserRole =
      isFirstUser || isAdminEmail ? 'admin' : 'employee';

    const payload = {
      uid,
      name: displayName,
      email,
      employeeCode: '',
      position: isFirstUser || isAdminEmail ? 'Administrator' : 'พนักงาน',
      department: 'ฝ่ายทรัพยากรบุคคลและธุรการ',
      role: defaultRole,
      createdAt: nowIso,
    };

    await setDoc(userRef, payload);
    return docToAppUser(payload, uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function updateUserProfile(
  uid: string,
  data: {
    name?: string;
    employeeCode?: string;
    position?: string;
    department?: string;
    signatureUrl?: string | null;
    role?: UserRole;
  }
): Promise<AppUser> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งาน');
    }
    const existing = snap.data();

    let nextName =
      typeof data.name === 'string' && data.name.trim()
        ? clampString(data.name, 200)
        : String(existing.name || 'พนักงาน');
    let nextCode =
      typeof data.employeeCode === 'string'
        ? data.employeeCode.trim().toUpperCase().slice(0, 32)
        : String(existing.employeeCode || '');
    let nextPosition =
      typeof data.position === 'string'
        ? clampString(data.position, 120)
        : String(existing.position || '');
    let nextDepartment =
      typeof data.department === 'string' && data.department.trim()
        ? clampString(data.department, 120)
        : String(existing.department || '');
    let nextRole: UserRole = (existing.role as UserRole) || 'employee';

    if (typeof data.employeeCode === 'string' && nextCode) {
      const emp = await findEmployeeByCode(nextCode);
      if (emp) {
        const deptLabel = emp.division
          ? `${emp.department} (${emp.division})`
          : emp.department;
        if (!data.name?.trim()) nextName = clampString(emp.nameTh, 200);
        if (!data.position?.trim())
          nextPosition = clampString(emp.position, 120);
        if (!data.department?.trim())
          nextDepartment = clampString(deptLabel, 120);
        if (!data.role) {
          nextRole = resolveRoleFromPosition(emp.position, emp.role, deptLabel);
        }
      }
    }

    if (data.position || data.department) {
      const posRole = resolveRoleFromPosition(
        nextPosition,
        undefined,
        nextDepartment
      );
      if (posRole === 'admin') {
        nextRole = 'admin';
      } else if ((posRole === 'dept_head' || posRole === 'hr') && !data.role) {
        nextRole = posRole;
      }
    }

    if (data.role) {
      nextRole = data.role;
    }

    const nextSig =
      data.signatureUrl !== undefined
        ? validateSignatureSize(data.signatureUrl)
        : (existing.signatureUrl ?? null);

    const payload: Record<string, any> = {
      uid: String(existing.uid || uid),
      name: nextName,
      email: clampString(existing.email || '', 200),
      employeeCode: nextCode,
      position: nextPosition,
      department: nextDepartment,
      role: nextRole,
      createdAt: String(existing.createdAt || new Date().toISOString()),
    };
    if (nextSig) {
      payload.signatureUrl = nextSig;
    } else {
      payload.signatureUrl = null;
    }

    await setDoc(userRef, payload);
    return docToAppUser(payload, uid);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ขนาดไฟล์')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function getAllUsers(): Promise<AppUser[]> {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToAppUser(d.data(), d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

function docToRequest(id: string, data: Record<string, any>): DocumentRequest {
  return {
    id,
    docNumber: String(data.docNumber || ''),
    formType: data.formType as FormCode,
    requesterUid: String(data.requesterUid || ''),
    requesterEmployeeCode: data.requesterEmployeeCode ?? null,
    requesterName: String(data.requesterName || ''),
    requesterEmail: String(data.requesterEmail || ''),
    requesterDepartment: String(data.requesterDepartment || ''),
    formData: (data.formData as Record<string, any>) || {},
    deliveryMethod: (data.deliveryMethod as DeliveryMethod) || 'pdf',
    status: (data.status as RequestStatus) || 'pending_dept_head',
    requesterSignatureUrl: data.requesterSignatureUrl ?? null,
    deptHeadUid: data.deptHeadUid ?? null,
    deptHeadName: data.deptHeadName ?? null,
    deptHeadSignatureUrl: data.deptHeadSignatureUrl ?? null,
    deptHeadApprovedAt: data.deptHeadApprovedAt ?? null,
    hrUid: data.hrUid ?? null,
    hrName: data.hrName ?? null,
    hrSignatureUrl: data.hrSignatureUrl ?? null,
    hrApprovedAt: data.hrApprovedAt ?? null,
    managerUid: data.managerUid ?? null,
    managerName: data.managerName ?? null,
    managerSignatureUrl: data.managerSignatureUrl ?? null,
    managerApprovedAt: data.managerApprovedAt ?? null,
    receiptSignatureUrl: data.receiptSignatureUrl ?? null,
    receivedAt: data.receivedAt ?? null,
    rejectedBy: data.rejectedBy ?? null,
    rejectedReason: data.rejectedReason ?? null,
    rejectedAt: data.rejectedAt ?? null,
    itComment: data.itComment ?? null,
    itCommentBy: data.itCommentBy ?? null,
    itCommentAt: data.itCommentAt ?? null,
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
  };
}

export function subscribeRequestsForUser(
  user: AppUser,
  onData: (requests: DocumentRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const visible = snapshot.docs
        .map((d) => docToRequest(d.id, d.data()))
        .filter((req) => canUserViewRequest(user, req));
      onData(visible);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'requests');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function listRequestsForUser(
  user: AppUser
): Promise<DocumentRequest[]> {
  try {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => docToRequest(d.id, d.data()))
      .filter((req) => canUserViewRequest(user, req));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'requests');
  }
}

export async function getRequestDetail(
  id: string,
  user: AppUser
): Promise<{
  request: DocumentRequest;
  logs: ApprovalLog[];
  notifications: EmailNotification[];
} | null> {
  try {
    const reqSnap = await getDoc(doc(db, 'requests', id));
    if (!reqSnap.exists()) {
      return null;
    }

    const reqDoc = docToRequest(reqSnap.id, reqSnap.data());
    if (!canUserViewRequest(user, reqDoc)) {
      throw new Error('ไม่มีสิทธิ์เข้าถึงเอกสารนี้');
    }

    const logsQ = query(
      collection(db, 'requests', id, 'logs'),
      orderBy('createdAt', 'asc')
    );
    const logsSnap = await getDocs(logsQ);
    const logs: ApprovalLog[] = logsSnap.docs.map((d) => {
      const l = d.data();
      return {
        id: d.id,
        requestId: String(l.requestId || id),
        actorUid: String(l.actorUid || ''),
        actorName: String(l.actorName || ''),
        actorRole: String(l.actorRole || ''),
        action: String(l.action || ''),
        comment: l.comment ?? null,
        signatureUrl: l.signatureUrl ?? null,
        createdAt: String(l.createdAt || ''),
      };
    });

    const notifQ = query(
      collection(db, 'email_notifications'),
      where('requestId', '==', id)
    );
    const notifSnap = await getDocs(notifQ);
    const notifications: EmailNotification[] = notifSnap.docs
      .map((d) => {
        const n = d.data();
        return {
          id: d.id,
          requestId: String(n.requestId || id),
          docNumber: n.docNumber ?? null,
          requesterUid: n.requesterUid ?? null,
          requesterDepartment: n.requesterDepartment ?? null,
          recipientEmail: n.recipientEmail ?? null,
          subject: String(n.subject || ''),
          body: String(n.body || ''),
          status: String(n.status || 'sent'),
          sentAt: String(n.sentAt || ''),
        };
      })
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));

    return {
      request: reqDoc,
      logs,
      notifications,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'ไม่มีสิทธิ์เข้าถึงเอกสารนี้') {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `requests/${id}`);
  }
}

export async function createDocumentRequest(
  user: AppUser,
  payload: {
    formType: FormCode;
    formData: Record<string, any>;
    deliveryMethod: DeliveryMethod;
    signatureUrl: string;
  }
): Promise<DocumentRequest> {
  const sigUrl = validateSignatureSize(payload.signatureUrl);
  if (!sigUrl) {
    throw new Error('กรุณาลงลายมือชื่ออิเล็กทรอนิกส์ก่อนส่งคำร้อง');
  }

  const requestId = createId('req');
  const docNumber = generateDocNumber();
  const nowIso = new Date().toISOString();

  const resolvedName =
    typeof payload.formData.fullName === 'string' &&
    payload.formData.fullName.trim()
      ? clampString(payload.formData.fullName, 200)
      : clampString(user.name, 200);
  const resolvedDept =
    typeof payload.formData.department === 'string' &&
    payload.formData.department.trim()
      ? clampString(payload.formData.department, 120)
      : clampString(user.department, 120);
  const resolvedEmpCode =
    typeof payload.formData.employeeCode === 'string' &&
    payload.formData.employeeCode.trim()
      ? payload.formData.employeeCode.trim().toUpperCase().slice(0, 32)
      : clampString(user.employeeCode, 32);

  const sanitizedFormData = sanitizeForFirestore({
    ...payload.formData,
    employeeCode: resolvedEmpCode,
  });

  const reqDocData = {
    docNumber,
    formType: payload.formType,
    requesterUid: clampString(user.uid, 128),
    requesterEmployeeCode: resolvedEmpCode || null,
    requesterName: resolvedName,
    requesterEmail: clampString(user.email, 200),
    requesterDepartment: resolvedDept,
    formData: sanitizedFormData,
    deliveryMethod: payload.deliveryMethod || 'pdf',
    status: 'pending_dept_head' as const,
    requesterSignatureUrl: sigUrl,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await setDoc(doc(db, 'requests', requestId), reqDocData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `requests/${requestId}`);
  }

  const logId = createId('log');
  const logData = {
    requestId,
    actorUid: clampString(user.uid, 128),
    actorName: clampString(user.name, 200),
    actorRole: clampString(user.role, 40),
    action: 'submitted',
    comment: 'พนักงานยื่นคำร้องเอกสารเข้าสู่ระบบ',
    signatureUrl: sigUrl,
    createdAt: nowIso,
  };

  try {
    await setDoc(doc(db, 'requests', requestId, 'logs', logId), logData);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `requests/${requestId}/logs/${logId}`
    );
  }

  return docToRequest(requestId, reqDocData);
}

export async function processApprovalAction(
  id: string,
  actor: AppUser,
  payload: {
    action: 'approve' | 'reject' | 'receive';
    comment?: string;
    signatureUrl?: string;
  }
): Promise<void> {
  const reqRef = doc(db, 'requests', id);
  let current: DocumentRequest;
  try {
    const snap = await getDoc(reqRef);
    if (!snap.exists()) {
      throw new Error('ไม่พบเอกสารคำร้อง');
    }
    current = docToRequest(snap.id, snap.data());
  } catch (error) {
    if (error instanceof Error && error.message === 'ไม่พบเอกสารคำร้อง') {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `requests/${id}`);
  }

  const nowIso = new Date().toISOString();
  const formTitle = FORM_TITLE_TH[current.formType] || current.formType;
  const actorIsHr = isHrApproverUser(actor);
  const actorIsIt = isItOfficerUser(actor);
  const actorIsAdmin = actor.role === 'admin';
  const isItRequest = current.formType === 'F-GA-007';
  const isFingerScanRequest = current.formType === 'F-HR-011';
  const canActItStep = isItRequest && actorIsIt;
  const inActorScope =
    actorIsAdmin ||
    actorIsHr ||
    canActItStep ||
    canUserViewRequest(actor, current);

  const actorSig = validateSignatureSize(
    payload.signatureUrl || actor.signatureUrl || null
  );

  let patch: Record<string, any>;
  let logAction: string;
  let logRole: string = actor.role;
  let logComment: string;
  let notificationToCreate: Record<string, any> | null = null;

  if (payload.action === 'receive') {
    if (current.status !== 'approved') {
      throw new Error('สถานะปัจจุบันของเอกสารไม่สามารถยืนยันรับเอกสารได้');
    }
    if (current.requesterUid !== actor.uid && !actorIsAdmin) {
      throw new Error('เฉพาะผู้ยื่นคำร้องหรือผู้ดูแลระบบเท่านั้นที่ยืนยันรับเอกสารได้');
    }
    const receiptSig = validateSignatureSize(
      payload.signatureUrl ||
        actor.signatureUrl ||
        current.requesterSignatureUrl ||
        null
    );
    patch = {
      status: 'completed',
      receiptSignatureUrl: receiptSig,
      receivedAt: nowIso,
      updatedAt: nowIso,
    };
    logAction = 'received';
    logComment = clampString(
      payload.comment || 'พนักงานลงนามยืนยันรับเอกสารเรียบร้อยแล้ว',
      1000
    );
  } else if (payload.action === 'reject') {
    const canReject =
      actorIsAdmin ||
      (current.status === 'pending_dept_head' &&
        actor.role === 'dept_head' &&
        inActorScope) ||
      (current.status === 'pending_hr' && (actorIsHr || canActItStep)) ||
      (current.status === 'pending_manager' &&
        actor.role === 'manager' &&
        inActorScope);

    if (!canReject) {
      throw new Error('บทบาทของคุณไม่มีสิทธิ์ปฏิเสธเอกสารในขั้นตอนนี้');
    }

    const reason = clampString(
      payload.comment?.trim() || 'ไม่ผ่านเกณฑ์การพิจารณา',
      1000
    );
    patch = {
      status: 'rejected',
      rejectedBy: clampString(actor.name, 200),
      rejectedReason: reason,
      rejectedAt: nowIso,
      updatedAt: nowIso,
      ...(isItRequest && (actorIsIt || actorIsHr || actorIsAdmin)
        ? {
            itComment: reason,
            itCommentBy: clampString(actor.name, 200),
            itCommentAt: nowIso,
          }
        : {}),
    };
    logAction = 'rejected';
    logComment = reason;
    notificationToCreate = {
      requestId: id,
      docNumber: clampString(current.docNumber, 40),
      requesterUid: clampString(current.requesterUid, 128),
      requesterDepartment: clampString(current.requesterDepartment, 120),
      recipientEmail: clampString(current.requesterEmail, 200),
      subject: clampString(
        `[DocFlow TH] แจ้งผลการพิจารณา: ${current.docNumber} (${formTitle}) - ไม่อนุมัติ`,
        300
      ),
      body: clampString(
        `เรียน คุณ${current.requesterName}\n\nเอกสารเลขที่ ${current.docNumber} (${formTitle}) ไม่ได้รับการอนุมัติจาก ${actor.name}\nเหตุผล: ${reason}\n\nกรุณาตรวจสอบรายละเอียดในระบบคำร้องเอกสาร`,
        5000
      ),
      status: 'sent',
      sentAt: nowIso,
    };
  } else if (current.status === 'pending_dept_head') {
    if (!(actorIsAdmin || (actor.role === 'dept_head' && inActorScope))) {
      throw new Error('บทบาทของคุณไม่มีสิทธิ์อนุมัติในขั้นตอนหัวหน้าแผนก');
    }
    if (isFingerScanRequest) {
      patch = {
        status: 'approved',
        deptHeadUid: clampString(actor.uid, 128),
        deptHeadName: clampString(actor.name, 200),
        deptHeadSignatureUrl: actorSig,
        deptHeadApprovedAt: nowIso,
        updatedAt: nowIso,
      };
      logRole = 'dept_head';
      logAction = 'approved_dept_head';
      logComment = clampString(
        payload.comment ||
          'หัวหน้าแผนกอนุมัติขั้นสุดท้ายเรียบร้อยแล้ว (ใบไม่ได้สแกนนิ้ว 2 ขั้นตอน)',
        1000
      );
      notificationToCreate = {
        requestId: id,
        docNumber: clampString(current.docNumber, 40),
        requesterUid: clampString(current.requesterUid, 128),
        requesterDepartment: clampString(current.requesterDepartment, 120),
        recipientEmail: clampString(current.requesterEmail, 200),
        subject: clampString(
          `[DocFlow TH] อนุมัติเรียบร้อยแล้ว: ${current.docNumber} (${formTitle})`,
          300
        ),
        body: clampString(
          `เรียน คุณ${current.requesterName}\n\nคำร้องเอกสารเลขที่ ${current.docNumber} (${formTitle}) ได้รับการอนุมัติจากหัวหน้าแผนก (${actor.name}) ครบทั้ง 2 ขั้นตอนเรียบร้อยแล้ว (พนักงานผู้ร้องขอ -> หัวหน้าแผนก)`,
          5000
        ),
        status: 'sent',
        sentAt: nowIso,
      };
    } else {
      patch = {
        status: 'pending_hr',
        deptHeadUid: clampString(actor.uid, 128),
        deptHeadName: clampString(actor.name, 200),
        deptHeadSignatureUrl: actorSig,
        deptHeadApprovedAt: nowIso,
        updatedAt: nowIso,
      };
      logRole = 'dept_head';
      logAction = 'approved_dept_head';
      logComment = clampString(
        payload.comment ||
          (isItRequest
            ? 'หัวหน้าแผนกอนุมัติคำร้อง ส่งต่อฝ่ายบุคคล / เจ้าหน้าที่ IT (SAT0417)'
            : 'หัวหน้าแผนกอนุมัติคำร้อง ส่งต่อฝ่ายบุคคล/บัญชี'),
        1000
      );
    }
  } else if (current.status === 'pending_hr') {
    if (!(actorIsAdmin || actorIsHr || canActItStep)) {
      throw new Error(
        isItRequest
          ? 'เฉพาะฝ่ายบุคคล / เจ้าหน้าที่ IT (SAT0417) เท่านั้นที่อนุมัติในขั้นตอนนี้ได้'
          : 'บทบาทของคุณไม่มีสิทธิ์อนุมัติในขั้นตอนฝ่ายบุคคล/บัญชี'
      );
    }

    if (isItRequest) {
      const trimmedComment = payload.comment?.trim();
      patch = {
        status: 'approved',
        hrUid: clampString(actor.uid, 128),
        hrName: clampString(actor.name, 200),
        hrSignatureUrl: actorSig,
        hrApprovedAt: nowIso,
        updatedAt: nowIso,
        ...(trimmedComment
          ? {
              itComment: clampString(trimmedComment, 1000),
              itCommentBy: clampString(actor.name, 200),
              itCommentAt: nowIso,
            }
          : {}),
      };
      logRole =
        actorIsIt && !actorIsHr
          ? 'เจ้าหน้าที่ IT (SAT0417)'
          : actorIsAdmin
          ? 'admin'
          : 'hr';
      logAction = 'approved_hr';
      logComment = clampString(
        trimmedComment ||
          'ฝ่ายบุคคล / เจ้าหน้าที่ IT (SAT0417) อนุมัติขั้นสุดท้ายเรียบร้อยแล้ว',
        1000
      );
      notificationToCreate = {
        requestId: id,
        docNumber: clampString(current.docNumber, 40),
        requesterUid: clampString(current.requesterUid, 128),
        requesterDepartment: clampString(current.requesterDepartment, 120),
        recipientEmail: clampString(current.requesterEmail, 200),
        subject: clampString(
          `[DocFlow TH] เอกสารสารสนเทศอนุมัติเรียบร้อยแล้ว: ${current.docNumber} (${formTitle})`,
          300
        ),
        body: clampString(
          `เรียน คุณ${current.requesterName}\n\nคำร้องเอกสารสารสนเทศเลขที่ ${current.docNumber} (${formTitle}) ได้รับการอนุมัติครบทั้ง 3 ขั้นตอนแล้ว (พนักงาน -> หัวหน้าแผนก -> ฝ่ายบุคคล / เจ้าหน้าที่ IT SAT0417)\nช่องทางการรับเอกสารที่เลือก: ${
            current.deliveryMethod === 'hardcopy'
              ? 'เอกสารตัวจริง (Hardcopy)'
              : current.deliveryMethod === 'letter'
              ? 'จดหมาย / ไปรษณีย์ภายใน'
              : 'ไฟล์ PDF'
          }\n\nกรุณาเข้าสู่ระบบเพื่อตรวจสอบหรือยืนยันการรับเอกสาร`,
          5000
        ),
        status: 'sent',
        sentAt: nowIso,
      };
    } else {
      patch = {
        status: 'pending_manager',
        hrUid: clampString(actor.uid, 128),
        hrName: clampString(actor.name, 200),
        hrSignatureUrl: actorSig,
        hrApprovedAt: nowIso,
        updatedAt: nowIso,
      };
      logRole = 'hr';
      logAction = 'approved_hr';
      logComment = clampString(
        payload.comment || 'ฝ่ายบุคคล/บัญชีตรวจสอบและอนุมัติ ส่งต่อผู้บริหาร',
        1000
      );
    }
  } else if (current.status === 'pending_manager') {
    if (!(actorIsAdmin || (actor.role === 'manager' && inActorScope))) {
      throw new Error('บทบาทของคุณไม่มีสิทธิ์อนุมัติในขั้นตอนผู้บริหาร');
    }
    patch = {
      status: 'approved',
      managerUid: clampString(actor.uid, 128),
      managerName: clampString(actor.name, 200),
      managerSignatureUrl: actorSig,
      managerApprovedAt: nowIso,
      updatedAt: nowIso,
    };
    logRole = 'manager';
    logAction = 'approved_manager';
    logComment = clampString(
      payload.comment || 'ผู้บริหารอนุมัติขั้นสุดท้ายเรียบร้อยแล้ว',
      1000
    );
    notificationToCreate = {
      requestId: id,
      docNumber: clampString(current.docNumber, 40),
      requesterUid: clampString(current.requesterUid, 128),
      requesterDepartment: clampString(current.requesterDepartment, 120),
      recipientEmail: clampString(current.requesterEmail, 200),
      subject: clampString(
        `[DocFlow TH] เอกสารอนุมัติเรียบร้อยแล้ว: ${current.docNumber} (${formTitle})`,
        300
      ),
      body: clampString(
        `เรียน คุณ${current.requesterName}\n\nคำร้องเอกสารเลขที่ ${current.docNumber} (${formTitle}) ได้รับการอนุมัติครบทุกขั้นตอนแล้ว\nช่องทางการรับเอกสารที่เลือก: ${
          current.deliveryMethod === 'hardcopy'
            ? 'เอกสารตัวจริง (Hardcopy)'
            : current.deliveryMethod === 'letter'
            ? 'จดหมาย / ไปรษณีย์ภายใน'
            : 'ไฟล์ PDF'
        }\n\nกรุณาเข้าสู่ระบบเพื่อกด "ยืนยันการรับเอกสาร" และลงลายมือชื่อรับเอกสาร`,
        5000
      ),
      status: 'sent',
      sentAt: nowIso,
    };
  } else {
    throw new Error('สถานะปัจจุบันของเอกสารไม่สามารถดำเนินการนี้ได้');
  }

  try {
    await updateDoc(reqRef, patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
  }

  const logId = createId('log');
  try {
    await setDoc(doc(db, 'requests', id, 'logs', logId), {
      requestId: id,
      actorUid: clampString(actor.uid, 128),
      actorName: clampString(actor.name, 200),
      actorRole: clampString(logRole, 40),
      action: logAction,
      comment: logComment,
      signatureUrl: actorSig,
      createdAt: nowIso,
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `requests/${id}/logs/${logId}`
    );
  }

  if (notificationToCreate) {
    const notifId = createId('notif');
    try {
      await setDoc(
        doc(db, 'email_notifications', notifId),
        notificationToCreate
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `email_notifications/${notifId}`
      );
    }
  }
}

export async function updateItRequestComment(
  id: string,
  actor: AppUser,
  commentText: string
): Promise<void> {
  const actorIsIt = isItOfficerUser(actor);
  const actorIsHr = isHrApproverUser(actor);
  const actorIsAdmin = actor.role === 'admin';
  if (!(actorIsIt || actorIsHr || actorIsAdmin)) {
    throw new Error('เฉพาะเจ้าหน้าที่ IT / ฝ่ายบุคคล / Admin เท่านั้นที่บันทึกความเห็น IT ได้');
  }

  const reqRef = doc(db, 'requests', id);
  let current: DocumentRequest;
  try {
    const snap = await getDoc(reqRef);
    if (!snap.exists()) {
      throw new Error('ไม่พบเอกสารคำร้อง');
    }
    current = docToRequest(snap.id, snap.data());
  } catch (error) {
    if (error instanceof Error && error.message === 'ไม่พบเอกสารคำร้อง') {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `requests/${id}`);
  }

  if (current.formType !== 'F-GA-007') {
    throw new Error('ฟีเจอร์ความเห็นเจ้าหน้าที่ IT ใช้สำหรับแบบฟอร์ม F-GA-007 เท่านั้น');
  }

  const trimmed = clampString(commentText, 1000);
  if (!trimmed) {
    throw new Error('กรุณากรอกข้อความความคิดเห็นก่อนบันทึก');
  }

  const nowIso = new Date().toISOString();
  try {
    await updateDoc(reqRef, {
      itComment: trimmed,
      itCommentBy: clampString(actor.name, 200),
      itCommentAt: nowIso,
      updatedAt: nowIso,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
  }
}

export async function listEmailNotifications(
  user: AppUser
): Promise<EmailNotification[]> {
  try {
    const visibleRequests = await listRequestsForUser(user);
    const visibleIds = new Set(visibleRequests.map((r) => r.id));
    if (visibleIds.size === 0) return [];

    const q = query(
      collection(db, 'email_notifications'),
      orderBy('sentAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const n = d.data();
        return {
          id: d.id,
          requestId: String(n.requestId || ''),
          docNumber: n.docNumber ?? null,
          requesterUid: n.requesterUid ?? null,
          requesterDepartment: n.requesterDepartment ?? null,
          recipientEmail: n.recipientEmail ?? null,
          subject: String(n.subject || ''),
          body: String(n.body || ''),
          status: String(n.status || 'sent'),
          sentAt: String(n.sentAt || ''),
        };
      })
      .filter((n) => visibleIds.has(n.requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'email_notifications');
  }
}

export function buildBellNotificationsForUser(
  user: AppUser,
  visibleRequests: DocumentRequest[]
): BellNotificationItem[] {
  const level = getUserAccessLevel(user);
  const userIsIt = isItOfficerUser(user);
  const items: BellNotificationItem[] = [];

  for (const req of visibleRequests.slice(0, 40)) {
    const formTitle = FORM_TITLE_TH[req.formType] || req.formType;
    const isOwn = req.requesterUid === user.uid;
    const isItRequest = req.formType === 'F-GA-007';
    const isFingerScanRequest = req.formType === 'F-HR-011';
    const statusLabel =
      isFingerScanRequest && req.status === 'approved'
        ? 'อนุมัติเรียบร้อยแล้ว (ครบ 2 ขั้นตอน)'
        : isItRequest && req.status === 'pending_hr'
        ? 'รอฝ่ายบุคคล / เจ้าหน้าที่ IT (SAT0417) อนุมัติ'
        : STATUS_TH_SHORT[req.status] || req.status;

    let category: BellNotificationItem['category'] = 'status_update';
    let title = statusLabel;
    let message = `${req.docNumber} · ${formTitle}`;

    if (level === 'admin') {
      if (
        ['pending_dept_head', 'pending_hr', 'pending_manager'].includes(
          req.status
        )
      ) {
        category = 'action_required';
        title = `รอดำเนินการ: ${statusLabel}`;
      } else {
        category = 'department';
      }
      message = `${req.docNumber} (${formTitle}) · ${req.requesterName} [${req.requesterDepartment}]`;
    } else if (level === 'hr') {
      if (req.status === 'pending_hr') {
        category = 'action_required';
        title = isItRequest
          ? 'รอฝ่ายบุคคล / เจ้าหน้าที่ IT อนุมัติ (F-GA-007)'
          : 'รอฝ่ายบุคคล/บัญชีตรวจสอบ';
      } else {
        category = 'department';
        title = statusLabel;
      }
      message = `${req.docNumber} (${formTitle}) · ${req.requesterName} [${req.requesterDepartment}]`;
    } else if (userIsIt && isItRequest) {
      if (req.status === 'pending_hr') {
        category = 'action_required';
        title = 'รอเจ้าหน้าที่ IT (SAT0417) อนุมัติโดยตรง';
      } else if (isOwn && req.status === 'approved') {
        category = 'action_required';
        title = 'อนุมัติแล้ว! รอคุณยืนยันรับเอกสาร';
      } else {
        category = isOwn ? 'status_update' : 'department';
        title = isOwn
          ? `คำร้อง IT ของคุณ: ${statusLabel}`
          : `คำร้อง IT: ${statusLabel}`;
      }
      message = `${req.docNumber} (${formTitle}) · ${req.requesterName} [${req.requesterDepartment}]`;
    } else if (level === 'supervisor') {
      const needsMyAction =
        (user.role === 'dept_head' && req.status === 'pending_dept_head') ||
        (user.role === 'manager' && req.status === 'pending_manager') ||
        (isOwn && req.status === 'approved' && !isFingerScanRequest);

      if (needsMyAction) {
        category = 'action_required';
        title = isOwn
          ? 'เอกสารของคุณอนุมัติแล้ว รอยืนยันรับ'
          : 'คำร้องผู้ใต้บังคับบัญชารอคุณอนุมัติ';
      } else {
        category = isOwn ? 'status_update' : 'department';
        title = isOwn ? `คำร้องของคุณ: ${statusLabel}` : `ในแผนก: ${statusLabel}`;
      }
      message = `${req.docNumber} (${formTitle}) · ${req.requesterName}`;
    } else if (level === 'staff') {
      if (isOwn && req.status === 'approved' && !isFingerScanRequest) {
        category = 'action_required';
        title = 'อนุมัติแล้ว! กรุณายืนยันรับเอกสาร';
      } else if (isOwn) {
        category = 'status_update';
        title = `คำร้องของคุณ: ${statusLabel}`;
      } else {
        category = 'department';
        title = `คำร้องแผนกเดียวกัน: ${statusLabel}`;
      }
      message = `${req.docNumber} (${formTitle}) · ${req.requesterName}`;
    } else {
      if (req.status === 'approved' && !isFingerScanRequest) {
        category = 'action_required';
        title = 'อนุมัติแล้ว! รอคุณยืนยันรับเอกสาร';
      } else if (req.status === 'rejected') {
        category = 'status_update';
        title = 'เอกสารถูกปฏิเสธ / ส่งกลับแก้ไข';
        message = `${req.docNumber} (${formTitle}) · เหตุผล: ${req.rejectedReason || '-'}`;
      } else {
        category = 'status_update';
        title = statusLabel;
      }
    }

    items.push({
      id: `req-${req.id}-${req.status}-${new Date(req.updatedAt || req.createdAt).getTime()}`,
      requestId: req.id,
      docNumber: req.docNumber,
      formType: req.formType,
      title,
      message,
      category,
      requesterName: req.requesterName,
      requesterDepartment: req.requesterDepartment,
      status: req.status,
      createdAt: new Date(req.updatedAt || req.createdAt).toISOString(),
    });
  }

  return items;
}
