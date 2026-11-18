import React, { useEffect, useState } from 'react';
import { Mail, Eye, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listEmailNotifications } from '../lib/firestore-db';
import type { EmailNotification } from '../types/document';

interface NotificationsViewProps {
  onSelectRequest: (requestId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onSelectRequest,
}) => {
  const { dbUser } = useAuth();
  const [items, setItems] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbUser) return;
    const load = async () => {
      setLoading(true);
      try {
        const list = await listEmailNotifications(dbUser);
        setItems(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dbUser]);

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 bg-white rounded-lg p-5">
        <h2 className="text-base font-bold text-slate-900">
          ประวัติการแจ้งเตือนทางอีเมลอัตโนมัติ
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          บันทึกอีเมลแจ้งผลอนุมัติขั้นสุดท้ายที่ระบบส่งไปยังอีเมลที่พนักงานลงทะเบียนไว้
        </p>
      </div>

      {loading ? (
        <div className="border border-slate-200 bg-white rounded-lg p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-slate-200 bg-white rounded-lg py-14 px-6 text-center">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">
            ยังไม่มีประวัติการแจ้งเตือนอีเมล
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            เมื่อเอกสารได้รับการอนุมัติขั้นสุดท้ายจากผู้บริหาร ระบบจะส่งอีเมลแจ้งเตือนและบันทึกประวัติไว้ที่นี่
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className="border border-slate-200 bg-white rounded-lg p-5 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-900">
                    ถึง: {n.recipientEmail}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500 tabular-nums">
                    {new Date(n.sentAt).toLocaleString('th-TH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectRequest(n.requestId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 border border-blue-200 bg-blue-50/70 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>เปิดดูเอกสาร</span>
                </button>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {n.subject}
              </div>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 border border-slate-100 rounded p-3">
                {n.body}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
