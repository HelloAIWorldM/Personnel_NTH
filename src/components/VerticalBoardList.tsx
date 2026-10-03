import React from 'react';
import { RaidBoard } from '../types';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Calendar,
  Sparkles,
  FolderPlus,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { findScheduleConflictsForBoard } from '../utils/duplicates';

interface VerticalBoardListProps {
  boards: RaidBoard[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onAddNewBoard: () => void;
  onOpenCreateModal?: () => void;
  onDuplicateBoard?: (boardId: string) => void;
  onDeleteBoard?: (boardId: string) => void;
  isRaidUpdate?: boolean;
}

export const VerticalBoardList: React.FC<VerticalBoardListProps> = ({
  boards,
  activeBoardId,
  onSelectBoard,
  onAddNewBoard,
  onOpenCreateModal,
  onDuplicateBoard,
  onDeleteBoard,
  isRaidUpdate = false,
}) => {
  const nextBoardNumber = boards.length + 1;

  return (
    <aside className="w-full bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-3 shadow-xs transition-colors flex flex-col">
      {/* Header bar of Vertical Board Navigator */}
      <div className="flex items-center justify-between gap-1.5 pb-2.5 mb-2.5 border-b border-slate-200 dark:border-[#1F3347]">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isRaidUpdate
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-sky-500/20 text-sky-600 dark:text-[#88DCFA]'
            }`}
          >
            {isRaidUpdate ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate uppercase tracking-wider">
              {isRaidUpdate ? 'Bảng Update' : 'Bảng Raid'}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-[#8CA4B8]">
              {boards.length} bảng đã tạo
            </p>
          </div>
        </div>

        {onOpenCreateModal && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            title="Tạo bảng tùy chỉnh nâng cao"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162230] transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Action: + Thêm Bảng Button */}
      <div className="mb-3 space-y-1.5">
        <button
          type="button"
          id="btn-vertical-add-board"
          onClick={onAddNewBoard}
          title={`Tạo thêm Bảng ${isRaidUpdate ? 'Raid Update' : 'Raid'} ${nextBoardNumber}`}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
            isRaidUpdate
              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
              : 'bg-[#88DCFA] hover:bg-[#68CEF6] text-slate-950 shadow-[0_0_12px_rgba(136,220,250,0.35)]'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Thêm Bảng (Raid {nextBoardNumber})</span>
        </button>
      </div>

      {/* Vertical Scrollable Board Cards Container */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-250px)] min-h-[280px] space-y-2 pr-1 custom-scrollbar">
        {boards.map((board, index) => {
          const isActive = board.id === activeBoardId;
          const membersList = Array.isArray(board.members) ? board.members : [];
          const filledCount = membersList.filter(
            (m) => m && m.ingame && m.ingame.trim() !== ''
          ).length;
          const totalSlots = membersList.length || 12;
          const isFullyFilled = filledCount === totalSlots && totalSlots > 0;
          const scheduleConflicts = findScheduleConflictsForBoard(board, boards);
          const hasConflicts = scheduleConflicts.length > 0;

          return (
            <div
              key={board.id}
              onClick={() => onSelectBoard(board.id)}
              className={`group relative rounded-xl border p-2.5 cursor-pointer transition-all select-none ${
                isActive
                  ? isRaidUpdate
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 shadow-sm ring-1 ring-emerald-400/40'
                    : 'bg-sky-500/10 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500 shadow-sm ring-1 ring-sky-400/40'
                  : hasConflicts
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  : 'bg-slate-50 dark:bg-[#162230] border-slate-200 dark:border-[#1F3347] hover:bg-slate-100 dark:hover:bg-[#1D2D40] hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Top row: STT, Title & Count Badge */}
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 ${
                      isActive
                        ? isRaidUpdate
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-[#88DCFA] text-slate-950'
                        : hasConflicts
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span
                    className={`font-black text-xs truncate ${
                      isActive
                        ? isRaidUpdate
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-sky-800 dark:text-[#88DCFA]'
                        : hasConflicts
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {board.titlePrefix}
                  </span>
                </div>

                {/* Filled count badge */}
                <div
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black flex items-center gap-1 shrink-0 ${
                    isFullyFilled
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700'
                      : filledCount > 0
                      ? isActive
                        ? isRaidUpdate
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-sky-500/20 text-sky-800 dark:text-[#88DCFA]'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-200 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isFullyFilled && <CheckCircle2 className="w-2.5 h-2.5" />}
                  <span>
                    {filledCount}/{totalSlots}
                  </span>
                </div>
              </div>

              {/* Sub row: Schedule & Boss */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8CA4B8]">
                <div className="truncate flex items-center gap-1 min-w-0 pr-2">
                  <Calendar className="w-3 h-3 shrink-0 opacity-70" />
                  <span className="truncate">
                    {board.scheduleTime || 'MON 20:30'}
                    {board.bossName ? ` • ${board.bossName}` : ''}
                  </span>
                </div>

                {/* Card Quick Actions: Duplicate & Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  {onDuplicateBoard && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateBoard(board.id);
                      }}
                      title="Nhân bản bảng này"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}

                  {boards.length > 1 && onDeleteBoard && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBoard(board.id);
                      }}
                      title="Xoá bảng này"
                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Warning badge for cross-board schedule conflicts */}
              {hasConflicts && (
                <div className="mt-1.5 pt-1 border-t border-rose-200/80 dark:border-rose-900/50 flex items-center justify-between">
                  <span
                    title={`⚠️ Có ${scheduleConflicts.length} vị trí trùng nhân sự cùng khung giờ [${board.scheduleTime}] với bảng khác!`}
                    className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 animate-pulse" />
                    <span>Trùng giờ ({scheduleConflicts.length} chỗ)</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2 mt-2 border-t border-slate-100 dark:border-[#1F3347] flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>Cuộn dọc để xem thêm</span>
        <span>{boards.length} Bảng</span>
      </div>
    </aside>
  );
};
