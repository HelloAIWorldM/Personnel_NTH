import React from 'react';
import { DolphinLogo } from './DolphinLogo';
import { CowLogo } from './CowLogo';
import { FrogLogo } from './FrogLogo';
import { X, Check, Sparkles, Palette, Waves, Heart, Leaf } from 'lucide-react';

export type AppThemeKey = 'dolphin' | 'cow' | 'frog';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppThemeKey;
  onSelectTheme: (theme: AppThemeKey) => void;
}

interface ThemeOption {
  key: AppThemeKey;
  name: string;
  tag: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  icon: React.ReactNode;
  mascot: React.ReactNode;
  swatches: string[];
  containerBorderActive: string;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const themes: ThemeOption[] = [
    {
      key: 'dolphin',
      name: 'Cá Heo Xanh Aqua',
      tag: 'Mặc định • Ocean Aqua',
      badgeBg: 'bg-[#CCFBF1] dark:bg-[#134E4A]',
      badgeText: 'text-[#0284C7] dark:text-[#7DD3FC]',
      badgeBorder: 'border-[#38BDF8] dark:border-[#0284C7]',
      description:
        'Giao diện đại dương tươi mát với bầy cá heo xanh nhảy sóng, bong bóng nước, sò biển và sao biển sinh động.',
      icon: <Waves className="w-4 h-4 text-[#00B4D8]" />,
      mascot: <DolphinLogo size={52} showText={false} />,
      swatches: ['#E0F7FA', '#88DCFA', '#00B4D8', '#0284C7'],
      containerBorderActive: 'border-[#00B4D8] ring-2 ring-[#00B4D8]/40 bg-[#F0FDFA] dark:bg-[#0D2838]',
    },
    {
      key: 'cow',
      name: 'Bò Sữa Hồng Dâu',
      tag: 'Kawaii • Strawberry Milk',
      badgeBg: 'bg-[#FFE5EC] dark:bg-[#4A2E35]',
      badgeText: 'text-[#C93B66] dark:text-[#FFB3C1]',
      badgeBorder: 'border-[#F5B7B1] dark:border-[#854D59]',
      description:
        'Giao diện sữa dâu ngọt ngào với chú bò sữa đốm đen kawaii, hộp sữa dâu tươi, quả dâu tây và trái tim bay lượn.',
      icon: <Heart className="w-4 h-4 text-[#FF8FA3]" />,
      mascot: <CowLogo size={52} showText={false} />,
      swatches: ['#FFF0F3', '#FFCCD5', '#FF8FA3', '#C93B66'],
      containerBorderActive: 'border-[#FF8FA3] ring-2 ring-[#FF8FA3]/40 bg-[#FFF5F7] dark:bg-[#2A1218]',
    },
    {
      key: 'frog',
      name: 'Ếch Xanh Hồ Sen',
      tag: 'Matcha Zen • Lily Pond',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
      badgeText: 'text-emerald-800 dark:text-emerald-300',
      badgeBorder: 'border-emerald-300 dark:border-emerald-700/60',
      description:
        'Giao diện hồ sen matcha thư thái với chú ếch xanh che ô lá sen, đóa hoa sen hồng và lá sen bồng bềnh gợn sóng.',
      icon: <Leaf className="w-4 h-4 text-emerald-600" />,
      mascot: <FrogLogo size={52} showText={false} />,
      swatches: ['#F0FDF4', '#BBF7D0', '#86EFAC', '#15803D'],
      containerBorderActive: 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/60 dark:bg-[#103020]',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-white dark:bg-[#101A24] border border-sky-300 dark:border-[#1F3347] rounded-3xl shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1F3347] bg-slate-50/80 dark:bg-[#162230]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-teal-300 text-slate-950 flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 id="theme-modal-title" className="font-extrabold text-sm sm:text-base leading-tight">
                Tuỳ Chọn Chủ Đề & Background
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chọn linh vật logo & hiệu ứng background theo sở thích
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Theme Cards */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          {themes.map((theme) => {
            const isSelected = currentTheme === theme.key;

            return (
              <div
                key={theme.key}
                onClick={() => {
                  onSelectTheme(theme.key);
                }}
                className={`group relative rounded-2xl border p-3.5 sm:p-4 cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                  isSelected
                    ? theme.containerBorderActive
                    : 'border-slate-200 dark:border-[#1F3347] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#121B24] hover:shadow-xs'
                }`}
              >
                {/* Mascot Icon */}
                <div className="shrink-0 p-1.5 rounded-2xl bg-white dark:bg-[#162230] border border-slate-200/80 dark:border-slate-700/60 shadow-2xs group-hover:scale-105 transition-transform flex items-center justify-center">
                  {theme.mascot}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {theme.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                    >
                      {theme.tag}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">
                    {theme.description}
                  </p>

                  {/* Swatch color circles */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mr-1">
                      Màu sắc:
                    </span>
                    {theme.swatches.map((color, cIdx) => (
                      <span
                        key={cIdx}
                        className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Selection indicator */}
                <div className="absolute top-3.5 right-3.5 shrink-0">
                  {isSelected ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 group-hover:border-slate-400 transition-colors" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-[#1F3347] bg-slate-50/60 dark:bg-[#162230] flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Lựa chọn của bạn được tự động ghi nhớ trên trình duyệt này
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
