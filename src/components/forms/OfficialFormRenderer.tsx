import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  type DeliveryMethod,
  type DocumentRequest,
  type FormCode,
} from '../../types/document';

interface OfficialFormRendererProps {
  formType: FormCode;
  data: Record<string, any>;
  onChange?: (next: Record<string, any>) => void;
  mode: 'edit' | 'view';
  requestMeta?: DocumentRequest;
  deliveryMethod?: DeliveryMethod;
}

const COMPANY_LOGO = '/assets/aistudio/LOGO_34f0bd18.png';

export const OfficialFormRenderer: React.FC<OfficialFormRendererProps> = ({
  formType,
  data,
  onChange,
  mode,
  requestMeta,
}) => {
  const isReadOnly = mode === 'view';

  const updateField = (key: string, value: any) => {
    if (isReadOnly || !onChange) return;
    onChange({ ...data, [key]: value });
  };

  const formatDateTh = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(iso);
    }
  };

  // Inline dotted input / span matching real Thai corporate paper forms
  const renderLineInput = (
    key: string,
    placeholder = '',
    widthClass = 'w-40',
    type: 'text' | 'date' | 'number' = 'text',
    alignClass = ''
  ) => {
    const val = data[key] ?? '';
    if (isReadOnly) {
      return (
        <span
          className={`inline-block border-b border-dotted border-slate-700 px-1.5 min-h-[20px] text-blue-950 font-medium text-xs sm:text-sm ${widthClass} ${alignClass} ${
            type === 'number' || type === 'date' ? 'tabular-nums' : ''
          }`}
        >
          {val || '\u00A0'}
        </span>
      );
    }
    return (
      <input
        type={type}
        value={val}
        onChange={(e) => updateField(key, e.target.value)}
        placeholder={placeholder}
        className={`border-0 border-b border-dotted border-slate-600 bg-blue-50/20 px-1.5 py-0.5 text-xs sm:text-sm text-blue-950 font-medium focus:outline-none focus:border-blue-800 focus:bg-blue-50/50 ${widthClass} ${alignClass} ${
          type === 'number' || type === 'date' ? 'tabular-nums' : ''
        }`}
      />
    );
  };

  const renderCellInput = (
    key: string,
    placeholder = '',
    type: 'text' | 'date' | 'number' = 'text'
  ) => {
    const val = data[key] ?? '';
    if (isReadOnly) {
      return (
        <span className="block text-xs sm:text-sm text-blue-950 font-medium break-words">
          {val || '-'}
        </span>
      );
    }
    return (
      <input
        type={type}
        value={val}
        onChange={(e) => updateField(key, e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 border border-slate-200 bg-blue-50/20 rounded px-2 py-1 text-xs sm:text-sm text-blue-950 font-medium focus:outline-none focus:border-blue-800"
      />
    );
  };

  const renderCheck = (key: string, label?: React.ReactNode) => {
    const checked = Boolean(data[key]);
    return (
      <label
        className={`inline-flex items-start gap-2 text-xs sm:text-sm text-slate-900 ${
          isReadOnly ? 'cursor-default' : 'cursor-pointer'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={isReadOnly}
          onChange={(e) => updateField(key, e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-slate-900 border border-slate-900 shrink-0"
        />
        {label && <span className="leading-snug">{label}</span>}
      </label>
    );
  };

  const renderLogoMark = (compact = false) => (
    <div className="flex flex-col items-center justify-center shrink-0">
      <img
        src={COMPANY_LOGO}
        alt="SUMINO AAPICO"
        className={`${compact ? 'h-9' : 'h-11'} w-auto object-contain`}
      />
      <span className="text-[10px] font-extrabold tracking-wide text-slate-800 mt-0.5 whitespace-nowrap">
        SUMINO AAPICO
      </span>
    </div>
  );

  const renderSigImg = (
    url?: string | null,
    name?: string | null,
    dateStr?: string | null
  ) => (
    <div className="flex flex-col items-center justify-center min-h-[44px]">
      {url ? (
        <img
          src={url}
          alt={name || 'ลายเซ็น'}
          className="max-h-10 max-w-[140px] object-contain"
        />
      ) : null}
      {name && (
        <div className="text-[11px] font-medium text-slate-800 mt-0.5">
          {name} {dateStr ? `(${formatDateTh(dateStr)})` : ''}
        </div>
      )}
    </div>
  );

  // =========================================================================
  // 1. F-HR-011: ใบไม่ได้สแกนนิ้ว (Request for not a finger scan)
  // =========================================================================
  if (formType === 'F-HR-011') {
    return (
      <div className="paper-sheet bg-white border border-slate-300 p-4 sm:p-8 text-slate-900 shadow-xs">
        <div className="border-2 border-slate-900">
          {/* Header Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 border-b border-slate-900">
            <div className="sm:col-span-3 print:col-span-3 min-w-0 p-3 flex items-center justify-center border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900">
              {renderLogoMark()}
            </div>
            <div className="sm:col-span-6 print:col-span-6 min-w-0 p-3 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900">
              <div className="text-base sm:text-lg font-bold">
                ใบไม่ได้สแกนนิ้ว
              </div>
              <div className="text-xs sm:text-sm font-medium">
                Request for not a finger scan
              </div>
            </div>
            <div className="sm:col-span-3 print:col-span-3 min-w-0 p-3 flex items-center justify-center gap-2 text-xs sm:text-sm">
              <span className="font-medium shrink-0">วันที่ Date</span>
              {renderLineInput('requestDate', '', 'w-28 min-w-0', 'date')}
            </div>
          </div>

          {/* Employee Info 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 border-b border-slate-900 text-xs sm:text-sm">
            <div className="min-w-0 p-2.5 border-b sm:border-r print:border-r border-slate-900 flex items-center gap-2">
              <span className="w-28 shrink-0">ชื่อ Name</span>
              <div className="flex-1 min-w-0">{renderCellInput('fullName', 'ชื่อ-นามสกุล')}</div>
            </div>
            <div className="min-w-0 p-2.5 border-b border-slate-900 flex items-center gap-2">
              <span className="w-36 shrink-0">รหัสพนักงาน Emp.No.</span>
              <div className="flex-1 min-w-0">{renderCellInput('employeeCode', 'SAT0001')}</div>
            </div>
            <div className="min-w-0 p-2.5 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex items-center gap-2">
              <span className="w-28 shrink-0">ตำแหน่ง Position</span>
              <div className="flex-1 min-w-0">{renderCellInput('position', 'ตำแหน่ง')}</div>
            </div>
            <div className="min-w-0 p-2.5 flex items-center gap-2">
              <span className="w-36 shrink-0">แผนก Dept.</span>
              <div className="flex-1 min-w-0">{renderCellInput('department', 'แผนก')}</div>
            </div>
          </div>

          {/* Instruction */}
          <div className="px-3 py-2 border-b border-slate-900 text-xs sm:text-sm">
            กรุณาทำเครื่องหมายในช่องสี่เหลี่ยม เพื่อระบุวัตถุประสงค์ในการไม่ได้สแกนนิ้ว Please check in the box for purpose
          </div>

          {/* Permitting Time Record */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 border-b border-slate-900">
            <div className="sm:col-span-3 print:col-span-3 min-w-0 p-3 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 text-xs sm:text-sm">
              <div className="font-medium">ขออนุญาตบันทึกเวลา</div>
              <div className="text-xs text-slate-700">Permitting time record</div>
            </div>
            <div className="sm:col-span-9 print:col-span-9 min-w-0 p-3 space-y-2.5 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {renderCheck('checkIn', 'เข้า การปฏิบัติงาน เวลา')}
                    {renderLineInput('timeIn', '08.00 น.', 'w-20')}
                  </div>
                  <div className="text-xs text-slate-600 pl-6">
                    In working on time
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {renderCheck('checkOut', 'ออก การปฏิบัติงาน เวลา')}
                    {renderLineInput('timeOut', '17.00 น.', 'w-20')}
                  </div>
                  <div className="text-xs text-slate-600 pl-6">
                    Out working on time
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 pt-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>ปฏิบัติงาน ตั้งแต่เวลา</span>
                    {renderLineInput('workFromTime', '08.00', 'w-16')}
                    <span>ถึง</span>
                    {renderLineInput('workToTime', '17.00', 'w-16')}
                  </div>
                  <div className="text-xs text-slate-600">
                    Start working on time &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; To
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>ในวันที่</span>
                    {renderLineInput('workDay', '01', 'w-10', 'text', 'text-center')}
                    <span>เดือน</span>
                    {renderLineInput('workMonth', '01', 'w-12', 'text', 'text-center')}
                    <span>พ.ศ.</span>
                    {renderLineInput('workYear', '2569', 'w-14', 'text', 'text-center')}
                  </div>
                  <div className="text-xs text-slate-600">Date</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cause detail */}
          <div className="border-b border-slate-900 text-xs sm:text-sm">
            <div className="px-4 py-2 border-b border-slate-300 font-medium">
              เนื่องจาก กรณี ดังต่อไปนี้ Cause detail as below ;
            </div>
            <div className="px-6 py-2.5 border-b border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                {renderCheck('causeForgot', 'ลืม สแกนนิ้วมือ')}
                <div className="text-xs text-slate-600 pl-6">Forgot record</div>
              </div>
              <div>
                {renderCheck('causeNotPass', 'สแกนนิ้วมือไม่ผ่าน')}
                <div className="text-xs text-slate-600 pl-6">Not pass</div>
              </div>
            </div>
            <div className="px-6 py-2.5 border-b border-slate-300 space-y-1.5">
              {renderCheck('causeOutside', 'ทำงานนอกสถานที่ Outside working')}
              <div className="pl-6 flex items-center gap-2">
                <span className="shrink-0">สถานที่ไป Place</span>
                {renderLineInput('outsidePlace', 'ระบุสถานที่ปฏิบัติงาน', 'flex-1')}
              </div>
            </div>
            <div className="px-6 py-2.5 border-b border-slate-300 space-y-1.5">
              {renderCheck(
                'causeTraining',
                'เข้าร่วมงานอบรม / สัมมนา Outside Training'
              )}
              <div className="pl-6 flex items-center gap-2">
                <span className="shrink-0">สถานที่ไป Place</span>
                {renderLineInput('trainingPlace', 'ระบุสถานที่อบรม', 'flex-1')}
              </div>
            </div>
            <div className="px-6 py-2.5 flex flex-wrap items-center gap-2">
              {renderCheck('causeOther', 'อื่น ๆ (โปรดระบุ) Other')}
              {renderLineInput('causeOtherText', 'ระบุเหตุผลเพิ่มเติม', 'flex-1 min-w-[200px]')}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 border-b border-slate-900 text-xs sm:text-sm text-center">
            <div className="min-w-0 sm:col-start-1 sm:row-start-1 print:col-start-1 print:row-start-1 py-1.5 px-2 border-b sm:border-r print:border-r border-slate-900 flex items-center justify-center">
              ขอโดย / วันที่ Requested by / date
            </div>
            <div className="min-w-0 sm:col-start-1 sm:row-start-2 print:col-start-1 print:row-start-2 py-3 px-2 min-h-[56px] flex items-center justify-center border-b sm:border-r print:border-r border-slate-900">
              {renderSigImg(
                requestMeta?.requesterSignatureUrl,
                requestMeta?.requesterName || data.fullName,
                requestMeta?.createdAt
              )}
            </div>
            <div className="min-w-0 sm:col-start-1 sm:row-start-3 print:col-start-1 print:row-start-3 py-1.5 px-2 font-medium border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex items-center justify-center">
              พนักงาน Employee
            </div>

            <div className="min-w-0 sm:col-start-2 sm:row-start-1 print:col-start-2 print:row-start-1 py-1.5 px-2 border-b border-slate-900 flex items-center justify-center">
              อนุมัติโดย / วันที่ Approved by / date
            </div>
            <div className="min-w-0 sm:col-start-2 sm:row-start-2 print:col-start-2 print:row-start-2 py-3 px-2 min-h-[56px] flex items-center justify-center border-b border-slate-900">
              {renderSigImg(
                requestMeta?.deptHeadSignatureUrl ||
                  requestMeta?.managerSignatureUrl,
                requestMeta?.deptHeadName || requestMeta?.managerName,
                requestMeta?.deptHeadApprovedAt ||
                  requestMeta?.managerApprovedAt
              )}
            </div>
            <div className="min-w-0 sm:col-start-2 sm:row-start-3 print:col-start-2 print:row-start-3 py-1.5 px-2 font-medium flex items-center justify-center">
              หัวหน้าแผนกหรือผู้จัดการแผนก Dept. Head or Dept. Manager
            </div>
          </div>

          {/* Bottom Note */}
          <div className="px-3 py-2 text-xs font-medium">
            หมายเหตุ : ให้ยื่นแบบฟอร์มนี้ ภายใน 5 วันทำการ หลังจากมิได้ทำการสแกนนิ้วมือ ที่ฝ่ายบุคคล
          </div>
        </div>

        {/* Footer Code */}
        <div className="mt-2 flex flex-col items-end text-[11px] text-slate-700 leading-tight">
          <div className="font-mono font-semibold">F-HR-011 REV.00</div>
          <div>Effective Date : 15 Jun 18</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. F-HR-012: ใบขออนุญาตออกนอกบริเวณบริษัท
  // =========================================================================
  if (formType === 'F-HR-012') {
    return (
      <div className="paper-sheet bg-white border border-slate-300 p-4 sm:p-8 text-slate-900 shadow-xs">
        <div className="border-2 border-slate-900">
          {/* Header */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 border-b border-slate-900">
            <div className="sm:col-span-3 print:col-span-3 min-w-0 p-3 flex items-center justify-center border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900">
              {renderLogoMark()}
            </div>
            <div className="sm:col-span-6 print:col-span-6 min-w-0 p-3 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900">
              <div className="text-sm sm:text-base font-bold">
                ใบขออนุญาตออกนอกบริเวณบริษัท
              </div>
              <div className="text-xs">
                Request for leave company's premises during working time
              </div>
            </div>
            <div className="sm:col-span-3 print:col-span-3 min-w-0 p-2.5 flex flex-col justify-between text-xs">
              <div className="text-right font-semibold tracking-wider text-slate-600">
                ORIGINAL
              </div>
              <div className="flex items-center gap-1.5 justify-end pt-1">
                <span>วันที่ Date</span>
                {renderLineInput('requestDate', '', 'w-24 min-w-0', 'date')}
              </div>
            </div>
          </div>

          {/* Part 1 Bar */}
          <div className="bg-slate-400/50 border-b border-slate-900 py-1.5 text-center text-xs sm:text-sm font-bold">
            ส่วนที่ 1 สำหรับแผนกต้นสังกัด Part 1 For Respective Dept.
          </div>

          {/* Info 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 border-b border-slate-900 text-xs sm:text-sm">
            <div className="min-w-0 p-2 border-b sm:border-r print:border-r border-slate-900 flex items-center gap-2">
              <span className="w-28 shrink-0">ชื่อ Name</span>
              <div className="flex-1 min-w-0">{renderCellInput('fullName')}</div>
            </div>
            <div className="min-w-0 p-2 border-b border-slate-900 flex items-center gap-2">
              <span className="w-36 shrink-0">รหัสพนักงาน Emp.No.</span>
              <div className="flex-1 min-w-0">{renderCellInput('employeeCode')}</div>
            </div>
            <div className="min-w-0 p-2 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex items-center gap-2">
              <span className="w-28 shrink-0">ตำแหน่ง Position</span>
              <div className="flex-1 min-w-0">{renderCellInput('position')}</div>
            </div>
            <div className="min-w-0 p-2 flex items-center gap-2">
              <span className="w-36 shrink-0">แผนก Dept.</span>
              <div className="flex-1 min-w-0">{renderCellInput('department')}</div>
            </div>
          </div>

          {/* Instruction */}
          <div className="px-3 py-1.5 text-xs border-b border-slate-200">
            กรุณาทำเครื่องหมายในช่องสี่เหลี่ยม เพื่อระบุวัตถุประสงค์ในการออกนอกบริษัท Please check in the box for purpose
          </div>

          {/* Option 1, 2, 3 */}
          <div className="p-4 space-y-4 border-b border-slate-900 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <span className="font-semibold w-4">1</span>
              <div className="flex-1">
                {renderCheck(
                  'reasonPersonalLeave',
                  <span>
                    ลากิจธุระส่วนตัวในช่วงเวลางานซึ่งได้ยื่นใบลาแล้ว (กรณีฉุกเฉิน ต้องยื่นใบลาพร้อมแบบฟอร์มนี้ให้ผู้จัดการแผนกต้นสังกัดอนุมัติ)
                    <span className="block text-[11px] text-slate-600 mt-0.5">
                      Personal business which leave already applied in advance (In case of emergency, employee must submit leave request for approval form Dept. Manager together with this form)
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="font-semibold w-4">2</span>
              <div className="flex-1 space-y-1.5">
                {renderCheck(
                  'reasonLunch',
                  'ธุระส่วนตัวในช่วงเวลาพัก Personnal business which lunch time'
                )}
                <div className="pl-6 flex flex-wrap items-center gap-2">
                  <span>สถานที่ไป</span>
                  {renderLineInput('lunchPlace', '', 'flex-1 min-w-[200px]')}
                </div>
                <div className="pl-6 flex flex-wrap items-center gap-3">
                  <span>ตั้งแต่เวลา From</span>
                  {renderLineInput('lunchFrom', '12.00 น.', 'w-28')}
                  <span>ถึง To</span>
                  {renderLineInput('lunchTo', '13.00 น.', 'w-28')}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="font-semibold w-4">3</span>
              <div className="flex-1 space-y-2">
                {renderCheck(
                  'reasonWorkOutside',
                  'ปฏิบัติงานนอกสถานที่ ณ Work outside Company at'
                )}
                <div className="pl-6 flex flex-wrap items-center gap-2">
                  <span>สถานที่ไป</span>
                  {renderLineInput('outsidePlace', 'ระบุสถานที่ติดต่อ', 'flex-1 min-w-[200px]')}
                </div>
                <div className="pl-6 flex flex-wrap items-center gap-3">
                  <span>ตั้งแต่เวลา From</span>
                  {renderLineInput('outsideFrom', '09.00 น.', 'w-28')}
                  <span>ถึง To</span>
                  {renderLineInput('outsideTo', '12.00 น.', 'w-28')}
                </div>
                <div className="pl-6 flex flex-wrap items-center gap-3">
                  <span>รถยนต์ (Brand)</span>
                  {renderLineInput('carBrand', 'HONDA', 'w-32')}
                  <span>ทะเบียน(Car No.)</span>
                  {renderLineInput('carNo', '1กก-1111 กทม.', 'w-36')}
                </div>
                <div className="pl-6 flex flex-wrap items-center gap-3">
                  <span>เลขไมล์เริ่มต้น (Mileage start No.)</span>
                  {renderLineInput('mileageStart', '0000', 'w-24')}
                  <span>km.</span>
                  <span>เลขไมล์สิ้นสุด (Mileage end No.)</span>
                  {renderLineInput('mileageEnd', '0100', 'w-24')}
                  <span>km.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Part 1 Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 border-b border-slate-900 text-xs sm:text-sm text-center">
            <div className="min-w-0 sm:col-start-1 sm:row-start-1 print:col-start-1 print:row-start-1 py-1.5 px-2 border-b sm:border-r print:border-r border-slate-900 flex items-center justify-center">
              ขอโดย / วันที่ Requested by / date
            </div>
            <div className="min-w-0 sm:col-start-1 sm:row-start-2 print:col-start-1 print:row-start-2 py-3 px-2 min-h-[52px] flex items-center justify-center border-b sm:border-r print:border-r border-slate-900">
              {renderSigImg(
                requestMeta?.requesterSignatureUrl,
                requestMeta?.requesterName || data.fullName,
                requestMeta?.createdAt
              )}
            </div>
            <div className="min-w-0 sm:col-start-1 sm:row-start-3 print:col-start-1 print:row-start-3 py-1.5 px-2 font-medium border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex items-center justify-center">
              พนักงาน Employee
            </div>

            <div className="min-w-0 sm:col-start-2 sm:row-start-1 print:col-start-2 print:row-start-1 py-1.5 px-2 border-b border-slate-900 flex items-center justify-center">
              อนุมัติโดย / วันที่ Approved by / date
            </div>
            <div className="min-w-0 sm:col-start-2 sm:row-start-2 print:col-start-2 print:row-start-2 py-3 px-2 min-h-[52px] flex items-center justify-center border-b border-slate-900">
              {renderSigImg(
                requestMeta?.deptHeadSignatureUrl,
                requestMeta?.deptHeadName,
                requestMeta?.deptHeadApprovedAt
              )}
            </div>
            <div className="min-w-0 sm:col-start-2 sm:row-start-3 print:col-start-2 print:row-start-3 py-1.5 px-2 font-medium flex items-center justify-center">
              หัวหน้าแผนกหรือผู้จัดการแผนก Supervisor/ Manager Dept.
            </div>
          </div>

          {/* Part 2 Bar */}
          <div className="bg-slate-400/50 border-b border-slate-900 py-1.5 text-center text-xs sm:text-sm font-bold">
            ส่วนที่ 2 สำหรับแผนกทรัพยากรบุคคล Part 2 For HR dept.
          </div>

          {/* Part 2 3-col HR Table */}
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 text-xs text-center">
            {/* Col 1: Security Guard */}
            <div className="min-w-0 sm:col-start-1 sm:row-start-1 print:col-start-1 print:row-start-1 py-1.5 px-2 border-b sm:border-r print:border-r border-slate-900 font-medium flex items-center justify-center leading-snug">
              1.รับโดย / วันที่ Received by / date
            </div>
            <div className="min-w-0 sm:col-start-1 sm:row-start-2 print:col-start-1 print:row-start-2 grid grid-cols-2 min-h-[56px] border-b sm:border-r print:border-r border-slate-900">
              <div className="min-w-0 border-r border-slate-900 flex items-end justify-center pb-1.5 px-1 text-[11px] leading-tight">
                บันทึกเวลาออก Time out
              </div>
              <div className="min-w-0 flex items-end justify-center pb-1.5 px-1 text-[11px] leading-tight">
                บันทึกเวลาเข้า Time in
              </div>
            </div>
            <div className="min-w-0 sm:col-start-1 sm:row-start-3 print:col-start-1 print:row-start-3 py-1.5 px-2 font-medium border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex items-center justify-center leading-snug">
              พนักงานรปภ. Security Guard
            </div>

            {/* Col 2: HR Officer */}
            <div className="min-w-0 sm:col-start-2 sm:row-start-1 print:col-start-2 print:row-start-1 py-1.5 px-2 border-b sm:border-r print:border-r border-slate-900 font-medium flex items-center justify-center leading-snug">
              2.ดำเนินการด้านค่าจ้างโดย / วันที่ Payroll action by / date
            </div>
            <div className="min-w-0 sm:col-start-2 sm:row-start-2 print:col-start-2 print:row-start-2 min-h-[56px] border-b sm:border-r print:border-r border-slate-900 flex items-center justify-center px-2 py-1.5">
              {renderSigImg(
                requestMeta?.hrSignatureUrl,
                requestMeta?.hrName,
                requestMeta?.hrApprovedAt
              )}
            </div>
            <div className="min-w-0 sm:col-start-2 sm:row-start-3 print:col-start-2 print:row-start-3 py-1.5 px-2 font-medium border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex items-center justify-center leading-snug">
              เจ้าหน้าที่ทรัพยากรบุคคล HR Officer
            </div>

            {/* Col 3: HR Supervisor / Manager */}
            <div className="min-w-0 sm:col-start-3 sm:row-start-1 print:col-start-3 print:row-start-1 py-1.5 px-2 border-b border-slate-900 font-medium flex items-center justify-center leading-snug">
              3.ตรวจสอบโดย / วันที่ Verified by / date
            </div>
            <div className="min-w-0 sm:col-start-3 sm:row-start-2 print:col-start-3 print:row-start-2 min-h-[56px] border-b border-slate-900 flex items-center justify-center px-2 py-1.5">
              {renderSigImg(
                requestMeta?.managerSignatureUrl,
                requestMeta?.managerName,
                requestMeta?.managerApprovedAt
              )}
            </div>
            <div className="min-w-0 sm:col-start-3 sm:row-start-3 print:col-start-3 print:row-start-3 py-1.5 px-2 font-medium flex items-center justify-center leading-snug">
              หัวหน้าฝ่าย /ผู้จัดการทรัพยากรบุคคล HR Supervisor /Manager
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700">
          <div>
            เอกสารนี้ต้องเก็บประกอบการทำค่าจ้างงวดที่เกี่ยวข้อง This document must be kept with respective month payroll.
          </div>
          <div className="font-mono font-semibold">F-HR-012 REV.00</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. F-HR-029: แบบขอหนังสือรับรอง
  // =========================================================================
  if (formType === 'F-HR-029') {
    return (
      <div className="paper-sheet bg-white border border-slate-300 p-6 sm:p-10 text-slate-900 shadow-xs space-y-5">
        {/* Top Logo + Company Name */}
        <div className="flex items-center gap-4">
          {renderLogoMark()}
          <div>
            <div className="text-sm sm:text-base font-bold">
              บริษัท ซูมิโน อาปิโก (ไทยแลนด์) จำกัด
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-700">
              SUMINO AAPICO (Thailand) Co.,Ltd.
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-0.5">
          <div className="text-lg font-bold">แบบขอหนังสือรับรอง</div>
          <div className="text-sm font-semibold tracking-wide">
            SALARY/EMPLOYEE STATUS CERTIFICATION REQUEST FORM
          </div>
        </div>

        {/* Salutation */}
        <div className="text-xs sm:text-sm">
          <div>เรียน ผู้จัดการฝ่ายทรัพยากรบุคคล ผ่าน ผู้บังคับบัญชาพนักงาน</div>
          <div className="italic text-slate-700">
            Dear HR managers through supervisors, employees.
          </div>
        </div>

        {/* Dotted Fields */}
        <div className="space-y-3 text-xs sm:text-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span>ข้าพเจ้า (นาย/นาง/นางสาว)</span>
              {renderLineInput(
                data.firstName !== undefined ? 'firstName' : 'fullName',
                'ชื่อ',
                'w-56'
              )}
              <span>นามสกุล</span>
              {renderLineInput('lastName', 'นามสกุล', 'w-52')}
            </div>
            <div className="text-xs text-slate-600 flex gap-48">
              <span>Name (Mr./Miss/Mrs.)</span>
              <span>Surname</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <span className="shrink-0">ตำแหน่ง Position</span>
              {renderLineInput('position', '', 'flex-1 min-w-0')}
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="shrink-0">แผนก Department</span>
              {renderLineInput('department', '', 'flex-1 min-w-0')}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span>เข้าทำงานเมื่อ Start Working : วันที่ Date</span>
            {renderLineInput('startDay', '', 'w-16')}
            <span>เดือน Month</span>
            {renderLineInput('startMonth', '', 'w-24')}
            <span>พ.ศ. Year</span>
            {renderLineInput('startYear', '', 'w-20')}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span>มีความประสงค์จะขอรับหนังสือรับรองเพื่อนำไปใช้เป็นหลักฐาน</span>
              {renderLineInput('purpose', 'ระบุเหตุผล', 'flex-1 min-w-[220px]')}
            </div>
            <div className="text-xs text-slate-600">
              Wishes to obtain a certificate to be used as evidence
            </div>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2.5 pl-4 text-xs sm:text-sm">
          <div className="flex flex-wrap gap-8">
            {renderCheck('langThai', 'ภาษาไทย')}
            {renderCheck('langEnglish', 'English')}
          </div>
          <div className="pl-10 space-y-2">
            <div>
              {renderCheck(
                'certStaff',
                'หนังสือรับรองการเป็นพนักงาน Certificates of staff'
              )}
            </div>
            <div>
              {renderCheck(
                'certWithholding50',
                'หนังสือรับรองการหักภาษี 50 ทวิ Withholding tax 50 bis.'
              )}
            </div>
            <div>
              {renderCheck(
                'certSalary',
                'หนังสือรับรองเงินเดือน Salary certificate'
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {renderCheck(
                'certPaySlip',
                'สลิปใบจ่ายเงินเดือน Pay Slip ระบุเดือนที่ต้องการ'
              )}
              {renderLineInput('paySlipMonth', 'ระบุเดือน', 'w-44')}
            </div>
          </div>
        </div>

        {/* Requester Line */}
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm pt-2">
          <span>ผู้ขอ Request by</span>
          <span className="inline-block border-b border-dotted border-slate-700 px-3 min-w-[180px] text-center">
            {requestMeta?.requesterSignatureUrl ? (
              <img
                src={requestMeta.requesterSignatureUrl}
                alt="ลายเซ็นผู้ขอ"
                className="h-8 mx-auto object-contain"
              />
            ) : (
              data.fullName || '\u00A0'
            )}
          </span>
          <span>วันที่ Date</span>
          {renderLineInput('requestDate', '', 'w-32', 'date')}
        </div>

        {/* Approval Frame */}
        <div className="border-2 border-slate-900 p-4 space-y-4 text-xs sm:text-sm">
          <div className="space-y-1.5 border-b border-slate-300 pb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                readOnly
                checked={Boolean(requestMeta?.deptHeadApprovedAt)}
                className="w-4 h-4 accent-slate-900"
              />
              <span>อนุมัติ Approve</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                readOnly
                checked={requestMeta?.status === 'rejected'}
                className="w-4 h-4 accent-slate-900"
              />
              <span>ไม่อนุมัติ Disapproval เพราะ Because</span>
              <span className="border-b border-dotted border-slate-600 flex-1 min-w-[180px]">
                {requestMeta?.rejectedReason || '\u00A0'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span>ผู้อนุมัติหัวหน้าแผนก Approve by Dept.head</span>
              <span className="border-b border-dotted border-slate-600 min-w-[180px] text-center">
                {requestMeta?.deptHeadName || '\u00A0'}
              </span>
              <span>วันที่ Date</span>
              <span className="border-b border-dotted border-slate-600 min-w-[100px] text-center tabular-nums">
                {formatDateTh(requestMeta?.deptHeadApprovedAt) || '\u00A0'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                readOnly
                checked={Boolean(requestMeta?.hrApprovedAt)}
                className="w-4 h-4 accent-slate-900"
              />
              <span>อนุมัติ Approve</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="checkbox" readOnly className="w-4 h-4" />
              <span>ไม่อนุมัติ Disapproval เพราะ Because</span>
              <span className="border-b border-dotted border-slate-600 flex-1 min-w-[180px]">
                {'\u00A0'}
              </span>
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div>
                <div>ตรวจสอบโดยหัวหน้าฝ่ายบุคคล</div>
                <div className="text-xs text-slate-600">
                  Monitoring by personnel head
                </div>
              </div>
              {renderSigImg(
                requestMeta?.hrSignatureUrl,
                requestMeta?.hrName,
                requestMeta?.hrApprovedAt
              )}
            </div>
          </div>
        </div>

        {/* Notes & Footer */}
        <div className="text-[11px] text-slate-700 space-y-1.5 border-t border-slate-300 pt-3">
          <div className="font-bold">หมายเหตุ Notes :</div>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              ฝ่ายทรัพยากรบุคคลจะดำเนินการให้โดยพนักงานต้องแจ้งล่วงหน้าอย่างน้อย 3 วันทำงานปกติ / Human Resources Will be performed by the employee must be made at least 3 working day.
            </li>
            <li>
              เอกสารค่าจ้างถือเป็นความลับเฉพาะ ไม่พึงเปิดเผยโดยปิดผนึกเฉพาะเจ้าตัวเท่านั้น / Wage document is confidential. Confidential By sealed envelope.
            </li>
            <li>
              หนังสือรับรองมีผลบังคับใช้ ในระยะเวลาไม่เกิน 6 เดือน นับแต่วันที่ออกหนังสือรับรอง / Certificate is mandatory. In a period not exceeding six months.
            </li>
          </ol>
          <div className="text-right pt-2 font-mono">
            <div>F-HR-029 Rev.00</div>
            <div>Effective Date : 15 Jun 18</div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. F-HR-032: แบบฟอร์มขออนุมัติค่าพาหนะ / ค่าน้ำมัน
  // =========================================================================
  if (formType === 'F-HR-032') {
    const trips: Array<{
      date: string;
      subject: string;
      distance: string;
      rate: string;
      total?: string;
      fuelAmount?: string;
    }> = Array.isArray(data.trips) ? data.trips : [];

    const updateTrip = (idx: number, field: string, value: string) => {
      if (isReadOnly || !onChange) return;
      const next = trips.map((t, i) => {
        if (i !== idx) return t;
        const u = { ...t, [field]: value };
        if (field === 'distance' || field === 'rate') {
          u.total = String(
            (Number(u.distance || 0) * Number(u.rate || 0)).toFixed(2)
          );
        }
        return u;
      });
      updateField('trips', next);
    };

    const addTrip = () => {
      if (isReadOnly || !onChange) return;
      updateField('trips', [
        ...trips,
        {
          date: new Date().toISOString().split('T')[0],
          subject: '',
          distance: '0',
          rate: '6',
          total: '0',
        },
      ]);
    };

    const removeTrip = (idx: number) => {
      if (isReadOnly || !onChange || trips.length <= 1) return;
      updateField(
        'trips',
        trips.filter((_, i) => i !== idx)
      );
    };

    const totalDistance = trips.reduce(
      (s, t) => s + Number(t.distance || 0),
      0
    );
    const totalBaht = trips.reduce(
      (s, t) => s + Number(t.total ?? t.fuelAmount ?? 0),
      0
    );

    return (
      <div className="paper-sheet bg-white border border-slate-300 p-4 sm:p-8 text-slate-900 shadow-xs">
        <div className="border-2 border-slate-900">
          {/* Header */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 border-b border-slate-900">
            <div className="sm:col-span-3 print:col-span-3 min-w-0 p-3 flex items-center justify-center border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900">
              {renderLogoMark()}
            </div>
            <div className="sm:col-span-9 print:col-span-9 min-w-0 divide-y divide-slate-900 text-center">
              <div className="p-2 text-xs sm:text-sm font-bold">
                บริษัท ซูมิโน อาปิโก (ไทยแลนด์) จำกัด SUMINO AAPICO (Thailand) Co.,Ltd.
              </div>
              <div className="p-2 text-xs sm:text-sm font-bold">
                แบบฟอร์มขออนุมัติค่าพาหนะ / ค่าน้ำมัน Authorization form transportation expense requisition form
              </div>
            </div>
          </div>

          {/* Info 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 border-b border-slate-900 text-xs sm:text-sm">
            <div className="min-w-0 p-2 border-b sm:border-r print:border-r border-slate-900 flex items-center gap-2">
              <span className="w-28 shrink-0">ชื่อ Name</span>
              <div className="flex-1 min-w-0">{renderCellInput('fullName')}</div>
            </div>
            <div className="min-w-0 p-2 border-b border-slate-900 flex items-center gap-2">
              <span className="w-32 shrink-0">รหัส Emp.No.</span>
              <div className="flex-1 min-w-0">{renderCellInput('employeeCode')}</div>
            </div>
            <div className="min-w-0 p-2 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex items-center gap-2">
              <span className="w-28 shrink-0">ตำแหน่ง Position</span>
              <div className="flex-1 min-w-0">{renderCellInput('position')}</div>
            </div>
            <div className="min-w-0 p-2 flex items-center gap-2">
              <span className="w-32 shrink-0">แผนก Dept.</span>
              <div className="flex-1 min-w-0">{renderCellInput('department')}</div>
            </div>
          </div>

          {/* Contact & Mileage */}
          <div className="p-3 space-y-2 border-b border-slate-900 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span>สถานที่ติดต่อ Contact</span>
              {renderLineInput('contactPlace', 'ระบุสถานที่ติดต่อ', 'flex-1 min-w-[220px]')}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span>จาก From (Mileage)</span>
              {renderLineInput('mileageFrom', '09100', 'w-28')}
              <span>กม.</span>
              <span>ถึง To (Mileage)</span>
              {renderLineInput('mileageTo', '09200', 'w-28')}
              <span>กม.</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-b border-slate-900">
            <table className="w-full min-w-[640px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-900 text-center bg-slate-50">
                  <th className="py-2 px-2 border-r border-slate-900 w-32">
                    วันที่<div className="font-normal text-[11px]">Date</div>
                  </th>
                  <th className="py-2 px-2 border-r border-slate-900">
                    เรื่องที่ติดต่อ
                    <div className="font-normal text-[11px]">Contact Subject</div>
                  </th>
                  <th className="py-2 px-2 border-r border-slate-900 w-28">
                    ระยะทาง (กม.)
                    <div className="font-normal text-[11px]">Distance (Km)</div>
                  </th>
                  <th className="py-2 px-2 border-r border-slate-900 w-28">
                    อัตรา / (กม.)
                    <div className="font-normal text-[11px]">Rate / (km.)</div>
                  </th>
                  <th className="py-2 px-2 w-28">
                    รวม (บาท)
                    <div className="font-normal text-[11px]">Total (Baht)</div>
                  </th>
                  {!isReadOnly && (
                    <th className="py-2 px-2 border-l border-slate-900 w-10">
                      ลบ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {trips.map((t, idx) => (
                  <tr key={idx} className="border-b border-slate-900">
                    <td className="p-1.5 border-r border-slate-900 text-center tabular-nums">
                      {isReadOnly ? (
                        t.date
                      ) : (
                        <input
                          type="date"
                          value={t.date}
                          onChange={(e) =>
                            updateTrip(idx, 'date', e.target.value)
                          }
                          className="w-full border border-slate-200 px-1 py-0.5 text-xs tabular-nums"
                        />
                      )}
                    </td>
                    <td className="p-1.5 border-r border-slate-900">
                      {isReadOnly ? (
                        t.subject || '-'
                      ) : (
                        <input
                          type="text"
                          value={t.subject}
                          onChange={(e) =>
                            updateTrip(idx, 'subject', e.target.value)
                          }
                          placeholder="ส่งเอกสารหน่วยงานราชการ"
                          className="w-full border border-slate-200 px-2 py-0.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="p-1.5 border-r border-slate-900 text-center tabular-nums">
                      {isReadOnly ? (
                        t.distance
                      ) : (
                        <input
                          type="number"
                          value={t.distance}
                          onChange={(e) =>
                            updateTrip(idx, 'distance', e.target.value)
                          }
                          className="w-full border border-slate-200 px-1.5 py-0.5 text-xs text-right tabular-nums"
                        />
                      )}
                    </td>
                    <td className="p-1.5 border-r border-slate-900 text-center tabular-nums">
                      {isReadOnly ? (
                        t.rate
                      ) : (
                        <input
                          type="number"
                          value={t.rate}
                          onChange={(e) =>
                            updateTrip(idx, 'rate', e.target.value)
                          }
                          className="w-full border border-slate-200 px-1.5 py-0.5 text-xs text-right tabular-nums"
                        />
                      )}
                    </td>
                    <td className="p-1.5 text-right font-semibold tabular-nums">
                      {Number(t.total ?? t.fuelAmount ?? 0).toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    {!isReadOnly && (
                      <td className="p-1.5 border-l border-slate-900 text-center">
                        <button
                          type="button"
                          onClick={() => removeTrip(idx)}
                          disabled={trips.length <= 1}
                          className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-bold bg-slate-50">
                  <td
                    colSpan={2}
                    className="py-2 px-3 text-center border-r border-slate-900"
                  >
                    รวม Total
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-900 tabular-nums">
                    {totalDistance}
                  </td>
                  <td className="py-2 px-2 text-center border-r border-slate-900">
                    -
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {totalBaht.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  {!isReadOnly && <td className="border-l border-slate-900" />}
                </tr>
              </tbody>
            </table>
          </div>

          {!isReadOnly && (
            <div className="p-2 border-b border-slate-900 bg-slate-50/40">
              <button
                type="button"
                onClick={addTrip}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 border border-blue-200 bg-blue-50 rounded"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายการเดินทาง</span>
              </button>
            </div>
          )}

          {/* Mileage verification checkboxes */}
          <div className="p-3.5 space-y-2.5 border-b border-slate-900 text-xs">
            <div>
              {renderCheck(
                'checkFromHome',
                <span>
                  จากบ้าน เช็คเลขไมล์โดยการถ่ายรูปเลขไมล์ก่อนออกจากบ้าน - ถึงปลายทาง และจากปลายทาง - บ้าน
                  <span className="block text-[11px] text-slate-600">
                    From home to and back from destination check mileage by taking photo.
                  </span>
                </span>
              )}
            </div>
            <div>
              {renderCheck(
                'checkFromCompany',
                <span>
                  จากบริษัท เช็คเลขไมล์โดย รปภ. ของบริษัทฯ ก่อนออกจากบริษัทฯ และถึงบริษัทฯ
                  <span className="block text-[11px] text-slate-600">
                    From SAT. to and back from destination check mileage by security guard.
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* 3-Col Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 text-xs text-center">
            <div className="min-w-0 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900">
              <div className="py-1.5 border-b border-slate-900">
                ขอโดย / วันที่ Requested by / Date
              </div>
              <div className="min-h-[52px] border-b border-slate-900 flex items-center justify-center p-2">
                {renderSigImg(
                  requestMeta?.requesterSignatureUrl,
                  requestMeta?.requesterName || data.fullName,
                  requestMeta?.createdAt
                )}
              </div>
              <div className="py-1.5 font-medium">พนักงาน Employee</div>
            </div>
            <div className="min-w-0 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900">
              <div className="py-1.5 border-b border-slate-900">
                อนุมัติโดย / วันที่ Approved by / Date
              </div>
              <div className="min-h-[52px] border-b border-slate-900 flex items-center justify-center p-2">
                {renderSigImg(
                  requestMeta?.deptHeadSignatureUrl ||
                    requestMeta?.managerSignatureUrl,
                  requestMeta?.deptHeadName || requestMeta?.managerName,
                  requestMeta?.deptHeadApprovedAt ||
                    requestMeta?.managerApprovedAt
                )}
              </div>
              <div className="py-1.5 font-medium">Department MGR/GM</div>
            </div>
            <div className="min-w-0">
              <div className="py-1.5 border-b border-slate-900">
                การจ่ายเงิน / วันที่ Bill payment / Date
              </div>
              <div className="min-h-[52px] border-b border-slate-900 flex items-center justify-center p-2">
                {renderSigImg(
                  requestMeta?.hrSignatureUrl,
                  requestMeta?.hrName,
                  requestMeta?.hrApprovedAt
                )}
              </div>
              <div className="py-1.5 font-medium">GA.Department</div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col items-end text-[11px] text-slate-700 leading-tight">
          <div className="font-mono font-semibold">F-HR-032 REV.00</div>
          <div>Effective Date: 15 Jun 18</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. F-HR-036: แบบฟอร์มการขอใช้รถบริษัทฯ
  // =========================================================================
  if (formType === 'F-HR-036') {
    return (
      <div className="paper-sheet bg-white border border-slate-300 p-4 sm:p-8 text-slate-900 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-2">
          {renderLogoMark(true)}
          <div className="flex-1 text-center text-base sm:text-lg font-bold">
            แบบฟอร์มการขอใช้รถบริษัทฯ (Use a company car request form)
          </div>
          <div className="w-16 hidden sm:block" />
        </div>

        <div className="border-2 border-slate-900 text-xs sm:text-sm">
          {/* Request Body */}
          <div className="p-4 space-y-3 border-b border-slate-900">
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <span className="shrink-0">ชื่อผู้ขอใช้ (Name)</span>
                {renderLineInput('fullName', '', 'flex-1 min-w-0')}
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <span className="shrink-0">ตำแหน่ง (Position)</span>
                {renderLineInput('position', '', 'flex-1 min-w-0')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <span className="shrink-0">แผนก (Department)</span>
                {renderLineInput('department', '', 'flex-1 min-w-0')}
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <span className="shrink-0">สถานที่ติดต่อ (Contact)</span>
                {renderLineInput('contactPlace', '', 'flex-1 min-w-0')}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>วันที่ต้องการใช้รถ (Date)</span>
              {renderLineInput('useDate', '', 'w-32', 'date')}
              <span>ตั้งแต่เวลา (For time)</span>
              {renderLineInput('forTime', '09.00 น.', 'w-24')}
              <span>ถึงเวลา (To time)</span>
              {renderLineInput('toTime', '12.00 น.', 'w-24')}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>มีผู้ร่วมเดินทาง (Passenger)</span>
              {renderLineInput('passengerCount', '1', 'w-14', 'number', 'text-center')}
              <span>คน (Person)</span>
              {renderLineInput('passengers', 'ระบุชื่อผู้ร่วมเดินทาง', 'flex-1 min-w-[200px]')}
            </div>
          </div>

          {/* 2-Col Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 border-b border-slate-900">
            <div className="min-w-0 p-3 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 space-y-3">
              <div className="text-center font-medium">ขอโดย (Requested by)</div>
              <div className="min-h-[44px] flex items-center justify-center">
                {renderSigImg(
                  requestMeta?.requesterSignatureUrl,
                  requestMeta?.requesterName || data.fullName,
                  null
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>วันที่ (Date)</span>
                {renderLineInput('requestDate', '', 'flex-1 min-w-0', 'date')}
              </div>
            </div>
            <div className="min-w-0 p-3 space-y-3">
              <div className="text-center font-medium">
                อนุมัติโดย / วันที่ Approved by / Date
              </div>
              <div className="min-h-[44px] flex items-center justify-center">
                {renderSigImg(
                  requestMeta?.deptHeadSignatureUrl ||
                    requestMeta?.managerSignatureUrl,
                  requestMeta?.deptHeadName || requestMeta?.managerName,
                  null
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>วันที่ (Date)</span>
                <span className="border-b border-dotted border-slate-700 flex-1 min-w-0 min-h-[20px] px-2 tabular-nums">
                  {formatDateTh(
                    requestMeta?.deptHeadApprovedAt ||
                      requestMeta?.managerApprovedAt
                  ) || '\u00A0'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Admin & Applicant Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12">
            <div className="sm:col-span-7 print:col-span-7 min-w-0 p-3 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 space-y-2">
              <div className="font-bold underline">
                สำหรับเจ้าหน้าที่ผู้ดูแลการใช้ (For administrative staff)
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0">
                  สามารถจัดหารถให้ได้หมายเลขทะเบียน (Car registration)
                </span>
                {renderLineInput('adminCarReg', '', 'flex-1 min-w-0')}
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0">ประเภทรถยนต์ (Type of car)</span>
                {renderLineInput('adminCarType', '', 'flex-1 min-w-0')}
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0">ลงชื่อ (Sign)</span>
                {renderLineInput('adminSign', '', 'flex-1 min-w-0')}
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0">วันที่ (Date)</span>
                {renderLineInput('adminDate', '', 'w-40', 'date')}
              </div>
            </div>
            <div className="sm:col-span-5 print:col-span-5 min-w-0 p-3 space-y-2">
              <div className="font-medium">สำหรับผู้ขอใช้ (For the Applicant)</div>
              <div className="flex items-start gap-2">
                <span className="shrink-0">หมายเหตุ (Remark)</span>
                {renderLineInput('remark', '', 'flex-1 min-w-0')}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col items-end text-[11px] text-slate-700 leading-tight">
          <div className="font-mono font-semibold">F-HR-036 Rev,00</div>
          <div>Effective Date: 15 Jun 18</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. F-HR-051: แบบฟอร์มการเบิกสวัสดิการ กรณีจดทะเบียนสมรส
  // =========================================================================
  if (formType === 'F-HR-051') {
    return (
      <div className="paper-sheet bg-white border border-slate-300 p-6 sm:p-10 text-slate-900 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-4">
          {renderLogoMark()}
          <h2 className="flex-1 text-center text-base sm:text-lg font-bold">
            แบบฟอร์มการเบิกสวัสดิการ กรณีจดทะเบียนสมรส
          </h2>
          <div className="w-16 hidden sm:block" />
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
            <div className="min-w-0 flex items-center gap-2">
              <span className="shrink-0">ข้าพเจ้าชื่อ-สกุล</span>
              {renderLineInput('fullName', 'ระบุชื่อ-นามสกุล', 'flex-1 min-w-0')}
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="shrink-0">รหัสพนักงาน</span>
              {renderLineInput('employeeCode', 'SAT0001', 'flex-1 min-w-0')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="shrink-0">วันที่เริ่มงาน</span>
              {renderLineInput('startWorkDay', '01', 'w-12', 'text', 'text-center')}
              <span>/</span>
              {renderLineInput('startWorkMonth', '01', 'w-12', 'text', 'text-center')}
              <span>/</span>
              {renderLineInput('startWorkYear', '2565', 'w-16', 'text', 'text-center')}
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="shrink-0">แผนก/ ฝ่าย</span>
              {renderLineInput('department', 'ระบุแผนก', 'flex-1 min-w-0')}
            </div>
          </div>

          <div className="pt-1 font-medium">
            มีความประสงค์ขอเบิกสวัสดิการ " จดทะเบียนสมรส " โดยมีรายละเอียด ดังนี้
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
            <div className="min-w-0 flex items-center gap-2">
              <span className="shrink-0">ชื่อคู่สมรส</span>
              {renderLineInput('spouseName', 'ระบุชื่อ-นามสกุลคู่สมรส', 'flex-1 min-w-0')}
            </div>
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="shrink-0">วันที่จดทะเบียนสมรส</span>
              {renderLineInput('marriageDay', '01', 'w-12', 'text', 'text-center')}
              <span>/</span>
              {renderLineInput('marriageMonth', '01', 'w-12', 'text', 'text-center')}
              <span>/</span>
              {renderLineInput('marriageYear', '2569', 'w-16', 'text', 'text-center')}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <span>ทั้งนี้ได้แนบสำเนาทะเบียนสมรส (ถ่ายเอกสารหน้า-หลัง)</span>
            {renderCheck('attachMarriageCert', 'สำเนาทะเบียนสมรส')}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-8 pt-6 text-xs sm:text-sm text-center">
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <span>ลงชื่อพนักงาน</span>
              <span className="border-b border-dotted border-slate-700 min-w-[160px] min-h-[36px] flex items-center justify-center">
                {requestMeta?.requesterSignatureUrl ? (
                  <img
                    src={requestMeta.requesterSignatureUrl}
                    alt="ลายเซ็นพนักงาน"
                    className="h-9 object-contain"
                  />
                ) : (
                  '\u00A0'
                )}
              </span>
            </div>
            <div>( {requestMeta?.requesterName || data.fullName || '....................................'} )</div>
            <div className="tabular-nums">
              วันที่ {formatDateTh(requestMeta?.createdAt) || '.........../.........../...........'}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <span>ลงชื่อผู้ตรวจสอบ / อนุมัติ</span>
              <span className="border-b border-dotted border-slate-700 min-w-[160px] min-h-[36px] flex items-center justify-center">
                {requestMeta?.hrSignatureUrl ||
                requestMeta?.deptHeadSignatureUrl ? (
                  <img
                    src={
                      requestMeta.hrSignatureUrl ||
                      requestMeta.deptHeadSignatureUrl ||
                      ''
                    }
                    alt="ลายเซ็นผู้อนุมัติ"
                    className="h-9 object-contain"
                  />
                ) : (
                  '\u00A0'
                )}
              </span>
            </div>
            <div>
              ({' '}
              {requestMeta?.hrName ||
                requestMeta?.deptHeadName ||
                '....................................'}{' '}
              )
            </div>
            <div className="tabular-nums">
              วันที่{' '}
              {formatDateTh(
                requestMeta?.hrApprovedAt || requestMeta?.deptHeadApprovedAt
              ) || '.........../.........../...........'}
            </div>
          </div>
        </div>

        <div className="pt-6 text-xs space-y-1.5">
          <div>
            <span className="font-bold underline">หมายเหตุ:</span> อ้างอิงการจ่ายสวัสดิการตามประกาศ เลขที่ HR-013/2016 ลงวันที่ 16 กันยายน 2559
          </div>
          <div className="pl-12">
            กำหนดจ่ายพร้อมเงินเดือนของเดือนนั้นๆ ต้องยื่นก่อน 15 ของเดือนนั้น
          </div>
          <div className="text-right pt-2 font-mono text-[11px] text-slate-700">
            <div>F-HR-051 Rev.00</div>
            <div>Effective date: 01-Jan-2019</div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 7. F-GA-007: IT REQUEST FORM / ใบร้องขอดำเนินการเกี่ยวข้องกับสารสนเทศ
  // =========================================================================
  if (formType === 'F-GA-007') {
    const items: Array<{ item: string; detail: string; duration: string }> =
      Array.isArray(data.items) ? data.items : [];

    const updateRow = (idx: number, field: string, value: string) => {
      if (isReadOnly || !onChange) return;
      const next = items.map((r, i) =>
        i === idx ? { ...r, [field]: value } : r
      );
      updateField('items', next);
    };

    const addRow = () => {
      if (isReadOnly || !onChange) return;
      updateField('items', [...items, { item: '', detail: '', duration: '' }]);
    };

    const removeRow = (idx: number) => {
      if (isReadOnly || !onChange || items.length <= 1) return;
      updateField(
        'items',
        items.filter((_, i) => i !== idx)
      );
    };

    return (
      <div className="paper-sheet bg-white border border-slate-300 p-4 sm:p-8 text-slate-900 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {renderLogoMark()}
          <div className="flex-1 text-center">
            <div className="text-base sm:text-lg font-bold">
              IT REQUEST FORM
            </div>
            <div className="text-sm sm:text-base font-bold">
              ใบร้องขอดำเนินการเกี่ยวข้องกับสารสนเทศ
            </div>
          </div>
          <div className="w-20 hidden sm:block" />
        </div>

        {/* Single-line info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <span>ชื่อ-สกุล</span>
            {renderLineInput('fullName', '', 'w-44')}
          </div>
          <div className="flex items-center gap-1.5">
            <span>ตำแหน่ง</span>
            {renderLineInput('position', '', 'w-32')}
          </div>
          <div className="flex items-center gap-1.5">
            <span>แผนก</span>
            {renderLineInput('department', '', 'w-32')}
          </div>
          <div className="flex items-center gap-1.5">
            <span>วันที่ร้องขอ</span>
            {renderLineInput('requestDate', '', 'w-28', 'date')}
          </div>
          <div className="flex items-center gap-1.5">
            <span>เวลา</span>
            {renderLineInput('requestTime', '12.00 น.', 'w-20')}
          </div>
        </div>

        {/* 7 Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm">
          <div>{renderCheck('typeRepair', '1.แจ้งซ่อม/แก้ไข')}</div>
          <div>{renderCheck('typeBuy', '2.ขอเบิก/ขอซื้ออุปกรณ์ IT')}</div>
          <div>{renderCheck('typeTransfer', '3.ขอโอนย้าย/Coppy ข้อมูล')}</div>
          <div>{renderCheck('typeInstall', '4.แจ้งติดตั้ง/เคลื่อนย้าย')}</div>
          <div>
            {renderCheck(
              'typeBorrow',
              '5.ขอยืม/ขอนำอุปกรณ์ส่วนตัวมาใช้ในบริษัท'
            )}
          </div>
          <div>{renderCheck('typeEmail', '6.ขอใช้ E-Mail/อินเตอร์เน็ต')}</div>
          <div className="sm:col-span-3 flex flex-wrap items-center gap-2">
            {renderCheck('typeOther', '7.อื่น ๆ')}
            {renderLineInput('typeOtherText', 'ระบุรายละเอียด', 'flex-1 min-w-[200px]')}
          </div>
        </div>

        {/* 4-Col Table */}
        <div className="overflow-x-auto border border-slate-900">
          <table className="w-full min-w-[600px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-50 text-center">
                <th className="py-1.5 px-2 border-r border-slate-900 w-16">
                  ลำดับ
                </th>
                <th className="py-1.5 px-2 border-r border-slate-900">รายการ</th>
                <th className="py-1.5 px-2 border-r border-slate-900">
                  รายละเอียด
                </th>
                <th className="py-1.5 px-2 w-36">ระยะเวลา</th>
                {!isReadOnly && (
                  <th className="py-1.5 px-2 border-l border-slate-900 w-10">
                    ลบ
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-900 last:border-b-0">
                  <td className="py-1.5 px-2 text-center border-r border-slate-900 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="p-1 border-r border-slate-900">
                    {isReadOnly ? (
                      row.item || '\u00A0'
                    ) : (
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => updateRow(idx, 'item', e.target.value)}
                        placeholder="Computer Notebook / Software"
                        className="w-full border border-slate-200 px-2 py-0.5 text-xs"
                      />
                    )}
                  </td>
                  <td className="p-1 border-r border-slate-900">
                    {isReadOnly ? (
                      row.detail || '\u00A0'
                    ) : (
                      <input
                        type="text"
                        value={row.detail}
                        onChange={(e) =>
                          updateRow(idx, 'detail', e.target.value)
                        }
                        placeholder="รายละเอียด / Serial"
                        className="w-full border border-slate-200 px-2 py-0.5 text-xs"
                      />
                    )}
                  </td>
                  <td className="p-1 text-center">
                    {isReadOnly ? (
                      row.duration || '\u00A0'
                    ) : (
                      <input
                        type="text"
                        value={row.duration}
                        onChange={(e) =>
                          updateRow(idx, 'duration', e.target.value)
                        }
                        placeholder="1/5/22 - 3/5/22"
                        className="w-full border border-slate-200 px-2 py-0.5 text-xs"
                      />
                    )}
                  </td>
                  {!isReadOnly && (
                    <td className="p-1 border-l border-slate-900 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 border border-blue-200 bg-blue-50 rounded"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มรายการ</span>
          </button>
        )}

        {/* Comment & Requester / Dept Head / IT Officer boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-4 print:grid-cols-4 border border-slate-900 text-xs">
          <div className="min-w-0 p-2.5 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 space-y-1.5">
            <div className="font-medium">ความคิดเห็น</div>
            {isReadOnly ? (
              <div className="min-h-[56px] space-y-1 text-[11px] leading-snug break-words">
                {data.comment && (
                  <div className="text-slate-800">{data.comment}</div>
                )}
                {requestMeta?.itComment && (
                  <div className="text-blue-950 font-medium border-t border-dotted border-slate-300 pt-1">
                    <div>
                      ความเห็น IT
                      {requestMeta.itCommentBy
                        ? ` (${requestMeta.itCommentBy})`
                        : ''}
                      :
                    </div>
                    <div className="font-normal text-slate-900">
                      {requestMeta.itComment}
                    </div>
                  </div>
                )}
                {!data.comment && !requestMeta?.itComment && '\u00A0'}
              </div>
            ) : (
              <textarea
                rows={3}
                value={data.comment || ''}
                onChange={(e) => updateField('comment', e.target.value)}
                placeholder="ระบุความคิดเห็น..."
                className="w-full min-w-0 border border-slate-200 p-1.5 text-xs"
              />
            )}
          </div>
          <div className="min-w-0 p-2.5 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 text-center flex flex-col justify-between">
            <div className="font-medium">ผู้ร้องขอ</div>
            {renderSigImg(
              requestMeta?.requesterSignatureUrl,
              requestMeta?.requesterName || data.fullName,
              null
            )}
            <div className="tabular-nums">
              วันที่ {formatDateTh(requestMeta?.createdAt) || '...../...../.....'}
            </div>
          </div>
          <div className="min-w-0 p-2.5 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 text-center flex flex-col justify-between">
            <div className="font-medium">ผู้อนุมัติ (หัวหน้าแผนก)</div>
            {renderSigImg(
              requestMeta?.deptHeadSignatureUrl,
              requestMeta?.deptHeadName,
              null
            )}
            <div className="tabular-nums">
              วันที่{' '}
              {formatDateTh(requestMeta?.deptHeadApprovedAt) ||
                '...../...../.....'}
            </div>
          </div>
          <div className="min-w-0 p-2.5 text-center flex flex-col justify-between">
            <div className="font-medium">เจ้าหน้าที่ IT</div>
            {renderSigImg(
              requestMeta?.hrSignatureUrl || requestMeta?.managerSignatureUrl,
              requestMeta?.hrName || requestMeta?.managerName,
              null
            )}
            <div className="tabular-nums">
              วันที่{' '}
              {formatDateTh(
                requestMeta?.hrApprovedAt || requestMeta?.managerApprovedAt
              ) || '...../...../.....'}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="text-[11px] text-slate-800 space-y-0.5">
          <div>*หมายเหตุ ข้อ 2-6 ให้หัวหน้าแผนกเซนต์อนุมัติ</div>
          <div>
            **หมายเหตุ กรณีนำอุปกรณ์สารสนเทศเข้า-ออกนอกบริษัทซูมิโน อาปิโก (ไทยแลนด์) จำกัด ให้ รปภ. ตรวจสอบ
          </div>
        </div>

        {/* Guard & Verifier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 pt-1 text-xs text-center">
          <div className="min-w-0 border border-slate-900 p-2.5 space-y-3 flex flex-col justify-between">
            <div className="font-medium">จนท. รปภ ตรวจเช็ค</div>
            <div className="border-b border-dotted border-slate-600 h-5" />
            <div>วันที่ ...../...../.....</div>
          </div>
          <div className="min-w-0 border border-slate-900 p-2.5 space-y-3 flex flex-col justify-between">
            <div className="font-medium">ผู้ตรวจสอบ</div>
            {renderSigImg(
              requestMeta?.hrSignatureUrl || requestMeta?.managerSignatureUrl,
              requestMeta?.hrName || requestMeta?.managerName,
              null
            )}
            <div className="tabular-nums">
              วันที่{' '}
              {formatDateTh(
                requestMeta?.hrApprovedAt || requestMeta?.managerApprovedAt
              ) || '...../...../.....'}
            </div>
          </div>
        </div>

        <div className="text-right text-[11px] font-mono text-slate-700 leading-tight">
          <div>F-GA-007 Rev.00</div>
          <div>Effective date: 2 July 19</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 8 & 9. ADV-PCV: ใบเบิกเงินทดลอง (Advance Form) / ใบสั่งจ่ายเงินสดย่อย (Petty Cash Voucher)
  // =========================================================================
  const voucherType: 'advance' | 'petty_cash' =
    data.voucherType === 'petty_cash' ? 'petty_cash' : 'advance';

  const advanceItems: Array<{ description: string; amount: string }> =
    Array.isArray(data.advanceItems) ? data.advanceItems : [];
  const pettyItems: Array<{
    account: string;
    accountCode: string;
    dr: string;
    cr: string;
  }> = Array.isArray(data.pettyItems) ? data.pettyItems : [];

  const updateAdvItem = (idx: number, field: string, val: string) => {
    if (isReadOnly || !onChange) return;
    const next = advanceItems.map((it, i) =>
      i === idx ? { ...it, [field]: val } : it
    );
    const total = next.reduce((s, r) => s + Number(r.amount || 0), 0);
    onChange({ ...data, advanceItems: next, amountBht: String(total) });
  };

  const updatePettyItem = (idx: number, field: string, val: string) => {
    if (isReadOnly || !onChange) return;
    const next = pettyItems.map((it, i) =>
      i === idx ? { ...it, [field]: val } : it
    );
    const total = next.reduce((s, r) => s + Number(r.dr || 0), 0);
    onChange({ ...data, pettyItems: next, amountBht: String(total) });
  };

  return (
    <div className="paper-sheet bg-white border border-slate-300 p-5 sm:p-9 text-slate-900 shadow-xs space-y-5">
      {/* Mode Switcher (Hidden on print) */}
      {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit no-print">
          <button
            type="button"
            onClick={() => updateField('voucherType', 'advance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              voucherType === 'advance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ใบเบิกเงินทดลอง (Advance Form)
          </button>
          <button
            type="button"
            onClick={() => updateField('voucherType', 'petty_cash')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              voucherType === 'petty_cash'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ใบสั่งจ่ายเงินสดย่อย (Petty Cash Voucher)
          </button>
        </div>
      )}

      {/* Company Logo + Title */}
      <div className="flex items-center gap-4">
        {renderLogoMark()}
        <div>
          <div className="text-sm sm:text-base font-bold">
            บริษัท ซูมิโน อาปิโก (ไทยแลนด์) จำกัด
          </div>
          <div className="text-xs sm:text-sm font-medium text-slate-700">
            SUMINO AAPICO (Thailand) Co.,Ltd.
          </div>
        </div>
      </div>

      <div className="text-center text-base sm:text-lg font-bold">
        {voucherType === 'advance'
          ? 'ใบเบิกเงินทดลอง Advance Form'
          : 'ใบสั่งจ่ายเงินสดย่อย Petty Cash Voucher'}
      </div>

      {/* Top 2-Column Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-3 text-xs sm:text-sm">
        <div className="sm:col-span-7 print:col-span-7 min-w-0 flex items-center gap-2">
          <span className="shrink-0">จ่ายให้/Pay</span>
          {renderLineInput('payTo', 'ชื่อผู้รับเงิน / ซัพพลายเออร์', 'flex-1 min-w-0')}
        </div>
        <div className="sm:col-span-5 print:col-span-5 min-w-0 flex items-center gap-2">
          <span className="shrink-0">เลขที่ /No.</span>
          {renderLineInput(
            'voucherNo',
            requestMeta?.docNumber || 'เลขที่เอกสาร',
            'flex-1 min-w-0'
          )}
        </div>

        <div className="sm:col-span-7 print:col-span-7 min-w-0 flex items-center gap-2">
          <span className="shrink-0">รายการ/Description</span>
          {renderLineInput('description', 'ระบุรายละเอียดค่าใช้จ่าย', 'flex-1 min-w-0')}
        </div>
        <div className="sm:col-span-5 print:col-span-5 min-w-0 flex items-center gap-2">
          <span className="shrink-0">วันที่/Date</span>
          {renderLineInput('requestDate', '', 'flex-1 min-w-0', 'date')}
        </div>

        <div className="sm:col-span-7 print:col-span-7 min-w-0 flex items-center gap-2">
          <span className="shrink-0">แผนก/Department</span>
          {renderLineInput('department', 'ระบุแผนก', 'flex-1 min-w-0')}
        </div>
        <div className="sm:col-span-5 print:col-span-5 min-w-0 flex items-center gap-2">
          <span className="shrink-0">จำนวนเงิน/Amount Bht.</span>
          {renderLineInput('amountBht', '0.00', 'flex-1 min-w-0', 'number', 'text-right font-bold')}
        </div>
      </div>

      {/* Table Body: Advance Form vs Petty Cash Voucher */}
      {voucherType === 'advance' ? (
        <div className="space-y-2">
          <div className="overflow-x-auto border-2 border-slate-900">
            <table className="w-full min-w-[520px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-900 text-center bg-slate-50">
                  <th className="py-2 px-3 border-r border-slate-900">
                    รายการ<div className="font-normal text-xs">Description</div>
                  </th>
                  <th className="py-2 px-3 w-48">
                    จำนวนเงิน<div className="font-normal text-xs">Amount</div>
                  </th>
                  {!isReadOnly && (
                    <th className="py-2 px-2 border-l border-slate-900 w-10">
                      ลบ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {advanceItems.map((it, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-dotted border-slate-400 last:border-b-0"
                  >
                    <td className="p-1.5 border-r border-slate-900">
                      {isReadOnly ? (
                        it.description || '\u00A0'
                      ) : (
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) =>
                            updateAdvItem(idx, 'description', e.target.value)
                          }
                          placeholder="รายละเอียดค่าใช้จ่าย"
                          className="w-full border border-slate-200 px-2 py-0.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="p-1.5 text-right tabular-nums">
                      {isReadOnly ? (
                        Number(it.amount || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })
                      ) : (
                        <input
                          type="number"
                          value={it.amount}
                          onChange={(e) =>
                            updateAdvItem(idx, 'amount', e.target.value)
                          }
                          className="w-full border border-slate-200 px-2 py-0.5 text-xs text-right tabular-nums"
                        />
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="p-1.5 border-l border-slate-900 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            advanceItems.length > 1 &&
                            updateField(
                              'advanceItems',
                              advanceItems.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() =>
                updateField('advanceItems', [
                  ...advanceItems,
                  { description: '', amount: '0' },
                ])
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 border border-blue-200 bg-blue-50 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มแถวรายการ</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-x-auto border-2 border-slate-900">
            <table className="w-full min-w-[580px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-900 text-center bg-slate-50">
                  <th className="py-2 px-3 border-r border-slate-900">
                    Accounts
                  </th>
                  <th className="py-2 px-3 border-r border-slate-900 w-32">
                    Account Code
                  </th>
                  <th className="py-2 px-3 border-r border-slate-900 w-32">
                    Dr.
                  </th>
                  <th className="py-2 px-3 w-32">Cr.</th>
                  {!isReadOnly && (
                    <th className="py-2 px-2 border-l border-slate-900 w-10">
                      ลบ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pettyItems.map((it, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-dotted border-slate-400 last:border-b-0"
                  >
                    <td className="p-1.5 border-r border-slate-900">
                      {isReadOnly ? (
                        it.account || '\u00A0'
                      ) : (
                        <input
                          type="text"
                          value={it.account}
                          onChange={(e) =>
                            updatePettyItem(idx, 'account', e.target.value)
                          }
                          placeholder="ชื่อบัญชี / รายการ"
                          className="w-full border border-slate-200 px-2 py-0.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="p-1.5 border-r border-slate-900 font-mono">
                      {isReadOnly ? (
                        it.accountCode || '\u00A0'
                      ) : (
                        <input
                          type="text"
                          value={it.accountCode}
                          onChange={(e) =>
                            updatePettyItem(idx, 'accountCode', e.target.value)
                          }
                          placeholder="5100-01"
                          className="w-full border border-slate-200 px-2 py-0.5 text-xs font-mono"
                        />
                      )}
                    </td>
                    <td className="p-1.5 border-r border-slate-900 text-right tabular-nums">
                      {isReadOnly ? (
                        Number(it.dr || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })
                      ) : (
                        <input
                          type="number"
                          value={it.dr}
                          onChange={(e) =>
                            updatePettyItem(idx, 'dr', e.target.value)
                          }
                          className="w-full border border-slate-200 px-2 py-0.5 text-xs text-right tabular-nums"
                        />
                      )}
                    </td>
                    <td className="p-1.5 text-right tabular-nums">
                      {isReadOnly ? (
                        Number(it.cr || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })
                      ) : (
                        <input
                          type="number"
                          value={it.cr}
                          onChange={(e) =>
                            updatePettyItem(idx, 'cr', e.target.value)
                          }
                          className="w-full border border-slate-200 px-2 py-0.5 text-xs text-right tabular-nums"
                        />
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="p-1.5 border-l border-slate-900 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            pettyItems.length > 1 &&
                            updateField(
                              'pettyItems',
                              pettyItems.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() =>
                updateField('pettyItems', [
                  ...pettyItems,
                  { account: '', accountCode: '', dr: '0', cr: '0' },
                ])
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 border border-blue-200 bg-blue-50 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มแถวรายการ</span>
            </button>
          )}
        </div>
      )}

      {/* Signature Strip: 5 boxes for Advance Form, 4 boxes for Petty Cash Voucher */}
      {voucherType === 'advance' ? (
        <div className="grid grid-cols-1 sm:grid-cols-5 print:grid-cols-5 border-2 border-slate-900 text-xs text-center">
          <div className="min-w-0 p-2 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center">
              {renderSigImg(
                requestMeta?.receiptSignatureUrl ||
                  requestMeta?.requesterSignatureUrl,
                requestMeta?.requesterName || data.payTo,
                null
              )}
            </div>
            <div className="font-semibold pt-1 border-t border-slate-200">
              ผู้รับเงิน
              <div>Money Receiver</div>
            </div>
          </div>
          <div className="min-w-0 p-2 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center">
              {renderSigImg(requestMeta?.hrSignatureUrl, requestMeta?.hrName, null)}
            </div>
            <div className="font-semibold pt-1 border-t border-slate-200">
              ผู้จ่ายเงิน
              <div>Payment By</div>
            </div>
          </div>
          <div className="min-w-0 p-2 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center">
              {renderSigImg(
                requestMeta?.deptHeadSignatureUrl,
                requestMeta?.deptHeadName,
                null
              )}
            </div>
            <div className="font-semibold pt-1 border-t border-slate-200">
              ผู้ตรวจสอบ
              <div>Check by</div>
            </div>
          </div>
          <div className="min-w-0 p-2 border-b sm:border-b-0 sm:border-r print:border-b-0 print:border-r border-slate-900 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center">
              {renderSigImg(
                requestMeta?.managerSignatureUrl,
                requestMeta?.managerName,
                null
              )}
            </div>
            <div className="font-semibold pt-1 border-t border-slate-200">
              อนุมัติ
              <div>Approved by</div>
            </div>
          </div>
          <div className="min-w-0 p-2 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center" />
            <div className="font-semibold pt-1 border-t border-slate-200">
              อนุมัติ
              <div>Approved by</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 print:grid-cols-4 gap-3 text-xs text-center">
          <div className="min-w-0 border-2 border-slate-900 p-2 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center">
              {renderSigImg(
                requestMeta?.receiptSignatureUrl ||
                  requestMeta?.requesterSignatureUrl,
                requestMeta?.requesterName || data.payTo,
                null
              )}
            </div>
            <div className="font-semibold pt-1 border-t border-slate-200">
              ผู้รับเงิน
              <div>Money Receiver</div>
            </div>
          </div>
          <div className="min-w-0 border-2 border-slate-900 p-2 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center">
              {renderSigImg(requestMeta?.hrSignatureUrl, requestMeta?.hrName, null)}
            </div>
            <div className="font-semibold pt-1 border-t border-slate-200">
              ผู้จ่ายเงิน
              <div>Payment By</div>
            </div>
          </div>
          <div className="min-w-0 border-2 border-slate-900 p-2 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center">
              {renderSigImg(
                requestMeta?.deptHeadSignatureUrl,
                requestMeta?.deptHeadName,
                null
              )}
            </div>
            <div className="font-semibold pt-1 border-t border-slate-200">
              ตรวจสอบโดย
              <div>Checked by</div>
            </div>
          </div>
          <div className="min-w-0 border-2 border-slate-900 p-2 flex flex-col justify-between min-h-[78px]">
            <div className="flex-1 flex items-center justify-center">
              {renderSigImg(
                requestMeta?.managerSignatureUrl,
                requestMeta?.managerName,
                null
              )}
            </div>
            <div className="font-semibold pt-1 border-t border-slate-200">
              อนุมัติ
              <div>Approved by</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
