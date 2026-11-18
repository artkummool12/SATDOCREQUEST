import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Eye,
  FileCheck2,
  Clock,
  Inbox,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isHrApproverUser, isItOfficerUser } from '../lib/roles';
import {
  FORM_MAP,
  ROLE_LABELS,
  STATUS_LABELS,
  type DocumentRequest,
  type FormCode,
} from '../types/document';

interface ApprovalQueueViewProps {
  requests: DocumentRequest[];
  onSelectRequest: (id: string) => void;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  requests,
  onSelectRequest,
}) => {
  const { dbUser } = useAuth();
  const userIsHr = isHrApproverUser(dbUser);
  const userIsIt = isItOfficerUser(dbUser);
  const isSupervisor =
    dbUser &&
    (['dept_head', 'hr', 'manager', 'admin'].includes(dbUser.role) ||
      userIsHr ||
      userIsIt);
  const [viewScope, setViewScope] = useState<'actionable' | 'all_subordinates'>(
    'actionable'
  );
  const [deptFilter, setDeptFilter] = useState('all');

  const departments = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.requesterDepartment) set.add(r.requesterDepartment);
    });
    return Array.from(set).sort();
  }, [requests]);

  const actionableRequests = useMemo(() => {
    if (!dbUser) return [];
    return requests.filter((req) => {
      if (dbUser.role === 'admin') {
        return (
          ['pending_dept_head', 'pending_hr', 'pending_manager'].includes(
            req.status
          ) ||
          (req.status === 'approved' && req.formType !== 'F-HR-011')
        );
      }
      if (dbUser.role === 'dept_head' && req.status === 'pending_dept_head') {
        return true;
      }
      if (
        (userIsHr || (userIsIt && req.formType === 'F-GA-007')) &&
        req.status === 'pending_hr'
      ) {
        return true;
      }
      if (dbUser.role === 'manager' && req.status === 'pending_manager') {
        return true;
      }
      if (
        req.status === 'approved' &&
        req.requesterUid === dbUser.uid &&
        req.formType !== 'F-HR-011'
      ) {
        return true;
      }
      return false;
    });
  }, [requests, dbUser, userIsHr, userIsIt]);

  const displayedRequests = useMemo(() => {
    const base =
      viewScope === 'all_subordinates' && isSupervisor
        ? requests
        : actionableRequests;
    if (deptFilter === 'all') return base;
    return base.filter((r) => r.requesterDepartment === deptFilter);
  }, [viewScope, isSupervisor, requests, actionableRequests, deptFilter]);

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {viewScope === 'all_subordinates' && isSupervisor
                ? 'รายการคำร้องทั้งหมดในขอบเขตสิทธิ์ของคุณ'
                : 'รายการรอดำเนินการตามสิทธิ์ของคุณ'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              บทบาทปัจจุบัน: {dbUser ? ROLE_LABELS[dbUser.role] : '-'} ·{' '}
              {userIsHr || dbUser?.role === 'admin'
                ? 'ฝ่ายบุคคล / ผู้ดูแลระบบสามารถดูคำร้องได้ทุกแผนก'
                : userIsIt
                ? 'เจ้าหน้าที่สารสนเทศ (SAT0417) สามารถพิจารณาอนุมัติใบร้องขอสารสนเทศ (F-GA-007) ขั้นสุดท้ายได้โดยตรงทุกแผนก'
                : dbUser?.role === 'dept_head' || dbUser?.role === 'manager'
                ? `หัวหน้าแผนกดูรายการคำร้องของผู้ใต้บังคับบัญชาในแผนก ${dbUser.department} เท่านั้น`
                : 'แสดงเอกสารที่รอคุณลงนามยืนยันรับเอกสาร'}
            </p>
          </div>
          <div className="text-sm font-bold text-blue-900 tabular-nums">
            {displayedRequests.length} รายการ
          </div>
        </div>

        {isSupervisor && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setViewScope('actionable')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  viewScope === 'actionable'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รอฉันดำเนินการ ({actionableRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setViewScope('all_subordinates')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  viewScope === 'all_subordinates'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  {userIsIt && !userIsHr
                    ? `คำร้องสารสนเทศทั้งหมด (${requests.length})`
                    : `คำร้องผู้ใต้บังคับบัญชาทั้งหมด (${requests.length})`}
                </span>
              </button>
            </div>

            {departments.length > 0 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white"
              >
                <option value="all">ทุกแผนก / ฝ่าย</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {displayedRequests.length === 0 ? (
        <div className="border border-slate-200 bg-white rounded-lg py-14 px-6 text-center">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">
            ไม่มีรายการคำร้องในมุมมองนี้
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            เอกสารทั้งหมดในขั้นตอนนี้ได้รับการพิจารณาเรียบร้อยแล้ว หรือยังไม่มีคำร้องใหม่ส่งเข้ามา
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedRequests.map((req) => {
            const formMeta = FORM_MAP[req.formType as FormCode];
            const statusMeta = STATUS_LABELS[req.status];
            const isReceiptStep = req.status === 'approved';
            const canActNow = actionableRequests.some((a) => a.id === req.id);

            return (
              <div
                key={req.id}
                className="border border-slate-200 bg-white rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-blue-800 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-blue-900 tabular-nums">
                      {req.docNumber}
                    </span>
                    <span className="tabular-nums">
                      {new Date(req.createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {formMeta?.titleTh || req.formType}
                  </h3>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-1.5">
                    <span>ผู้ยื่น: {req.requesterName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{req.requesterDepartment}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{req.formType}</span>
                  </div>

                  <div
                    className={`text-xs font-semibold flex items-center gap-1.5 pt-1 ${statusMeta.textClass}`}
                  >
                    {isReceiptStep ? (
                      <FileCheck2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {req.formType === 'F-HR-011' && req.status === 'approved'
                        ? 'อนุมัติเรียบร้อยแล้ว (ครบ 2 ขั้นตอน)'
                        : req.formType === 'F-GA-007' && req.status === 'pending_hr'
                        ? 'รอฝ่ายบุคคล / เจ้าหน้าที่ IT (SAT0417) อนุมัติ'
                        : statusMeta.label}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectRequest(req.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      canActNow
                        ? 'text-white bg-blue-900 hover:bg-blue-800'
                        : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isReceiptStep && canActNow ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>ยืนยันการรับเอกสาร</span>
                      </>
                    ) : canActNow ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>ตรวจสอบและพิจารณาอนุมัติ</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูรายละเอียดคำร้อง</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
