import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool, Upload, Check } from 'lucide-react';

interface SignaturePadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  savedSignature?: string | null;
  label?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  savedSignature,
  label = 'ลายมือชื่ออิเล็กทรอนิกส์ (E-Signature)',
}) => {
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = (rect.width || 460) * dpr;
    canvas.height = (rect.height || 140) * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#0f172a';
    }
  }, [mode]);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    hasDrawnRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasDrawnRef.current) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    hasDrawnRef.current = false;
    onChange('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === 'draw'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>เซ็นชื่อบนหน้าจอ</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === 'upload'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>อัปโหลดรูปลายเซ็น</span>
          </button>
        </div>
      </div>

      {mode === 'draw' ? (
        <div className="space-y-2">
          <div className="relative border border-dashed border-slate-300 rounded-md bg-slate-50/70 overflow-hidden">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-36 touch-none cursor-crosshair block"
            />
            {!value && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                ลากเมาส์หรือนิ้วเพื่อลงลายมือชื่อในกรอบนี้
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>ล้างลายเซ็น</span>
              </button>
              {savedSignature && (
                <button
                  type="button"
                  onClick={() => onChange(savedSignature)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ใช้ลายเซ็นที่บันทึกไว้</span>
                </button>
              )}
            </div>
            {value && (
              <span className="text-xs text-emerald-700 font-medium">
                บันทึกลายเซ็นพร้อมใช้งานแล้ว
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md bg-slate-50/70 py-6 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <Upload className="w-5 h-5 text-slate-500 mb-1.5" />
            <span className="text-xs font-medium text-slate-700">
              คลิกเพื่อเลือกไฟล์รูปลายเซ็น (PNG, JPG พื้นหลังโปร่งใสแนะนำ)
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {savedSignature && (
            <button
              type="button"
              onClick={() => onChange(savedSignature)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ใช้ลายเซ็นที่บันทึกไว้</span>
            </button>
          )}
        </div>
      )}

      {value && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">ตัวอย่างลายเซ็นที่แนบ:</span>
          <img
            src={value}
            alt="ตัวอย่างลายเซ็น"
            className="h-12 max-w-[180px] object-contain border border-slate-200 rounded bg-white px-2 py-1"
          />
        </div>
      )}
    </div>
  );
};
