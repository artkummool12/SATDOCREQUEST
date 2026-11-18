import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  getUserAccessLevel,
  isItOfficerUser,
  type AccessLevel,
} from '../lib/roles';
import type { AppUser, BellNotificationItem } from '../types/document';

interface NotificationBellProps {
  dbUser: AppUser;
  notifications: BellNotificationItem[];
  onSelectRequest: (requestId: string) => void;
  onRefresh?: () => void;
}

const ACCESS_LEVEL_TITLE: Record<AccessLevel, string> = {
  admin: 'แจ้งเตือนผู้ดูแลระบบ (ทั้งหมด)',
  hr: 'แจ้งเตือนฝ่ายบุคคล (ทุกแผนก)',
  supervisor: 'แจ้งเตือนหัวหน้าแผนก (ผู้ใต้บังคับบัญชา)',
  staff: 'แจ้งเตือนระดับ Staff (ภายในแผนก)',
  employee: 'แจ้งเตือนคำร้องของคุณ',
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  dbUser,
  notifications,
  onSelectRequest,
  onRefresh,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const storageKey = `docflow_bell_read_${dbUser.uid}`;

  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setReadIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setReadIds([]);
    }
  }, [storageKey]);

  const persistReadIds = (next: string[]) => {
    const trimmed = next.slice(-200);
    setReadIds(trimmed);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch {
      // ignore storage quota errors
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readSet.has(n.id)).length;
  }, [notifications, readSet]);

  const actionRequiredCount = useMemo(() => {
    return notifications.filter(
      (n) => n.category === 'action_required' && !readSet.has(n.id)
    ).length;
  }, [notifications, readSet]);

  const accessLevel = getUserAccessLevel(dbUser);
  const bellHeaderTitle =
    accessLevel === 'employee' && isItOfficerUser(dbUser)
      ? 'แจ้งเตือนเจ้าหน้าที่ IT (คำร้องสารสนเทศ SAT0417)'
      : ACCESS_LEVEL_TITLE[accessLevel];

  const handleOpenItem = (item: BellNotificationItem) => {
    if (!readSet.has(item.id)) {
      persistReadIds([...readIds, item.id]);
    }
    setOpen(false);
    onSelectRequest(item.requestId);
  };

  const handleMarkAllRead = () => {
    const allIds = Array.from(
      new Set([...readIds, ...notifications.map((n) => n.id)])
    );
    persistReadIds(allIds);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && onRefresh) {
            onRefresh();
          }
        }}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        aria-label="การแจ้งเตือน"
        title={bellHeaderTitle}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center tabular-nums ${
              actionRequiredCount > 0 ? 'bg-red-600' : 'bg-blue-900'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {bellHeaderTitle}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {dbUser.name} ({dbUser.employeeCode || dbUser.position})
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 hover:text-blue-700 whitespace-nowrap shrink-0"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-500">
                ยังไม่มีรายการแจ้งเตือนสำหรับสิทธิ์ของคุณ
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !readSet.has(item.id);
                const isAction = item.category === 'action_required';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenItem(item)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                      isUnread ? 'bg-blue-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isAction ? (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      ) : item.category === 'department' ? (
                        <Building2 className="w-4 h-4 text-blue-800" />
                      ) : item.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold truncate ${
                            isAction ? 'text-amber-800' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-800 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-slate-700 leading-snug">
                        {item.message}
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums pt-0.5">
                        {new Date(item.createdAt).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
