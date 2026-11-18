export type UserRole = 'employee' | 'dept_head' | 'hr' | 'manager' | 'admin';

export type FormCode =
  | 'F-HR-011'
  | 'F-HR-012'
  | 'F-HR-029'
  | 'F-HR-032'
  | 'F-HR-036'
  | 'F-HR-051'
  | 'F-GA-007'
  | 'ADV-PCV';

export type DeliveryMethod = 'hardcopy' | 'pdf' | 'letter';

export type RequestStatus =
  | 'pending_dept_head'
  | 'pending_hr'
  | 'pending_manager'
  | 'approved'
  | 'completed'
  | 'rejected';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  employeeCode: string;
  position: string;
  department: string;
  role: UserRole;
  signatureUrl?: string | null;
  createdAt: string;
}

export interface EmployeeDirectoryRecord {
  id: string;
  empNo: string;
  nameTh: string;
  department: string;
  division: string;
  position: string;
  role: string;
  createdAt: string;
}

export interface DocumentRequest {
  id: string;
  docNumber: string;
  formType: FormCode;
  requesterUid: string;
  requesterEmployeeCode?: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterDepartment: string;
  formData: Record<string, any>;
  deliveryMethod: DeliveryMethod;
  status: RequestStatus;
  requesterSignatureUrl?: string | null;
  deptHeadUid?: string | null;
  deptHeadName?: string | null;
  deptHeadSignatureUrl?: string | null;
  deptHeadApprovedAt?: string | null;
  hrUid?: string | null;
  hrName?: string | null;
  hrSignatureUrl?: string | null;
  hrApprovedAt?: string | null;
  managerUid?: string | null;
  managerName?: string | null;
  managerSignatureUrl?: string | null;
  managerApprovedAt?: string | null;
  receiptSignatureUrl?: string | null;
  receivedAt?: string | null;
  rejectedBy?: string | null;
  rejectedReason?: string | null;
  rejectedAt?: string | null;
  itComment?: string | null;
  itCommentBy?: string | null;
  itCommentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalLog {
  id: string;
  requestId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  comment?: string | null;
  signatureUrl?: string | null;
  createdAt: string;
}

export interface EmailNotification {
  id: string;
  requestId: string;
  docNumber?: string | null;
  requesterUid?: string | null;
  requesterDepartment?: string | null;
  recipientEmail?: string | null;
  subject: string;
  body: string;
  status: string;
  sentAt: string;
}

export interface BellNotificationItem {
  id: string;
  requestId: string;
  docNumber: string;
  formType: string;
  title: string;
  message: string;
  category: 'action_required' | 'department' | 'status_update';
  requesterName: string;
  requesterDepartment: string;
  status: string;
  createdAt: string;
}

export interface FormCatalogItem {
  code: FormCode;
  titleTh: string;
  titleEn: string;
  categoryTh: string;
  descriptionTh: string;
}

export const FORM_CATALOG: FormCatalogItem[] = [
  {
    code: 'F-HR-011',
    titleTh: 'ใบไม่ได้สแกนนิ้ว (ใบลืมบันทึกเวลา)',
    titleEn: 'Request for not a finger scan',
    categoryTh: 'ฝ่ายบุคคล (HR)',
    descriptionTh: 'แจ้งเหตุลืมสแกนนิ้วมือ สแกนไม่ผ่าน ทำงานนอกสถานที่ หรืออบรม/สัมมนา',
  },
  {
    code: 'F-HR-012',
    titleTh: 'ใบขออนุญาตออกนอกบริเวณบริษัท',
    titleEn: "Request for leave company's premises during working time",
    categoryTh: 'ฝ่ายบุคคล (HR)',
    descriptionTh: 'ขออนุญาตออกนอกบริเวณบริษัทช่วงเวลางาน/พัก พร้อมบันทึกเลขไมล์และเวลา รปภ.',
  },
  {
    code: 'F-HR-029',
    titleTh: 'แบบขอหนังสือรับรอง (ใบคำร้องขอใบรับรอง)',
    titleEn: 'SALARY/EMPLOYEE STATUS CERTIFICATION REQUEST FORM',
    categoryTh: 'ฝ่ายบุคคล (HR)',
    descriptionTh: 'ขอหนังสือรับรองพนักงาน หักภาษี 50 ทวิ หนังสือรับรองเงินเดือน หรือสลิปเงินเดือน',
  },
  {
    code: 'F-HR-032',
    titleTh: 'แบบฟอร์มขออนุมัติค่าพาหนะ / ค่าน้ำมัน',
    titleEn: 'Authorization form transportation expense requisition form',
    categoryTh: 'ฝ่ายบุคคล / GA',
    descriptionTh: 'เบิกค่าน้ำมันรถส่วนตัวตามระยะทาง (กม.) และอัตราเบิกต่อกิโลเมตร',
  },
  {
    code: 'F-HR-036',
    titleTh: 'แบบฟอร์มการขอใช้รถบริษัทฯ',
    titleEn: 'Use a company car request form',
    categoryTh: 'ฝ่ายบุคคล / ธุรการ',
    descriptionTh: 'ขอใช้รถยนต์ส่วนกลางของบริษัทฯ พร้อมระบุสถานที่ วันเวลา และผู้ร่วมเดินทาง',
  },
  {
    code: 'F-HR-051',
    titleTh: 'แบบฟอร์มการเบิกสวัสดิการ กรณีจดทะเบียนสมรส',
    titleEn: 'Marriage Registration Welfare Claim',
    categoryTh: 'สวัสดิการพนักงาน',
    descriptionTh: 'ขอเบิกเงินสวัสดิการกรณีจดทะเบียนสมรส (ยื่นก่อนวันที่ 15 ของเดือน)',
  },
  {
    code: 'F-GA-007',
    titleTh: 'ใบร้องขอดำเนินการเกี่ยวข้องกับสารสนเทศ',
    titleEn: 'IT REQUEST FORM',
    categoryTh: 'ฝ่ายสารสนเทศ (IT/GA)',
    descriptionTh: 'แจ้งซ่อม ขอเบิก/ซื้ออุปกรณ์ IT โอนย้ายข้อมูล ยืม/นำอุปกรณ์เข้าออก หรือขอใช้ E-Mail',
  },
  {
    code: 'ADV-PCV',
    titleTh: 'ใบเบิกเงินทดลอง / ใบสั่งจ่ายเงินสดย่อย',
    titleEn: 'Advance Form / Petty Cash Voucher',
    categoryTh: 'ฝ่ายบัญชีและการเงิน',
    descriptionTh: 'แบบฟอร์มใบเบิกเงินทดลอง (Advance Form) และใบสั่งจ่ายเงินสดย่อย (Petty Cash Voucher)',
  },
];

export const FORM_MAP: Record<FormCode, FormCatalogItem> = Object.fromEntries(
  FORM_CATALOG.map((item) => [item.code, item])
) as Record<FormCode, FormCatalogItem>;

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: 'พนักงาน (ผู้ยื่นคำร้อง)',
  dept_head: 'หัวหน้าแผนก (ผู้อนุมัติ 1)',
  hr: 'ฝ่ายบุคคล / บัญชี (ผู้อนุมัติ 2)',
  manager: 'ผู้จัดการ / ผู้บริหาร (ผู้อนุมัติ 3)',
  admin: 'ผู้ดูแลระบบ (Admin)',
};

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  hardcopy: 'เอกสารตัวจริง (Hardcopy)',
  pdf: 'ไฟล์ PDF (อิเล็กทรอนิกส์)',
  letter: 'จดหมาย / ไปรษณีย์ภายใน',
};

export const STATUS_LABELS: Record<
  RequestStatus,
  { label: string; stepIndex: number; textClass: string }
> = {
  pending_dept_head: {
    label: 'รอหัวหน้าแผนกอนุมัติ',
    stepIndex: 2,
    textClass: 'text-amber-700',
  },
  pending_hr: {
    label: 'รอฝ่ายบุคคล/บัญชีตรวจสอบ',
    stepIndex: 3,
    textClass: 'text-amber-700',
  },
  pending_manager: {
    label: 'รอผู้บริหารอนุมัติขั้นสุดท้าย',
    stepIndex: 4,
    textClass: 'text-blue-800',
  },
  approved: {
    label: 'อนุมัติแล้ว (รอพนักงานยืนยันรับ)',
    stepIndex: 5,
    textClass: 'text-emerald-700',
  },
  completed: {
    label: 'รับเอกสารเรียบร้อยแล้ว',
    stepIndex: 5,
    textClass: 'text-slate-700',
  },
  rejected: {
    label: 'ไม่อนุมัติ / ส่งกลับแก้ไข',
    stepIndex: 0,
    textClass: 'text-red-700',
  },
};

export function createInitialFormData(
  formType: FormCode,
  user: AppUser | null
): Record<string, any> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const buddhistYear = String(now.getFullYear() + 543);

  const base = {
    requestDate: today,
    fullName: user?.name || '',
    employeeCode: user?.employeeCode || '',
    position: user?.position || '',
    department: user?.department || '',
    email: user?.email || '',
  };

  switch (formType) {
    case 'F-HR-011':
      return {
        ...base,
        checkIn: true,
        timeIn: '08.00 น.',
        checkOut: false,
        timeOut: '17.00 น.',
        workFromTime: '08.00',
        workToTime: '17.00',
        workDay: day,
        workMonth: month,
        workYear: buddhistYear,
        causeForgot: true,
        causeNotPass: false,
        causeOutside: false,
        outsidePlace: '',
        causeTraining: false,
        trainingPlace: '',
        causeOther: false,
        causeOtherText: '',
      };
    case 'F-HR-012':
      return {
        ...base,
        reasonPersonalLeave: false,
        reasonLunch: false,
        lunchPlace: '',
        lunchFrom: '',
        lunchTo: '',
        reasonWorkOutside: true,
        outsidePlace: '',
        outsideFrom: '09.00 น.',
        outsideTo: '12.00 น.',
        carBrand: '',
        carNo: '',
        mileageStart: '',
        mileageEnd: '',
      };
    case 'F-HR-029':
      return {
        ...base,
        titlePrefix: 'นาย/นาง/นางสาว',
        firstName: user?.name?.split(' ')[0] || '',
        lastName: user?.name?.split(' ').slice(1).join(' ') || '',
        startDay: '',
        startMonth: '',
        startYear: '',
        purpose: '',
        langThai: true,
        langEnglish: false,
        certStaff: true,
        certWithholding50: false,
        certSalary: false,
        certPaySlip: false,
        paySlipMonth: '',
      };
    case 'F-HR-032':
      return {
        ...base,
        contactPlace: '',
        mileageFrom: '',
        mileageTo: '',
        trips: [
          {
            date: today,
            subject: '',
            distance: '0',
            rate: '6',
            total: '0',
          },
        ],
        checkFromHome: false,
        checkFromCompany: true,
      };
    case 'F-HR-036':
      return {
        ...base,
        contactPlace: '',
        useDate: today,
        forTime: '09.00 น.',
        toTime: '12.00 น.',
        passengerCount: '1',
        passengers: user?.name || '',
        adminCarReg: '',
        adminCarType: '',
        adminSign: '',
        adminDate: '',
        remark: '',
      };
    case 'F-HR-051':
      return {
        ...base,
        startWorkDay: '',
        startWorkMonth: '',
        startWorkYear: '',
        spouseName: '',
        marriageDay: day,
        marriageMonth: month,
        marriageYear: buddhistYear,
        attachMarriageCert: true,
      };
    case 'F-GA-007':
      return {
        ...base,
        requestTime: '09.00 น.',
        typeRepair: false,
        typeBuy: false,
        typeTransfer: false,
        typeInstall: false,
        typeBorrow: false,
        typeEmail: false,
        typeOther: false,
        typeOtherText: '',
        items: [
          { item: '', detail: '', duration: '' },
          { item: '', detail: '', duration: '' },
          { item: '', detail: '', duration: '' },
        ],
        comment: '',
      };
    case 'ADV-PCV':
      return {
        ...base,
        voucherType: 'advance', // 'advance' | 'petty_cash'
        payTo: user?.name || '',
        voucherNo: '',
        description: '',
        amountBht: '0',
        advanceItems: [
          { description: '', amount: '0' },
          { description: '', amount: '0' },
          { description: '', amount: '0' },
        ],
        pettyItems: [
          { account: '', accountCode: '', dr: '0', cr: '0' },
          { account: '', accountCode: '', dr: '0', cr: '0' },
          { account: '', accountCode: '', dr: '0', cr: '0' },
        ],
      };
  }
}
