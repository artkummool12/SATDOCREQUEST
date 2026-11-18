import React, { useEffect, useState } from 'react';
import {
  FileText,
  ShieldCheck,
  PenTool,
  CheckCircle2,
  LogIn,
  IdCard,
  Building2,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { FORM_CATALOG, ROLE_LABELS, type UserRole } from '../types/document';
import { findEmployeeByCode } from '../lib/firestore-db';
import { resolveRoleFromPosition } from '../lib/roles';

interface LookupEmployee {
  empNo: string;
  nameTh: string;
  department: string;
  division: string;
  position: string;
  role: UserRole;
}

interface LoginScreenProps {
  onLoginEmployeeCode: (employeeCode: string) => Promise<void>;
  onLoginGoogle: () => Promise<void>;
  onLoginMicrosoft: () => Promise<void>;
  error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginEmployeeCode,
  onLoginGoogle,
  onLoginMicrosoft,
  error,
}) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupEmployee | null>(null);
  const [lookupChecked, setLookupChecked] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const code = employeeCode.trim();
    if (!code) {
      setLookupResult(null);
      setLookupChecked(false);
      return;
    }

    let cancelled = false;
    setLookingUp(true);
    const timer = window.setTimeout(async () => {
      try {
        const emp = await findEmployeeByCode(code);
        if (!cancelled) {
          if (emp) {
            const deptLabel = emp.division
              ? `${emp.department} (${emp.division})`
              : emp.department;
            setLookupResult({
              empNo: emp.empNo,
              nameTh: emp.nameTh,
              department: emp.department,
              division: emp.division,
              position: emp.position,
              role: resolveRoleFromPosition(emp.position, emp.role, deptLabel),
            });
          } else {
            setLookupResult(null);
          }
          setLookupChecked(true);
        }
      } catch {
        if (!cancelled) {
          setLookupResult(null);
          setLookupChecked(false);
        }
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [employeeCode]);

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim()) return;
    setSubmitting(true);
    try {
      await onLoginEmployeeCode(employeeCode.trim());
    } catch {
      // error displayed via prop
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <img
              src="/assets/aistudio/LOGO_34f0bd18.png"
              alt="SUMINO AAPICO"
              className="h-9 w-auto object-contain shrink-0"
            />
            <div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
                บริษัท ซูมิโน อาปิโก (ไทยแลนด์) จำกัด
              </div>
              <div className="text-[11px] text-slate-500">
                ระบบจัดการคำร้องและอนุมัติเอกสารองค์กร
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap shrink-0">
            <IdCard className="w-4 h-4 text-blue-900" />
            <span>เข้าสู่ระบบได้ทันทีด้วยรหัสพนักงาน</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 space-y-6 pt-2">
            <div className="text-xs font-semibold text-blue-900 tracking-wide">
              ระบบเอกสารอิเล็กทรอนิกส์และลายเซ็นดิจิทัล
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight text-balance">
              ยื่นคำร้องและอนุมัติเอกสารองค์กร ครบวงจรในระบบเดียว
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              รองรับแบบฟอร์มมาตรฐานองค์กร 8 ประเภท พร้อมการดึงข้อมูลพนักงานและตำแหน่งงานอัตโนมัติ การแบ่งสิทธิ์การมองเห็นตามระดับงาน และการแจ้งเตือนทุกขั้นตอน
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-1.5">
                <FileText className="w-5 h-5 text-blue-900" />
                <div className="text-sm font-semibold text-slate-900">
                  8 แบบฟอร์มมาตรฐาน
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  โครงสร้างเอกสารเหมือนแบบฟอร์มกระดาษจริง พร้อมพิมพ์ PDF
                </p>
              </div>
              <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-1.5">
                <PenTool className="w-5 h-5 text-blue-900" />
                <div className="text-sm font-semibold text-slate-900">
                  ลายเซ็นดิจิทัล
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  เซ็นชื่อผ่านหน้าจอหรืออัปโหลดลายเซ็นในทุกขั้นตอนอนุมัติ
                </p>
              </div>
              <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-1.5">
                <ShieldCheck className="w-5 h-5 text-blue-900" />
                <div className="text-sm font-semibold text-slate-900">
                  แบ่งสิทธิ์ตามตำแหน่ง
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  พนักงาน Staff หัวหน้าแผนก ฝ่ายบุคคล และ Admin อัตโนมัติ
                </p>
              </div>
            </div>

            <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-bold text-slate-900">
                  รายการแบบฟอร์มเอกสารที่รองรับ
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  8 แบบฟอร์ม
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {FORM_CATALOG.map((item) => (
                  <li
                    key={item.code}
                    className="flex items-start gap-2 text-xs text-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-900 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-mono font-semibold text-slate-900">
                        {item.code}
                      </span>{' '}
                      · {item.titleTh}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Login Box: Employee Code Only (Auto Reference) */}
          <div className="lg:col-span-6">
            <div className="border border-slate-200 bg-white rounded-lg p-6 sm:p-8 space-y-5 max-w-lg mx-auto shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  เข้าสู่ระบบด้วยรหัสพนักงาน
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ไม่ต้องใช้อีเมล เพียงกรอกรหัสพนักงาน ระบบจะอ้างอิงชื่อ แผนก ตำแหน่ง และสิทธิ์ให้อัตโนมัติ
                </p>
              </div>

              <form onSubmit={handleEmpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    รหัสพนักงาน (Employee Code)
                  </label>
                  <div className="relative">
                    <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={employeeCode}
                      onChange={(e) =>
                        setEmployeeCode(e.target.value.toUpperCase())
                      }
                      placeholder="เช่น SAT0009, SAT0011, SAT0015"
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm font-mono font-semibold uppercase tracking-wide text-slate-900 focus:outline-none focus:border-blue-800"
                    />
                  </div>
                </div>

                {/* Live Auto-Referenced Employee Info */}
                {lookingUp && (
                  <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                    กำลังตรวจสอบข้อมูลรหัสพนักงาน...
                  </div>
                )}

                {!lookingUp && lookupResult && (
                  <div className="border border-emerald-200 bg-emerald-50/60 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>พบข้อมูลพนักงานในระบบ</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        {lookupResult.empNo}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {lookupResult.nameTh}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>ตำแหน่ง: {lookupResult.position || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          แผนก:{' '}
                          {lookupResult.division
                            ? `${lookupResult.department} (${lookupResult.division})`
                            : lookupResult.department || '-'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold text-blue-900 pt-1 border-t border-emerald-200/70">
                      สิทธิ์ที่ได้รับอัตโนมัติ: {ROLE_LABELS[lookupResult.role]}
                    </div>
                  </div>
                )}

                {!lookingUp &&
                  lookupChecked &&
                  !lookupResult &&
                  employeeCode.trim().length >= 3 && (
                    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
                      ไม่พบรหัสพนักงาน <span className="font-mono font-bold">{employeeCode}</span> ในฐานข้อมูลพนักงาน
                    </div>
                  )}

                {error && (
                  <div className="border border-red-200 bg-red-50 text-red-800 px-3.5 py-2.5 rounded-lg text-xs leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !employeeCode.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'กำลังเข้าสู่ระบบ...'
                      : 'เข้าสู่ระบบด้วยรหัสพนักงาน'}
                  </span>
                </button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[11px] text-slate-400">
                  หรือเข้าสู่ระบบด้วยบัญชีองค์กร (ตัวเลือกเสริม)
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onLoginMicrosoft}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    viewBox="0 0 21 21"
                    aria-hidden="true"
                  >
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  <span>Outlook / Microsoft</span>
                </button>
                <button
                  type="button"
                  onClick={onLoginGoogle}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0 text-blue-900" />
                  <span>Google Workspace</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-6xl mx-auto px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>SUMINO AAPICO (Thailand) Co.,Ltd. — ระบบคำร้องและอนุมัติเอกสาร</span>
          <span>รองรับการใช้งานบนคอมพิวเตอร์และโทรศัพท์มือถือ</span>
        </div>
      </footer>
    </div>
  );
};
