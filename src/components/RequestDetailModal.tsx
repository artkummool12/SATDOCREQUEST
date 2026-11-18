import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Printer,
  Mail,
  Clock,
  FileCheck2,
  UserCheck,
  MessageSquarePlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getRequestDetail,
  processApprovalAction,
  updateItRequestComment,
} from '../lib/firestore-db';
import {
  DELIVERY_LABELS,
  FORM_MAP,
  ROLE_LABELS,
  STATUS_LABELS,
  type ApprovalLog,
  type DocumentRequest,
  type EmailNotification,
  type FormCode,
  type UserRole,
} from '../types/document';
import { OfficialFormRenderer } from './forms/OfficialFormRenderer';
import { SignaturePad } from './SignaturePad';
import { isHrApproverUser, isItOfficerUser } from '../lib/roles';

interface RequestDetailModalProps {
  requestId: string;
  onBack: () => void;
  onUpdated: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  requestId,
  onBack,
  onUpdated,
}) => {
  const { dbUser } = useAuth();
  const [request, setRequest] = useState<DocumentRequest | null>(null);
  const [logs, setLogs] = useState<ApprovalLog[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionSig, setActionSig] = useState<string>(
    dbUser?.signatureUrl || ''
  );
  const [comment, setComment] = useState('');
  const [itCommentInput, setItCommentInput] = useState('');
  const [savingItComment, setSavingItComment] = useState(false);
  const [itCommentNotice, setItCommentNotice] = useState<string | null>(null);
  const [itCommentError, setItCommentError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!dbUser) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getRequestDetail(requestId, dbUser);
      if (!detail) {
        setError('ไม่พบเอกสารคำร้องที่ระบุ');
        setRequest(null);
      } else {
        setRequest(detail.request);
        setItCommentInput(detail.request.itComment || '');
        setLogs(detail.logs);
        setNotifications(detail.notifications);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลเอกสารได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, dbUser?.uid]);

  useEffect(() => {
    if (dbUser?.signatureUrl && !actionSig) {
      setActionSig(dbUser.signatureUrl);
    }
  }, [dbUser, actionSig]);

  if (loading) {
    return (
      <div className="border border-slate-200 bg-white rounded-lg p-8 space-y-4">
        <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-6 space-y-3">
        <div className="text-sm font-semibold text-red-800">
          {error || 'ไม่พบข้อมูลเอกสาร'}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับหน้ารายการ</span>
        </button>
      </div>
    );
  }

  const formMeta = FORM_MAP[request.formType as FormCode];
  const statusMeta = STATUS_LABELS[request.status];
  const isItRequest = request.formType === 'F-GA-007';
  const isFingerScanRequest = request.formType === 'F-HR-011';
  const effectiveStatusLabel =
    isFingerScanRequest && request.status === 'approved'
      ? 'อนุมัติเรียบร้อยแล้ว (ครบ 2 ขั้นตอน)'
      : isItRequest && request.status === 'pending_hr'
      ? 'รอฝ่ายบุคคล / เจ้าหน้าที่ IT (SAT0417) อนุมัติ'
      : statusMeta.label;

  const canApproveCurrentStep =
    dbUser &&
    ((request.status === 'pending_dept_head' &&
      (dbUser.role === 'dept_head' || dbUser.role === 'admin')) ||
      (request.status === 'pending_hr' &&
        (isHrApproverUser(dbUser) ||
          dbUser.role === 'admin' ||
          (isItRequest && isItOfficerUser(dbUser)))) ||
      (request.status === 'pending_manager' &&
        (dbUser.role === 'manager' || dbUser.role === 'admin')));

  const canConfirmReceipt =
    dbUser &&
    !isFingerScanRequest &&
    request.status === 'approved' &&
    (request.requesterUid === dbUser.uid || dbUser.role === 'admin');

  const canWriteItComment =
    Boolean(dbUser) &&
    isItRequest &&
    request.status !== 'rejected' &&
    (isItOfficerUser(dbUser) ||
      isHrApproverUser(dbUser) ||
      dbUser?.role === 'admin');

  const handleSaveItComment = async () => {
    if (!dbUser) return;
    setSavingItComment(true);
    setItCommentError(null);
    setItCommentNotice(null);
    try {
      await updateItRequestComment(request.id, dbUser, itCommentInput);
      setItCommentNotice('บันทึกความคิดเห็น IT ลงบนแบบฟอร์มเรียบร้อยแล้ว');
      await loadDetail();
      onUpdated();
    } catch (err: any) {
      setItCommentError(err.message || 'ไม่สามารถบันทึกความคิดเห็นได้');
    } finally {
      setSavingItComment(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'receive') => {
    if (!dbUser) return;
    if (action === 'reject' && !comment.trim()) {
      setActionError('กรุณาระบุเหตุผลในการไม่อนุมัติเอกสาร');
      return;
    }
    if ((action === 'approve' || action === 'receive') && !actionSig) {
      setActionError('กรุณาลงลายมือชื่ออิเล็กทรอนิกส์ก่อนยืนยันรายการ');
      return;
    }

    setProcessing(true);
    setActionError(null);
    try {
      await processApprovalAction(request.id, dbUser, {
        action,
        comment,
        signatureUrl: actionSig,
      });
      setComment('');
      await loadDetail();
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถบันทึกการดำเนินการได้');
    } finally {
      setProcessing(false);
    }
  };

  const steps = isFingerScanRequest
    ? [
        {
          num: 1,
          title: 'พนักงานผู้ร้องขอ',
          done: true,
          current: false,
          actor: request.requesterName,
          time: request.createdAt,
        },
        {
          num: 2,
          title: 'หัวหน้าแผนกอนุมัติ',
          done: Boolean(
            request.deptHeadApprovedAt ||
              request.managerApprovedAt ||
              request.status === 'approved' ||
              request.status === 'completed'
          ),
          current: request.status === 'pending_dept_head',
          actor: request.deptHeadName || request.managerName,
          time: request.deptHeadApprovedAt || request.managerApprovedAt,
        },
      ]
    : isItRequest
    ? [
        {
          num: 1,
          title: 'พนักงานยื่นคำร้อง',
          done: true,
          current: false,
          actor: request.requesterName,
          time: request.createdAt,
        },
        {
          num: 2,
          title: 'หัวหน้าแผนกอนุมัติ',
          done: Boolean(request.deptHeadApprovedAt),
          current: request.status === 'pending_dept_head',
          actor: request.deptHeadName,
          time: request.deptHeadApprovedAt,
        },
        {
          num: 3,
          title: 'ฝ่ายบุคคล/เจ้าหน้าที่ IT รหัส SAT0417 โดยตรง',
          done: Boolean(
            request.hrApprovedAt ||
              request.managerApprovedAt ||
              request.status === 'approved' ||
              request.status === 'completed'
          ),
          current: request.status === 'pending_hr',
          actor: request.hrName || request.managerName,
          time: request.hrApprovedAt || request.managerApprovedAt,
        },
      ]
    : [
        {
          num: 1,
          title: 'พนักงานยื่นคำร้อง',
          done: true,
          current: false,
          actor: request.requesterName,
          time: request.createdAt,
        },
        {
          num: 2,
          title: 'หัวหน้าแผนกอนุมัติ',
          done: Boolean(request.deptHeadApprovedAt),
          current: request.status === 'pending_dept_head',
          actor: request.deptHeadName,
          time: request.deptHeadApprovedAt,
        },
        {
          num: 3,
          title: 'ฝ่ายบุคคล/บัญชีตรวจสอบ',
          done: Boolean(request.hrApprovedAt),
          current: request.status === 'pending_hr',
          actor: request.hrName,
          time: request.hrApprovedAt,
        },
        {
          num: 4,
          title: 'ผู้บริหารอนุมัติขั้นสุดท้าย',
          done: Boolean(request.managerApprovedAt),
          current: request.status === 'pending_manager',
          actor: request.managerName,
          time: request.managerApprovedAt,
        },
        {
          num: 5,
          title: 'พนักงานยืนยันรับเอกสาร',
          done: Boolean(request.receivedAt),
          current: request.status === 'approved',
          actor: request.receivedAt ? request.requesterName : null,
          time: request.receivedAt,
        },
      ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้ารายการ</span>
          </button>
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="font-mono font-bold text-blue-900 tabular-nums">
                {request.docNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span>{DELIVERY_LABELS[request.deliveryMethod]}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {formMeta?.titleTh || request.formType}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-1 ${statusMeta.textClass}`}>
            {effectiveStatusLabel}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ / บันทึกเป็น PDF</span>
          </button>
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <div className="border border-slate-200 bg-white rounded-lg p-5 no-print">
        <div className="text-xs font-bold text-slate-800 mb-3">
          {isFingerScanRequest
            ? 'สถานะลำดับขั้นการอนุมัติ (2 ขั้นตอน - พนักงานผู้ร้องขอ และหัวหน้าแผนก)'
            : isItRequest
            ? 'สถานะลำดับขั้นการอนุมัติ (3 ขั้นตอน - เอกสารสารสนเทศ)'
            : 'สถานะลำดับขั้นการอนุมัติ (5 ขั้นตอน)'}
        </div>
        <div
          className={`grid grid-cols-1 gap-3 ${
            isFingerScanRequest
              ? 'sm:grid-cols-2'
              : isItRequest
              ? 'sm:grid-cols-3'
              : 'sm:grid-cols-5'
          }`}
        >
          {steps.map((s) => (
            <div
              key={s.num}
              className={`border rounded-lg p-3 ${
                s.done
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : s.current && request.status !== 'rejected'
                  ? 'border-blue-800 bg-blue-50/40'
                  : 'border-slate-200 bg-slate-50/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span
                  className={
                    s.done
                      ? 'text-emerald-800'
                      : s.current && request.status !== 'rejected'
                      ? 'text-blue-900'
                      : 'text-slate-500'
                  }
                >
                  {s.num}. {s.title}
                </span>
                {s.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : s.current && request.status !== 'rejected' ? (
                  <Clock className="w-4 h-4 text-blue-800 shrink-0" />
                ) : null}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-600 truncate">
                {s.actor || (s.current ? 'กำลังรอพิจารณา' : 'รอลำดับถัดไป')}
              </div>
              {s.time && (
                <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                  {new Date(s.time).toLocaleString('th-TH', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {request.status === 'rejected' && (
          <div className="mt-4 border border-red-200 bg-red-50 rounded-lg p-3.5 flex items-start gap-2.5 text-sm text-red-800">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">เอกสารถูกปฏิเสธโดย {request.rejectedBy}:</span>{' '}
              <span>{request.rejectedReason}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Panel for Approver OR Employee Receipt */}
      {(canApproveCurrentStep || canConfirmReceipt) && (
        <div className="border border-blue-200 bg-white rounded-lg p-5 space-y-4 no-print">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
            <UserCheck className="w-4 h-4" />
            <span>
              {canConfirmReceipt
                ? 'ยืนยันการรับเอกสาร (สำหรับพนักงานผู้ยื่นคำร้อง)'
                : `ดำเนินการพิจารณาอนุมัติ (${effectiveStatusLabel})`}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7">
              <SignaturePad
                value={actionSig}
                onChange={setActionSig}
                savedSignature={dbUser?.signatureUrl}
                label={
                  canConfirmReceipt
                    ? 'ลงลายมือชื่อรับเอกสาร (Receipt Signature)'
                    : 'ลงลายมือชื่อผู้อนุมัติ (Approver E-Signature)'
                }
              />
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ความเห็นเพิ่มเติม / เหตุผล (บังคับระบุหากไม่อนุมัติ)
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    canConfirmReceipt
                      ? 'เช่น ได้รับเอกสารฉบับจริง / ไฟล์ PDF ครบถ้วนแล้ว'
                      : 'ระบุความเห็นหรือเหตุผลประกอบการพิจารณา...'
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
                />
              </div>

              {actionError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {actionError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2.5">
                {canApproveCurrentStep && (
                  <>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => handleAction('reject')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>ไม่อนุมัติ (Reject)</span>
                    </button>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => handleAction('approve')}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {processing ? 'กำลังบันทึก...' : 'อนุมัติคำร้อง (Approve)'}
                      </span>
                    </button>
                  </>
                )}

                {canConfirmReceipt && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => handleAction('receive')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {processing
                        ? 'กำลังบันทึก...'
                        : 'ยืนยันการรับเอกสาร (Received)'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standalone IT Comment Panel for F-GA-007 */}
      {canWriteItComment && (
        <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-3 no-print">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MessageSquarePlus className="w-4 h-4 text-blue-900" />
              <span>ความคิดเห็นเจ้าหน้าที่ IT (แสดงในช่องความคิดเห็นของเอกสาร F-GA-007)</span>
            </div>
            {request.itCommentAt && (
              <span className="text-[11px] text-slate-400 tabular-nums">
                บันทึกล่าสุด{' '}
                {new Date(request.itCommentAt).toLocaleString('th-TH', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <textarea
              rows={2}
              value={itCommentInput}
              onChange={(e) => setItCommentInput(e.target.value)}
              placeholder="เช่น รับเรื่องดำเนินการแล้ว, รอจัดซื้ออะไหล่, ตรวจสอบเครื่องเรียบร้อย..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
            />
            <button
              type="button"
              disabled={savingItComment || !itCommentInput.trim()}
              onClick={handleSaveItComment}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap transition-colors"
            >
              {savingItComment ? 'กำลังบันทึก...' : 'บันทึกความคิดเห็น IT'}
            </button>
          </div>
          {itCommentError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {itCommentError}
            </div>
          )}
          {itCommentNotice && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
              {itCommentNotice}
            </div>
          )}
        </div>
      )}

      {/* Official Corporate Document Paper */}
      <OfficialFormRenderer
        formType={request.formType as FormCode}
        data={request.formData}
        mode="view"
        requestMeta={request}
        deliveryMethod={request.deliveryMethod}
      />

      {/* Audit Logs & Automated Email Notification History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="border border-slate-200 bg-white rounded-lg p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            ประวัติการดำเนินการเอกสาร (Audit Trail)
          </h3>
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {log.actorName}{' '}
                    <span className="font-normal text-slate-500">
                      ({ROLE_LABELS[log.actorRole as UserRole] || log.actorRole})
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {log.comment || log.action}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('th-TH', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-slate-200 bg-white rounded-lg p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-900" />
            <span>บันทึกการส่งอีเมลแจ้งเตือนอัตโนมัติ</span>
          </h3>
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              ระบบจะส่งอีเมลแจ้งเตือนไปยังผู้ยื่นคำร้อง ({request.requesterEmail}) โดยอัตโนมัติเมื่อเอกสารผ่านการอนุมัติขั้นสุดท้ายหรือถูกปฏิเสธ
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="border border-slate-200 bg-slate-50/50 rounded-lg p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-emerald-700">
                      ส่งถึง: {n.recipientEmail}
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {new Date(n.sentAt).toLocaleString('th-TH', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {n.subject}
                  </div>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                    {n.body}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
