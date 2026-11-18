import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardCheck,
  Bell,
  UserCog,
  LogOut,
  Menu,
  X,
  Plus,
  Users,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { NewRequestView } from './components/NewRequestView';
import { ApprovalQueueView } from './components/ApprovalQueueView';
import { RequestDetailModal } from './components/RequestDetailModal';
import { NotificationsView } from './components/NotificationsView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { EmployeesView } from './components/EmployeesView';
import { NotificationBell } from './components/NotificationBell';
import {
  buildBellNotificationsForUser,
  listRequestsForUser,
  subscribeRequestsForUser,
} from './lib/firestore-db';
import {
  canAccessEmployeeDatabaseMenu,
  isHrApproverUser,
  isItOfficerUser,
} from './lib/roles';
import {
  ROLE_LABELS,
  type BellNotificationItem,
  type DocumentRequest,
} from './types/document';

type ActiveTab =
  | 'dashboard'
  | 'new_request'
  | 'approvals'
  | 'employees'
  | 'notifications'
  | 'profile';

const MainShell: React.FC = () => {
  const {
    dbUser,
    loading,
    authError,
    loginWithEmployeeCode,
    loginWithGoogle,
    loginWithMicrosoft,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!dbUser) return;
    setLoadingRequests(true);
    try {
      const list = await listRequestsForUser(dbUser);
      setRequests(list);
    } catch (err) {
      console.error('Failed to fetch requests from Firestore:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, [dbUser]);

  useEffect(() => {
    if (!dbUser) {
      setRequests([]);
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);
    const unsubscribe = subscribeRequestsForUser(
      dbUser,
      (visibleRequests) => {
        setRequests(visibleRequests);
        setLoadingRequests(false);
      },
      (err) => {
        console.error('Realtime Firestore subscription error:', err);
        setLoadingRequests(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [dbUser]);

  const bellNotifications = useMemo<BellNotificationItem[]>(() => {
    if (!dbUser) return [];
    return buildBellNotificationsForUser(dbUser, requests);
  }, [dbUser, requests]);

  const pendingActionCount = useMemo(() => {
    if (!dbUser) return 0;
    const userIsHr = isHrApproverUser(dbUser);
    const userIsIt = isItOfficerUser(dbUser);
    return requests.filter((req) => {
      if (dbUser.role === 'admin') {
        return (
          ['pending_dept_head', 'pending_hr', 'pending_manager'].includes(
            req.status
          ) ||
          (req.status === 'approved' && req.formType !== 'F-HR-011')
        );
      }
      if (dbUser.role === 'dept_head' && req.status === 'pending_dept_head')
        return true;
      if (
        (userIsHr || (userIsIt && req.formType === 'F-GA-007')) &&
        req.status === 'pending_hr'
      )
        return true;
      if (dbUser.role === 'manager' && req.status === 'pending_manager')
        return true;
      if (
        req.status === 'approved' &&
        req.requesterUid === dbUser.uid &&
        req.formType !== 'F-HR-011'
      )
        return true;
      return false;
    }).length;
  }, [requests, dbUser]);

  const canSeeEmployeesMenu = canAccessEmployeeDatabaseMenu(dbUser);

  useEffect(() => {
    if (activeTab === 'employees' && dbUser && !canSeeEmployeesMenu) {
      setActiveTab('dashboard');
    }
  }, [activeTab, dbUser, canSeeEmployeesMenu]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600">
          กำลังโหลดระบบจัดการเอกสาร...
        </div>
      </div>
    );
  }

  if (!dbUser) {
    return (
      <LoginScreen
        onLoginEmployeeCode={loginWithEmployeeCode}
        onLoginGoogle={loginWithGoogle}
        onLoginMicrosoft={loginWithMicrosoft}
        error={authError}
      />
    );
  }

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }> = [
    { id: 'dashboard', label: 'หน้าหลักคำร้องเอกสาร', icon: LayoutDashboard },
    { id: 'new_request', label: 'ยื่นคำร้องเอกสารใหม่', icon: FilePlus2 },
    {
      id: 'approvals',
      label: 'รออนุมัติ / ยืนยันรับ',
      icon: ClipboardCheck,
      badgeCount: pendingActionCount,
    },
    ...(canSeeEmployeesMenu
      ? [{ id: 'employees' as const, label: 'ฐานข้อมูลพนักงาน', icon: Users }]
      : []),
    { id: 'notifications', label: 'แจ้งเตือนทางอีเมล', icon: Bell },
    { id: 'profile', label: 'ข้อมูลส่วนตัวและสิทธิ์', icon: UserCog },
  ];

  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedRequestId(null);
    setMobileMenuOpen(false);
  };

  const pageTitle = selectedRequestId
    ? 'รายละเอียดและพิจารณาเอกสาร'
    : navItems.find((n) => n.id === activeTab)?.label || 'หน้าหลัก';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 text-slate-100 no-print">
        <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-white rounded-md px-2 py-1 flex items-center justify-center shrink-0">
            <img
              src="/assets/aistudio/LOGO_34f0bd18.png"
              alt="SUMINO AAPICO"
              className="h-6 w-auto object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-tight text-white truncate">
              SUMINO AAPICO
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              ระบบเอกสารองค์กร
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id && !selectedRequestId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-900 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                  <span className="font-mono text-xs font-semibold text-amber-300 tabular-nums">
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="text-xs">
            <div className="font-semibold text-white truncate">
              {dbUser.name}
            </div>
            <div className="text-slate-400 truncate mt-0.5">
              {dbUser.employeeCode ? `${dbUser.employeeCode} · ` : ''}
              {dbUser.position || ROLE_LABELS[dbUser.role]}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {dbUser.department}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-100 flex flex-col h-full">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="bg-white rounded px-1.5 py-0.5 shrink-0">
                  <img
                    src="/assets/aistudio/LOGO_34f0bd18.png"
                    alt="SUMINO AAPICO"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <span className="text-sm font-bold text-white truncate">
                  ระบบเอกสารองค์กร
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id && !selectedRequestId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-900 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.badgeCount === 'number' &&
                      item.badgeCount > 0 && (
                        <span className="font-mono text-xs text-amber-300 tabular-nums">
                          {item.badgeCount}
                        </span>
                      )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-2.5">
              <div className="text-xs text-slate-300 truncate">
                {dbUser.employeeCode} · {dbUser.name}
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img
              src="/assets/aistudio/LOGO_34f0bd18.png"
              alt="SUMINO AAPICO"
              className="h-8 w-auto object-contain shrink-0"
            />
            <div className="hidden sm:block h-5 w-px bg-slate-200 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {pageTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <NotificationBell
              dbUser={dbUser}
              notifications={bellNotifications}
              onSelectRequest={(id) => setSelectedRequestId(id)}
              onRefresh={loadRequests}
            />

            <button
              type="button"
              onClick={() => {
                setSelectedRequestId(null);
                setActiveTab('new_request');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>ยื่นคำร้องใหม่</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {selectedRequestId ? (
            <RequestDetailModal
              requestId={selectedRequestId}
              onBack={() => setSelectedRequestId(null)}
              onUpdated={loadRequests}
            />
          ) : activeTab === 'dashboard' ? (
            <DashboardView
              requests={requests}
              loading={loadingRequests}
              onSelectRequest={(id) => setSelectedRequestId(id)}
              onCreateNew={() => setActiveTab('new_request')}
            />
          ) : activeTab === 'new_request' ? (
            <NewRequestView
              onSubmitted={(newId) => {
                setSelectedRequestId(newId);
                setActiveTab('dashboard');
              }}
              onCancel={() => setActiveTab('dashboard')}
            />
          ) : activeTab === 'approvals' ? (
            <ApprovalQueueView
              requests={requests}
              onSelectRequest={(id) => setSelectedRequestId(id)}
            />
          ) : activeTab === 'employees' && canSeeEmployeesMenu ? (
            <EmployeesView />
          ) : activeTab === 'notifications' ? (
            <NotificationsView
              onSelectRequest={(id) => setSelectedRequestId(id)}
            />
          ) : (
            <ProfileSettingsView />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainShell />
    </AuthProvider>
  );
}
