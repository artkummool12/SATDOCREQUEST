import React, { useEffect, useState } from 'react';
import { Save, Users, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAllUsers,
  listEmployees,
  updateUserProfile,
} from '../lib/firestore-db';
import {
  ROLE_LABELS,
  type AppUser,
  type EmployeeDirectoryRecord,
  type UserRole,
} from '../types/document';
import { resolveRoleFromPosition } from '../lib/roles';
import { SignaturePad } from './SignaturePad';

export const ProfileSettingsView: React.FC = () => {
  const { dbUser, refreshProfile } = useAuth();
  const [name, setName] = useState(dbUser?.name || '');
  const [employeeCode, setEmployeeCode] = useState(dbUser?.employeeCode || '');
  const [position, setPosition] = useState(dbUser?.position || '');
  const [department, setDepartment] = useState(dbUser?.department || '');
  const [role, setRole] = useState<UserRole>(dbUser?.role || 'employee');
  const [signatureUrl, setSignatureUrl] = useState<string>(
    dbUser?.signatureUrl || ''
  );

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [directory, setDirectory] = useState<EmployeeDirectoryRecord[]>([]);

  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name);
      setEmployeeCode(dbUser.employeeCode);
      setPosition(dbUser.position);
      setDepartment(dbUser.department);
      setRole(dbUser.role);
      setSignatureUrl(dbUser.signatureUrl || '');
    }
  }, [dbUser]);

  const loadUsers = async () => {
    try {
      const list = await getAllUsers();
      setAllUsers(list);
    } catch {
      // ignore if inaccessible
    }
  };

  useEffect(() => {
    loadUsers();
    listEmployees()
      .then((list) => setDirectory(list))
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser) return;
    setSaving(true);
    setError(null);
    setSavedNotice(null);
    try {
      await updateUserProfile(dbUser.uid, {
        name,
        employeeCode,
        position,
        department,
        signatureUrl,
        role,
      });
      await refreshProfile();
      await loadUsers();
      setSavedNotice('บันทึกข้อมูลส่วนตัวและลายเซ็นลง Firebase เรียบร้อยแล้ว');
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeUserRole = async (targetUid: string, nextRole: UserRole) => {
    try {
      await updateUserProfile(targetUid, { role: nextRole });
      await loadUsers();
      if (targetUid === dbUser?.uid) {
        await refreshProfile();
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเปลี่ยนสิทธิ์ผู้ใช้ได้');
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSaveProfile}
        className="border border-slate-200 bg-white rounded-lg p-6 space-y-5"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            ข้อมูลพนักงานและลายเซ็นมาตรฐาน
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ข้อมูลนี้จะถูกกรอกอัตโนมัติลงในแบบฟอร์มเอกสารทั้ง 8 ประเภทเมื่อคุณยื่นคำร้อง
          </p>
        </div>

        {directory.length > 0 && (
          <div className="border border-slate-200 bg-slate-50/70 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700">
              เชื่อมโยงบัญชีเข้ากับรหัสพนักงานในฐานข้อมูล:
            </span>
            <select
              value={employeeCode}
              onChange={(e) => {
                const emp = directory.find((x) => x.empNo === e.target.value);
                if (emp) {
                  const deptLabel = emp.division
                    ? `${emp.department} (${emp.division})`
                    : emp.department;
                  setEmployeeCode(emp.empNo);
                  setName(emp.nameTh);
                  setPosition(emp.position);
                  setDepartment(deptLabel);
                  setRole(
                    resolveRoleFromPosition(emp.position, emp.role, deptLabel)
                  );
                } else {
                  setEmployeeCode(e.target.value);
                }
              }}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 sm:min-w-[300px]"
            >
              <option value="">-- เลือกรหัสพนักงาน (เช่น SAT0011) --</option>
              {directory.map((emp) => (
                <option key={emp.empNo} value={emp.empNo}>
                  {emp.empNo} - {emp.nameTh} ({emp.position})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อ - นามสกุล (ภาษาไทย / อังกฤษ)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รูปแบบบัญชีที่เข้าสู่ระบบ
            </label>
            <input
              type="text"
              value={
                dbUser?.email?.endsWith('.local')
                  ? `เข้าสู่ระบบด้วยรหัสพนักงาน (${dbUser.employeeCode})`
                  : dbUser?.email || ''
              }
              disabled
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสพนักงาน
            </label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="เช่น SAT0011"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ตำแหน่งงาน (Administrator → Admin / Assistant Manager → หัวหน้าแผนก)
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => {
                const nextPos = e.target.value;
                setPosition(nextPos);
                const autoRole = resolveRoleFromPosition(nextPos, role);
                if (autoRole === 'admin' || autoRole === 'dept_head') {
                  setRole(autoRole);
                }
              }}
              placeholder="เช่น Administrator หรือ Assistant Manager"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              แผนก / ฝ่าย
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="เช่น ฝ่ายทรัพยากรบุคคลและธุรการ"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              บทบาทผู้ใช้งานในระบบ (สามารถสลับเพื่อทดสอบขั้นตอนอนุมัติได้)
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-800"
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <SignaturePad
          value={signatureUrl}
          onChange={setSignatureUrl}
          label="ลายเซ็นมาตรฐานส่วนตัว (บันทึกไว้เพื่อเรียกใช้ซ้ำอย่างรวดเร็ว)"
        />

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-800 px-4 py-2.5 rounded-lg text-xs">
            {error}
          </div>
        )}
        {savedNotice && (
          <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
          </button>
        </div>
      </form>

      {/* Admin User Directory */}
      {dbUser?.role === 'admin' && allUsers.length > 0 && (
        <div className="border border-slate-200 bg-white rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-900" />
            <h3 className="text-sm font-bold text-slate-900">
              จัดการสิทธิ์ผู้ใช้งานทั้งหมด ({allUsers.length} บัญชี)
            </h3>
          </div>
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[640px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3">ชื่อ-สกุล</th>
                  <th className="py-2.5 px-3">อีเมล</th>
                  <th className="py-2.5 px-3">แผนก</th>
                  <th className="py-2.5 px-3">บทบาท (Role)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      {u.email}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      {u.department}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="inline-flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleChangeUserRole(
                              u.uid,
                              e.target.value as UserRole
                            )
                          }
                          className="border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                        >
                          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
