import React, { useState } from 'react';
import { RaidMember } from '../types';
import { findDuplicateIngames, findDuplicateLoggedBys } from '../utils/duplicates';
import { AlertTriangle, AlertCircle, ChevronDown, ChevronUp, UserCheck, Users } from 'lucide-react';

interface DuplicateWarningBannerProps {
  members: RaidMember[];
  onScrollToMember?: (stt: number) => void;
}

export const DuplicateWarningBanner: React.FC<DuplicateWarningBannerProps> = ({
  members,
  onScrollToMember,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const duplicateIngames = findDuplicateIngames(members);
  const duplicateLoggedBys = findDuplicateLoggedBys(members);

  const totalWarnings = duplicateIngames.length + duplicateLoggedBys.length;

  if (totalWarnings === 0) return null;

  return (
    <div
      id="duplicate-warning-banner"
      className="w-full max-w-[620px] mb-3.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/95 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 shadow-xs overflow-hidden transition-all print:hidden"
    >
      {/* Banner Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-amber-100/70 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-100">
              Phát hiện thông tin trùng lặp
            </span>
            <div className="flex items-center gap-1">
              {duplicateIngames.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-black border border-red-200 dark:border-red-800">
                  {duplicateIngames.length} Ingame trùng
                </span>
              )}
              {duplicateLoggedBys.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 text-[10px] font-black border border-amber-300 dark:border-amber-700">
                  {duplicateLoggedBys.length} Logged by trùng
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 px-2 py-1 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-900/60 transition-colors"
        >
          <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Content Details */}
      {isExpanded && (
        <div className="p-3 sm:p-3.5 space-y-2.5 text-xs">
          {/* Duplicate Ingame Section */}
          {duplicateIngames.length > 0 && (
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-2.5 border border-red-200 dark:border-red-900/50">
              <div className="font-bold text-red-700 dark:text-red-400 text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Trùng tên Ingame ({duplicateIngames.length} trường hợp):</span>
              </div>
              <div className="space-y-1.5">
                {duplicateIngames.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center justify-between gap-1 text-[11px] bg-red-50/60 dark:bg-red-950/30 p-1.5 rounded-md border border-red-100 dark:border-red-900/30"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        {item.originalName}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        xuất hiện ở {item.count} vị trí:
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.stts.map((stt) => (
                        <button
                          key={stt}
                          type="button"
                          onClick={() => onScrollToMember && onScrollToMember(stt)}
                          className="px-2 py-0.5 font-bold text-[10px] bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title={`Click để cuộn tới STT #${stt}`}
                        >
                          STT #{stt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Logged By Section */}
          {duplicateLoggedBys.length > 0 && (
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-2.5 border border-amber-200 dark:border-amber-900/50">
              <div className="font-bold text-amber-800 dark:text-amber-400 text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Trùng người Log acc ({duplicateLoggedBys.length} người đang log nhiều acc):</span>
              </div>
              <div className="space-y-1.5">
                {duplicateLoggedBys.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center justify-between gap-1 text-[11px] bg-amber-50/60 dark:bg-amber-950/30 p-1.5 rounded-md border border-amber-100 dark:border-amber-900/30"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        {item.originalName}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        đang log acc cho {item.count} vị trí:
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.stts.map((stt) => (
                        <button
                          key={stt}
                          type="button"
                          onClick={() => onScrollToMember && onScrollToMember(stt)}
                          className="px-2 py-0.5 font-bold text-[10px] bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                          title={`Click để cuộn tới STT #${stt}`}
                        >
                          STT #{stt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-amber-700 dark:text-amber-400/90 italic pt-0.5">
            Mẹo: Các ô có thông tin trùng lặp sẽ được viền màu vàng/cam nổi bật kèm biểu tượng cảnh báo trực tiếp trong bảng.
          </div>
        </div>
      )}
    </div>
  );
};
