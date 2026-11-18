import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Upload,
  Download,
  UserPlus,
  Trash2,
  CheckCircle2,
  FileCode2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  deleteEmployee,
  listEmployees,
  syncCorporateDirectoryToFirestore,
  upsertEmployees,
} from '../lib/firestore-db';
import { generateEmployeesSqlScript } from '../lib/corporate-employees';
import {
  ROLE_LABELS,
  type EmployeeDirectoryRecord,
  type UserRole,
} from '../types/document';
import {
  canAccessEmployeeDatabaseMenu,
  resolveRoleFromPosition,
} from '../lib/roles';

interface ParsedEmployee {
  emp_no: string;
  name_th: string;
  department: string;
  division: string;
  position: string;
  role: string;
}

function parseEmployeesInput(raw: string): ParsedEmployee[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // 1. Try JSON array or object with employees array
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.employees)
      ? parsed.employees
      : [parsed];
    return arr
      .map((item: any) => {
        const position = String(item.position ?? '').trim();
        const department = String(item.department ?? '').trim();
        const division = String(item.division ?? '').trim();
        const deptLabel = division ? `${department} (${division})` : department;
        return {
          emp_no: String(item.emp_no ?? item.empNo ?? '').trim().toUpperCase(),
          name_th: String(item.name_th ?? item.nameTh ?? '').trim(),
          department,
          division,
          position,
          role: resolveRoleFromPosition(position, item.role, deptLabel),
        };
      })
      .filter((x: ParsedEmployee) => x.emp_no && x.name_th);
  }

  // 2. Try SQL INSERT INTO employees ... VALUES (...)
  if (/values\s*\(/i.test(trimmed) || /\(\s*['"]SAT/i.test(trimmed)) {
    const tupleRegex =
      /\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*(?:,\s*'([^']*)'\s*)?\)/g;
    const rows: ParsedEmployee[] = [];
    let match: RegExpExecArray | null;
    while ((match = tupleRegex.exec(trimmed)) !== null) {
      const department = match[3].trim();
      const division = match[4].trim();
      const position = match[5].trim();
      const deptLabel = division ? `${department} (${division})` : department;
      rows.push({
        emp_no: match[1].trim().toUpperCase(),
        name_th: match[2].trim(),
        department,
        division,
        position,
        role: resolveRoleFromPosition(position, match[6], deptLabel),
      });
    }
    if (rows.length > 0) return rows;
  }

  // 3. Fallback CSV (emp_no,name_th,department,division,position,role)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const csvRows: ParsedEmployee[] = [];
  for (const line of lines) {
    if (line.toLowerCase().startsWith('emp_no')) continue;
    const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length >= 2 && cols[0] && cols[1]) {
      const department = cols[2] || '';
      const division = cols[3] || '';
      const position = cols[4] || '';
      const deptLabel = division ? `${department} (${division})` : department;
      csvRows.push({
        emp_no: cols[0].toUpperCase(),
        name_th: cols[1],
        department,
        division,
        position,
        role: resolveRoleFromPosition(position, cols[5], deptLabel),
      });
    }
  }
  return csvRows;
}

export const EmployeesView: React.FC = () => {
  const { dbUser } = useAuth();
  const [employees, setEmployees] = useState<EmployeeDirectoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const [showImport, setShowImport] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [showSingleAdd, setShowSingleAdd] = useState(false);
  const [singleForm, setSingleForm] = useState<ParsedEmployee>({
    emp_no: '',
    name_th: '',
    department: '',
    division: '',
    position: '',
    role: 'employee',
  });

  const canManage = canAccessEmployeeDatabaseMenu(dbUser);

  const loadEmployees = useCallback(async () => {
    if (!canManage) {
      setEmployees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await listEmployees();
      setEmployees(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (deptFilter !== 'all' && e.department !== deptFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.empNo.toLowerCase().includes(q) ||
          e.nameTh.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.division.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, deptFilter, search]);

  const parsedPreview = useMemo(() => {
    if (!rawInput.trim()) {
      setParseError(null);
      return [];
    }
    try {
      const rows = parseEmployeesInput(rawInput);
      setParseError(
        rows.length === 0
          ? 'ไม่พบข้อมูลพนักงานในรูปแบบ JSON, SQL INSERT หรือ CSV'
          : null
      );
      return rows;
    } catch {
      setParseError('รูปแบบ JSON หรือข้อความนำเข้าไม่ถูกต้อง');
      return [];
    }
  }, [rawInput]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawInput(reader.result);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportSubmit = async () => {
    if (parsedPreview.length === 0) return;
    setImporting(true);
    setNotice(null);
    setParseError(null);
    try {
      const res = await upsertEmployees(
        parsedPreview.map((item) => ({
          empNo: item.emp_no,
          nameTh: item.name_th,
          department: item.department,
          division: item.division,
          position: item.position,
          role: item.role,
        }))
      );
      setNotice(
        `นำเข้าและอัปเดตข้อมูลพนักงานลง Firebase สำเร็จ ${res.importedCount} รายการ`
      );
      setRawInput('');
      setShowImport(false);
      await loadEmployees();
    } catch (err: any) {
      setParseError(err.message || 'ไม่สามารถนำเข้าข้อมูลได้');
    } finally {
      setImporting(false);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.emp_no.trim() || !singleForm.name_th.trim()) return;
    setImporting(true);
    setNotice(null);
    try {
      await upsertEmployees([
        {
          empNo: singleForm.emp_no,
          nameTh: singleForm.name_th,
          department: singleForm.department,
          division: singleForm.division,
          position: singleForm.position,
          role: singleForm.role,
        },
      ]);
      setNotice(`บันทึกพนักงาน ${singleForm.emp_no} ลง Firebase เรียบร้อยแล้ว`);
      setSingleForm({
        emp_no: '',
        name_th: '',
        department: '',
        division: '',
        position: '',
        role: 'employee',
      });
      setShowSingleAdd(false);
      await loadEmployees();
    } catch (err: any) {
      setParseError(err.message || 'ไม่สามารถเพิ่มข้อมูลพนักงานได้');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (empNo: string) => {
    try {
      await deleteEmployee(empNo);
      setNotice(`ลบข้อมูลพนักงาน ${empNo} แล้ว`);
      await loadEmployees();
    } catch (err: any) {
      setParseError(err.message || 'ไม่สามารถลบข้อมูลได้');
    }
  };

  const handleExportJson = () => {
    const payload = employees.map((e) => ({
      emp_no: e.empNo,
      name_th: e.nameTh,
      department: e.department,
      division: e.division,
      position: e.position,
      role: e.role,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSql = () => {
    const sqlText = generateEmployeesSqlScript(employees);
    const blob = new Blob([sqlText], {
      type: 'text/sql;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees_and_workflow_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSyncCorporateDirectory = async () => {
    setImporting(true);
    setNotice(null);
    setParseError(null);
    try {
      const count = await syncCorporateDirectoryToFirestore();
      setNotice(`ซิงค์รายชื่อพนักงานมาตรฐานทั้ง ${count} รายการลง Firebase Firestore สำเร็จแล้ว`);
      await loadEmployees();
    } catch (err: any) {
      setParseError(err.message || 'ไม่สามารถซิงค์ข้อมูลพนักงานได้');
    } finally {
      setImporting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="border border-slate-200 bg-white rounded-lg p-8 text-center space-y-2">
        <Users className="w-9 h-9 text-slate-300 mx-auto" />
        <h2 className="text-sm font-bold text-slate-900">
          ไม่มีสิทธิ์เข้าถึงเมนูฐานข้อมูลพนักงาน
        </h2>
        <p className="text-xs text-slate-500">
          เมนูนี้จำกัดสิทธิ์การแสดงผลและการจัดการเฉพาะฝ่าย / ตำแหน่ง Administrator เท่านั้น
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 bg-white rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            ฐานข้อมูลรายชื่อพนักงาน (Employees Directory)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดเก็บข้อมูลรหัสพนักงาน ชื่อ-สกุล แผนก ส่วนงาน และตำแหน่งใน Firebase Firestore เพื่อดึงใช้งานในแบบฟอร์มอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportSql}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด SQL (.sql)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด employees.json</span>
          </button>

          {canManage && (
            <>
              <button
                type="button"
                disabled={importing}
                onClick={handleSyncCorporateDirectory}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-900 border border-blue-200 bg-blue-50/60 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>ซิงค์ข้อมูล 112 คน</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSingleAdd((v) => !v);
                  setShowImport(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>เพิ่มพนักงาน</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImport((v) => !v);
                  setShowSingleAdd(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>นำเข้าข้อมูล (JSON / SQL / CSV)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {notice && (
        <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Bulk Import Panel */}
      {showImport && canManage && (
        <div className="border border-blue-200 bg-white rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-blue-900" />
                <span>นำเข้าข้อมูลพนักงานจำนวนมาก (JSON / SQL INSERT / CSV)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                วางคำสั่ง SQL INSERT INTO employees ... VALUES (...) หรือข้อมูล JSON / อัปโหลดไฟล์ employees.json ได้ทันที ระบบจะอัปเดตข้อมูลให้โดยอัตโนมัติตามรหัสพนักงาน
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 border border-blue-200 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100">
              <Upload className="w-3.5 h-3.5" />
              <span>เลือกไฟล์ .json / .sql / .csv</span>
              <input
                type="file"
                accept=".json,.sql,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            rows={6}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={`ตัวอย่าง SQL:\nINSERT INTO employees (emp_no, name_th, department, division, position, role) VALUES\n('SAT0055', 'นายตัวอย่าง ทดสอบ', 'Production', 'Press', 'Staff', 'employee');\n\nหรือ JSON:\n[{"emp_no": "SAT0055", "name_th": "นายตัวอย่าง ทดสอบ", "department": "Production", "division": "Press", "position": "Staff", "role": "employee"}]`}
            className="w-full border border-slate-300 rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-blue-800"
          />

          {parseError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {parseError}
            </div>
          )}

          {parsedPreview.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">
                ตัวอย่างข้อมูลที่ตรวจสอบพบ ({parsedPreview.length} รายการ):
              </div>
              <div className="overflow-x-auto max-h-48 border border-slate-200 rounded">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">รหัสพนักงาน</th>
                      <th className="py-2 px-3">ชื่อ - นามสกุล</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Division</th>
                      <th className="py-2 px-3">Position</th>
                      <th className="py-2 px-3">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreview.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-3 font-mono font-semibold">
                          {r.emp_no}
                        </td>
                        <td className="py-1.5 px-3">{r.name_th}</td>
                        <td className="py-1.5 px-3">{r.department}</td>
                        <td className="py-1.5 px-3">{r.division}</td>
                        <td className="py-1.5 px-3">{r.position}</td>
                        <td className="py-1.5 px-3">{r.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              ปิด
            </button>
            <button
              type="button"
              disabled={parsedPreview.length === 0 || importing}
              onClick={handleImportSubmit}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {importing
                ? 'กำลังนำเข้า...'
                : `ยืนยันนำเข้า ${parsedPreview.length} รายการ`}
            </button>
          </div>
        </div>
      )}

      {/* Single Employee Add Panel */}
      {showSingleAdd && canManage && (
        <form
          onSubmit={handleSingleSubmit}
          className="border border-slate-200 bg-white rounded-lg p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900">
            เพิ่มข้อมูลพนักงานรายบุคคล
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={singleForm.emp_no}
              onChange={(e) =>
                setSingleForm({ ...singleForm, emp_no: e.target.value })
              }
              placeholder="รหัสพนักงาน (เช่น SAT0060)"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
            />
            <input
              type="text"
              required
              value={singleForm.name_th}
              onChange={(e) =>
                setSingleForm({ ...singleForm, name_th: e.target.value })
              }
              placeholder="ชื่อ - นามสกุล (ภาษาไทย)"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={singleForm.department}
              onChange={(e) =>
                setSingleForm({ ...singleForm, department: e.target.value })
              }
              placeholder="Department (เช่น Production)"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={singleForm.division}
              onChange={(e) =>
                setSingleForm({ ...singleForm, division: e.target.value })
              }
              placeholder="Division (เช่น HR/GA, Press)"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={singleForm.position}
              onChange={(e) =>
                setSingleForm({ ...singleForm, position: e.target.value })
              }
              placeholder="Position (เช่น Senior Officer)"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
            <select
              value={singleForm.role}
              onChange={(e) =>
                setSingleForm({ ...singleForm, role: e.target.value })
              }
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
            >
              <option value="employee">employee</option>
              <option value="manager">manager</option>
              <option value="hr">hr</option>
              <option value="dept_head">dept_head</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSingleAdd(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={importing}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg"
            >
              บันทึกพนักงาน
            </button>
          </div>
        </form>
      )}

      {/* Employee Directory Table */}
      <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-600 tabular-nums">
            ทั้งหมด {filtered.length} รายการ
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 bg-white"
            >
              <option value="all">ทุกแผนก (Department)</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหารหัส SAT, ชื่อ, ตำแหน่ง..."
                className="w-full sm:w-64 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-800">
              ไม่พบข้อมูลพนักงาน
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[740px] text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-3">รหัสพนักงาน</th>
                  <th className="py-2.5 px-3">ชื่อ - นามสกุล</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Division</th>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-3">Role</th>
                  {canManage && <th className="py-2.5 px-3 text-right">ลบ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-xs font-bold text-blue-900 tabular-nums whitespace-nowrap">
                      {emp.empNo}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {emp.nameTh}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {emp.department || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {emp.division || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {emp.position || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {ROLE_LABELS[emp.role as UserRole] || emp.role}
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(emp.empNo)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
