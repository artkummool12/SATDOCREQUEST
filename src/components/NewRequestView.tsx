import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  Send,
  FileText,
  Mail,
  Printer,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createDocumentRequest,
  listEmployees,
} from '../lib/firestore-db';
import {
  createInitialFormData,
  FORM_CATALOG,
  FORM_MAP,
  type DeliveryMethod,
  type EmployeeDirectoryRecord,
  type FormCode,
} from '../types/document';
import { OfficialFormRenderer } from './forms/OfficialFormRenderer';
import { SignaturePad } from './SignaturePad';

interface NewRequestViewProps {
  onSubmitted: (newId: string) => void;
  onCancel: () => void;
}

export const NewRequestView: React.FC<NewRequestViewProps> = ({
  onSubmitted,
  onCancel,
}) => {
  const { dbUser } = useAuth();
  const [selectedForm, setSelectedForm] = useState<FormCode | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pdf');
  const [signatureUrl, setSignatureUrl] = useState<string>(
    dbUser?.signatureUrl || ''
  );
  const [employees, setEmployees] = useState<EmployeeDirectoryRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmployees()
      .then((list) => setEmployees(list))
      .catch(() => {});
  }, []);

  const handleSelectForm = (code: FormCode) => {
    setSelectedForm(code);
    setFormData(createInitialFormData(code, dbUser));
    setSignatureUrl(dbUser?.signatureUrl || '');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm || !dbUser) return;
    if (!signatureUrl) {
      setError('กรุณาลงลายมือชื่ออิเล็กทรอนิกส์ (E-Signature) ก่อนส่งคำร้อง');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createDocumentRequest(dbUser, {
        formType: selectedForm,
        formData,
        deliveryMethod,
        signatureUrl,
      });
      onSubmitted(created.id);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถส่งคำร้องเอกสารได้');
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedForm) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              เลือกประเภทแบบฟอร์มเอกสารที่ต้องการยื่นคำร้อง
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กรุณาเลือกแบบฟอร์มมาตรฐานองค์กรทั้ง 8 รายการด้านล่างเพื่อกรอกข้อมูลและลงนาม
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าหลัก</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {FORM_CATALOG.map((form) => (
            <button
              key={form.code}
              type="button"
              onClick={() => handleSelectForm(form.code)}
              className="text-left border border-slate-200 bg-white rounded-lg p-5 hover:border-blue-800 hover:shadow-xs transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-blue-900">
                    {form.code}
                  </span>
                  <span>{form.categoryTh}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors leading-snug">
                  {form.titleTh}
                </h3>
                <div className="text-xs text-slate-500 font-medium">
                  {form.titleEn}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {form.descriptionTh}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-900">
                <span>กรอกแบบฟอร์มนี้</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = FORM_MAP[selectedForm];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedForm(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>เปลี่ยนแบบฟอร์ม</span>
          </button>
          <div>
            <div className="text-xs text-slate-500 font-mono">
              {meta.code} · {meta.categoryTh}
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {meta.titleTh}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>พิมพ์ตัวอย่างแบบฟอร์ม</span>
        </button>
      </div>

      {/* Quick-Fill from Employee Directory */}
      {employees.length > 0 && (
        <div className="border border-slate-200 bg-white rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <UserCheck className="w-4 h-4 text-blue-900 shrink-0" />
            <span>ดึงข้อมูลพนักงานจากฐานข้อมูลอัตโนมัติ:</span>
          </div>
          <select
            defaultValue=""
            onChange={(e) => {
              const emp = employees.find((x) => x.empNo === e.target.value);
              if (emp) {
                const nameParts = emp.nameTh.trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ');
                const deptLabel = emp.division
                  ? `${emp.department} (${emp.division})`
                  : emp.department;
                setFormData((prev) => ({
                  ...prev,
                  fullName: emp.nameTh,
                  firstName,
                  lastName,
                  payTo: emp.nameTh,
                  passengers:
                    prev.passengers !== undefined ? emp.nameTh : prev.passengers,
                  employeeCode: emp.empNo,
                  position: emp.position,
                  department: deptLabel,
                }));
              }
            }}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 sm:min-w-[300px] focus:outline-none focus:border-blue-800"
          >
            <option value="">-- เลือกรหัสพนักงานเพื่อกรอกข้อมูลหัวฟอร์ม --</option>
            {employees.map((emp) => (
              <option key={emp.empNo} value={emp.empNo}>
                {emp.empNo} - {emp.nameTh} ({emp.department}/{emp.division})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Official Corporate Paper Form */}
      <OfficialFormRenderer
        formType={selectedForm}
        data={formData}
        onChange={setFormData}
        mode="edit"
        deliveryMethod={deliveryMethod}
      />

      {/* Delivery Method & E-Signature Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        <div className="lg:col-span-5 border border-slate-200 bg-white rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              ช่องทางการรับเอกสารเมื่ออนุมัติแล้ว
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกรูปแบบเอกสารที่ต้องการรับหลังผ่านการอนุมัติครบทุกขั้นตอน
            </p>
          </div>
          <div className="space-y-2.5">
            {(
              [
                {
                  id: 'hardcopy',
                  title: 'เอกสารตัวจริง (Hardcopy)',
                  desc: 'รับเอกสารฉบับจริงที่มีตราประทับ/ลายเซ็นที่ฝ่ายบุคคล',
                  icon: FileCheck2,
                },
                {
                  id: 'pdf',
                  title: 'ไฟล์ PDF (อิเล็กทรอนิกส์)',
                  desc: 'ดาวน์โหลดไฟล์ PDF พร้อมแจ้งเตือนผ่านอีเมลพนักงานทันที',
                  icon: FileText,
                },
                {
                  id: 'letter',
                  title: 'จดหมาย / ไปรษณีย์ภายใน',
                  desc: 'จัดส่งใส่ซองปิดผนึกผ่านระบบรับ-ส่งเอกสารภายในองค์กร',
                  icon: Mail,
                },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = deliveryMethod === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    active
                      ? 'border-blue-900 bg-blue-50/40'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    checked={active}
                    onChange={() => setDeliveryMethod(opt.id)}
                    className="mt-1 accent-blue-900"
                  />
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      active ? 'text-blue-900' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {opt.title}
                    </div>
                    <div className="text-xs text-slate-500">{opt.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7">
          <SignaturePad
            value={signatureUrl}
            onChange={setSignatureUrl}
            savedSignature={dbUser?.signatureUrl}
            label="ลงลายมือชื่อผู้ยื่นคำร้อง (บังคับก่อนส่งเอกสาร)"
          />
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm no-print">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 no-print">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors"
        >
          <Send className="w-4 h-4" />
          <span>{submitting ? 'กำลังส่งคำร้อง...' : 'ยืนยันและส่งคำร้องขออนุมัติ'}</span>
        </button>
      </div>
    </form>
  );
};
