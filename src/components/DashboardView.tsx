import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserAccessLevel, isItOfficerUser } from '../lib/roles';
import {
  DELIVERY_LABELS,
  FORM_CATALOG,
  FORM_MAP,
  STATUS_LABELS,
  type DocumentRequest,
  type FormCode,
  type RequestStatus,
} from '../types/document';

interface DashboardViewProps {
  requests: DocumentRequest[];
  loading: boolean;
  onSelectRequest: (id: string) => void;
  onCreateNew: () => void;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'completed' | 'rejected';

export const DashboardView: React.FC<DashboardViewProps> = ({
  requests,
  loading,
  onSelectRequest,
  onCreateNew,
}) => {
  const { dbUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const scopeNotice = useMemo(() => {
    if (!dbUser) return '';
    const level = getUserAccessLevel(dbUser);
    if (level === 'admin') {
      return 'สิทธิ์ผู้ดูแลระบบ (Admin): แสดงรายการคำร้องของทุกแผนกในองค์กร';
    }
    if (level === 'hr') {
      return 'สิทธิ์ฝ่ายบุคคล (HR): แสดงรายการคำร้องของพนักงานทุกแผนกในองค์กร';
    }
    if (isItOfficerUser(dbUser)) {
      return 'สิทธิ์เจ้าหน้าที่สารสนเทศ (IT Officer SAT0417): แสดงคำร้องของตนเอง และใบร้องขอสารสนเทศ (F-GA-007) ของทุกแผนก';
    }
    if (level === 'supervisor') {
      return `สิทธิ์หัวหน้าแผนก (${dbUser.position || 'Manager'}): แสดงเฉพาะคำร้องของผู้ใต้บังคับบัญชาในแผนก ${dbUser.department}`;
    }
    if (level === 'staff') {
      return `สิทธิ์ระดับ Staff: แสดงเฉพาะรายการคำร้องภายในแผนก ${dbUser.department}`;
    }
    return 'สิทธิ์ระดับพนักงาน: แสดงเฉพาะรายการคำร้องที่ตนเองเป็นผู้ยื่นเท่านั้น';
  }, [dbUser]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) =>
      ['pending_dept_head', 'pending_hr', 'pending_manager'].includes(r.status)
    ).length;
    const readyOrDone = requests.filter((r) =>
      ['approved', 'completed'].includes(r.status)
    ).length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    return { total, pending, readyOrDone, rejected };
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter === 'pending') {
        if (
          !['pending_dept_head', 'pending_hr', 'pending_manager'].includes(
            req.status
          )
        ) {
          return false;
        }
      } else if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }

      if (formFilter !== 'all' && req.formType !== formFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const formTitle =
          FORM_MAP[req.formType as FormCode]?.titleTh?.toLowerCase() || '';
        return (
          req.docNumber.toLowerCase().includes(q) ||
          req.requesterName.toLowerCase().includes(q) ||
          req.requesterDepartment.toLowerCase().includes(q) ||
          req.formType.toLowerCase().includes(q) ||
          formTitle.includes(q)
        );
      }
      return true;
    });
  }, [requests, statusFilter, formFilter, searchQuery]);

  const renderStatusLabel = (status: RequestStatus, formType?: string) => {
    const meta = STATUS_LABELS[status];
    const label =
      formType === 'F-HR-011' && status === 'approved'
        ? 'อนุมัติเรียบร้อยแล้ว (2 ขั้นตอน)'
        : formType === 'F-GA-007' && status === 'pending_hr'
        ? 'รอฝ่ายบุคคล / เจ้าหน้าที่ IT (SAT0417) อนุมัติ'
        : meta.label;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.textClass}`}>
        {status === 'rejected' ? (
          <XCircle className="w-3.5 h-3.5 shrink-0" />
        ) : status === 'approved' || status === 'completed' ? (
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Clock className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {scopeNotice && (
        <div className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span className="font-medium text-slate-800">{scopeNotice}</span>
          {dbUser && (
            <span className="font-mono text-slate-500">
              {dbUser.employeeCode || dbUser.uid} · {dbUser.name}
            </span>
          )}
        </div>
      )}

      {/* 4 Summary Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-200 bg-white rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">คำร้องทั้งหมด</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {stats.total}
          </div>
          <div className="mt-1 text-xs text-slate-400">รายการในระบบ</div>
        </div>
        <div className="border border-slate-200 bg-white rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">รอการอนุมัติ</div>
          <div className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
            {stats.pending}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            หัวหน้า / HR / ผู้บริหาร
          </div>
        </div>
        <div className="border border-slate-200 bg-white rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">
            อนุมัติแล้ว / เสร็จสมบูรณ์
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
            {stats.readyOrDone}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            พร้อมรับหรือรับเอกสารแล้ว
          </div>
        </div>
        <div className="border border-slate-200 bg-white rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">ไม่อนุมัติ</div>
          <div className="mt-1 text-2xl font-bold text-red-700 tabular-nums">
            {stats.rejected}
          </div>
          <div className="mt-1 text-xs text-slate-400">ส่งกลับผู้ยื่นคำร้อง</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                ['all', 'ทั้งหมด'],
                ['pending', 'รอดำเนินการ'],
                ['approved', 'อนุมัติแล้ว'],
                ['completed', 'รับเอกสารแล้ว'],
                ['rejected', 'ไม่อนุมัติ'],
              ] as Array<[StatusFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <select
              value={formFilter}
              onChange={(e) => setFormFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-blue-800"
            >
              <option value="all">ทุกแบบฟอร์ม (8 ประเภท)</option>
              {FORM_CATALOG.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.code} - {f.titleTh}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขที่เอกสาร, ชื่อ, แผนก..."
                className="w-full sm:w-64 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="space-y-2.5 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-11 bg-slate-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4 border-t border-slate-100">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">
              ยังไม่มีรายการคำร้องเอกสารที่ตรงกับเงื่อนไข
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              คุณสามารถเริ่มต้นสร้างคำร้องเอกสารใหม่จากแบบฟอร์มมาตรฐานทั้ง 8 ประเภท พร้อมลงลายมือชื่ออิเล็กทรอนิกส์ได้ทันที
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>ยื่นคำร้องเอกสารใหม่</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[780px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-3">เลขที่เอกสาร</th>
                  <th className="py-2.5 px-3">แบบฟอร์ม</th>
                  <th className="py-2.5 px-3">ผู้ยื่นคำร้อง</th>
                  <th className="py-2.5 px-3">ช่องทางรับ</th>
                  <th className="py-2.5 px-3">สถานะปัจจุบัน</th>
                  <th className="py-2.5 px-3">วันที่ยื่น</th>
                  <th className="py-2.5 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((req) => {
                  const formMeta = FORM_MAP[req.formType as FormCode];
                  return (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-blue-900 tabular-nums whitespace-nowrap">
                        {req.docNumber}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 text-xs sm:text-sm">
                          {formMeta?.titleTh || req.formType}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {req.formType}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs sm:text-sm font-medium text-slate-900">
                          {req.requesterName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {req.requesterDepartment}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                        {DELIVERY_LABELS[req.deliveryMethod] ||
                          req.deliveryMethod}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderStatusLabel(req.status, req.formType)}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRequest(req.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 rounded hover:bg-white hover:border-slate-300 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>เปิดเอกสาร</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
