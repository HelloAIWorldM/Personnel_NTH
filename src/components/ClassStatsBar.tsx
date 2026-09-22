import React from 'react';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, RaidClass, RaidMember } from '../types';
import { Shield, Heart, Sword, Users } from 'lucide-react';

interface ClassStatsBarProps {
  members: RaidMember[];
  customColors?: CustomClassColors;
  onSelectFilter?: (className: RaidClass | null) => void;
  selectedFilter?: RaidClass | null;
}

export const ClassStatsBar: React.FC<ClassStatsBarProps> = ({
  members,
  customColors,
  onSelectFilter,
  selectedFilter,
}) => {
  // Calculate counts
  const countsByClass = CLASS_LIST.reduce((acc, cls) => {
    acc[cls] = members.filter((m) => m.className === cls).length;
    return acc;
  }, {} as Record<RaidClass, number>);

  const tankCount = members.filter(
    (m) => getEffectiveClassMeta(m.className, customColors).role === 'Tank'
  ).length;
  const healerCount = members.filter(
    (m) => getEffectiveClassMeta(m.className, customColors).role === 'Healer'
  ).length;
  const dpsCount = members.filter(
    (m) => getEffectiveClassMeta(m.className, customColors).role === 'DPS'
  ).length;

  return (
    <div
      id="raid-composition-stats"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs mb-4 sm:mb-6 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300 shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm uppercase tracking-wide">
            Đội hình Raid ({members.length} người)
          </span>
        </div>

        {/* Roles breakdown */}
        <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-semibold overflow-x-auto pb-0.5 sm:pb-0">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800/60 shrink-0">
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Tank:</span>
            <span className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200">{tankCount}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800/60 shrink-0">
            <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Healer:</span>
            <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">{healerCount}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800/60 shrink-0">
            <Sword className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
            <span>DPS:</span>
            <span className="font-bold text-xs sm:text-sm text-blue-900 dark:text-blue-200">{dpsCount}</span>
          </div>
        </div>
      </div>

      {/* Class pills breakdown */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-1.5 sm:gap-2">
        {CLASS_LIST.map((cls) => {
          const meta = getEffectiveClassMeta(cls, customColors);
          const count = countsByClass[cls] || 0;
          const isSelected = selectedFilter === cls;

          return (
            <button
              key={cls}
              id={`stat-badge-${cls}`}
              type="button"
              onClick={() => onSelectFilter?.(isSelected ? null : cls)}
              className={`flex items-center justify-between px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs transition-all active:scale-95 ${
                isSelected
                  ? 'ring-2 ring-slate-900 dark:ring-white shadow-sm'
                  : 'hover:opacity-90'
              }`}
              style={{
                backgroundColor: meta.bgColor,
                borderColor: meta.bgColor,
                color: meta.textColor,
              }}
              title={`${cls}: ${count} người (${meta.description})`}
            >
              <span className="font-bold truncate mr-1">{cls}</span>
              <span
                className={`font-black text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full shrink-0 ${
                  meta.textColor === '#FFFFFF'
                    ? 'bg-black/25 text-white'
                    : 'bg-black/15 text-slate-900'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
