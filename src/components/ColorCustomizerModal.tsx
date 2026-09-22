import React from 'react';
import { CLASS_LIST, RAID_CLASSES, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, RaidClass } from '../types';
import { Palette, RotateCcw, X, Check, Sparkles } from 'lucide-react';

interface ColorCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customColors: CustomClassColors;
  onUpdateColor: (className: RaidClass, hex: string) => void;
  onResetColor: (className: RaidClass) => void;
  onResetAllColors: () => void;
  onApplyPreset: (presetColors: CustomClassColors) => void;
}

const COLOR_PRESETS: { name: string; desc: string; colors: CustomClassColors }[] = [
  {
    name: 'Mặc định (Chuẩn ảnh)',
    desc: 'Màu sắc môn phái nguyên bản và ảnh gốc',
    colors: {
      'Toái Mộng': '#52B3F7',
      'Huyết Hà': '#BF1E1E',
      'Thiết Y': '#EFA00B',
      'Thương Lan': '#0A74B7',
      'Thần Tương': '#1B5DCE',
      'Cửu Linh': '#6B2495',
      'Long Ngâm': '#1B929A',
      'Tố Vấn': '#75CD8D',
      'Thiên Vấn': '#25A26B',
      'Triều Quang': '#F45D78',
      'Huyền Cơ': '#4A6984',
    },
  },
  {
    name: 'Pastel Dịu Mắt',
    desc: 'Tông màu phấn nhẹ nhàng, thanh lịch',
    colors: {
      'Toái Mộng': '#7dd3fc',
      'Huyết Hà': '#f87171',
      'Thiết Y': '#fcd34d',
      'Thương Lan': '#38bdf8',
      'Thần Tương': '#60a5fa',
      'Cửu Linh': '#c084fc',
      'Long Ngâm': '#5eead4',
      'Tố Vấn': '#86efac',
      'Thiên Vấn': '#4ade80',
      'Triều Quang': '#f472b6',
      'Huyền Cơ': '#94a3b8',
    },
  },
  {
    name: 'Neon Nổi Bật',
    desc: 'Gam màu cực kỳ tương phản và bắt mắt',
    colors: {
      'Toái Mộng': '#00d2ff',
      'Huyết Hà': '#ff0055',
      'Thiết Y': '#ffb703',
      'Thương Lan': '#0099ff',
      'Thần Tương': '#0044ff',
      'Cửu Linh': '#aa00ff',
      'Long Ngâm': '#00f5d4',
      'Tố Vấn': '#00ff66',
      'Thiên Vấn': '#00e676',
      'Triều Quang': '#ff007f',
      'Huyền Cơ': '#00b4d8',
    },
  },
];

const QUICK_SWATCHES = [
  '#BF1E1E', '#DC2626', '#EA580C', '#EFA00B', '#F59E0B',
  '#75CD8D', '#10B981', '#059669', '#1B929A', '#0D9488',
  '#52B3F7', '#38BDF8', '#1B5DCE', '#2563EB', '#6B2495',
  '#7C3AED', '#9333EA', '#F45D78', '#EC4899', '#4A6984',
  '#334155', '#1E293B',
];

export const ColorCustomizerModal: React.FC<ColorCustomizerModalProps> = ({
  isOpen,
  onClose,
  customColors,
  onUpdateColor,
  onResetColor,
  onResetAllColors,
  onApplyPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="color-customizer-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
    >
      <div
        id="color-customizer-card"
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Tùy Chỉnh Màu Sắc Môn Phái
              </h3>
              <p className="text-[11px] text-slate-500">
                Thay đổi màu sắc môn phái bất kỳ theo sở thích của bang hội
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-5">
          {/* Quick Presets Bar */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Bộ màu mẫu nhanh
              </span>

              <button
                type="button"
                id="btn-reset-all-colors"
                onClick={onResetAllColors}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 transition-colors py-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại tất cả về mặc định</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onApplyPreset(preset.colors)}
                  className="p-2.5 sm:p-3 text-left border border-slate-200 hover:border-purple-400 rounded-xl hover:bg-purple-50/30 transition-all group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-purple-700 mb-0.5">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-1 mb-1.5">
                    {preset.desc}
                  </div>
                  {/* Color dots preview */}
                  <div className="flex items-center gap-1">
                    {CLASS_LIST.slice(0, 7).map((c) => (
                      <span
                        key={c}
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: preset.colors[c] }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* List of Classes with Individual Color Pickers */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
              Chi tiết màu từng môn phái ({CLASS_LIST.length} phái)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {CLASS_LIST.map((cls) => {
                const meta = getEffectiveClassMeta(cls, customColors);
                const isCustomized = customColors[cls] !== undefined;

                return (
                  <div
                    key={cls}
                    id={`custom-color-row-${cls}`}
                    className="flex items-center justify-between p-2.5 border border-slate-200 rounded-xl hover:border-slate-300 bg-white gap-2"
                  >
                    {/* Left: Preview Pill */}
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-24 sm:w-28 py-1.5 px-2 rounded-lg text-center font-bold text-xs shadow-2xs shrink-0 truncate transition-colors border border-black/10"
                        style={{
                          backgroundColor: meta.bgColor,
                          color: meta.textColor,
                        }}
                      >
                        {cls}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-600 truncate font-medium">
                          {meta.role} • {meta.shortName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase">
                          {meta.bgColor}
                        </div>
                      </div>
                    </div>

                    {/* Right: Color Picker Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Native Color Picker trigger */}
                      <label
                        className="relative cursor-pointer w-9 h-9 rounded-xl overflow-hidden border border-slate-300 shadow-2xs hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shrink-0"
                        style={{ backgroundColor: meta.bgColor }}
                        title="Chạm để chọn màu bất kỳ"
                      >
                        <input
                          type="color"
                          value={meta.bgColor}
                          onChange={(e) => onUpdateColor(cls, e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>

                      {/* Reset single class color */}
                      {isCustomized && (
                        <button
                          type="button"
                          onClick={() => onResetColor(cls)}
                          title="Khôi phục màu mặc định"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Swatches Palette */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
              Bảng màu gợi ý nhanh:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SWATCHES.map((hex) => (
                <span
                  key={hex}
                  className="w-5 h-5 rounded-md border border-black/15 shadow-2xs inline-block shrink-0"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 text-center sm:text-left">
            Màu sắc được tự động lưu cho bảng raid, ảnh xuất và file Excel
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs min-h-[40px]"
          >
            <Check className="w-4 h-4" />
            <span>Hoàn tất</span>
          </button>
        </div>
      </div>
    </div>
  );
};
