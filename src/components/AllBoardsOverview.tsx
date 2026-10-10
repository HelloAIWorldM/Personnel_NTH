import React, { useState, useMemo } from 'react';
import { RaidBoard, CustomClassColors, PersonnelMember, RaidClass } from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
import { CLASS_LIST } from '../constants/classes';
import {
  LayoutGrid,
  Check,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  ExternalLink,
  Copy,
  Trash2,
  Plus,
  Search,
  X,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Calendar,
  Layers,
} from 'lucide-react';

interface AllBoardsOverviewProps {
  boards: RaidBoard[];
  activeBoardId: string;
  customColors?: CustomClassColors;
  personnelPool?: PersonnelMember[];
  onSelectBoard: (boardId: string) => void;
  onDuplicateBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onToggleCheckMember?: (boardId: string, memberId: string) => void;
  onOpenCreateBoardModal: () => void;
  onBackToTable: () => void;
}

export const AllBoardsOverview: React.FC<AllBoardsOverviewProps> = ({
  boards,
  activeBoardId,
  customColors,
  personnelPool = [],
  onSelectBoard,
  onDuplicateBoard,
  onDeleteBoard,
  onToggleCheckMember,
  onOpenCreateBoardModal,
  onBackToTable,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showClassMatrix, setShowClassMatrix] = useState(false);

  // Normalize string for search and comparison
  const normalize = (str: string) => str.trim().toLowerCase();

  // Calculate Total & Per-board Stats
  const globalStats = useMemo(() => {
    let totalSlots = 0;
    let filledSlots = 0;
    let checkedCount = 0;
    let totalTanks = 0;
    let totalHealers = 0;
    let totalDps = 0;

    const boardStats = boards.map((board) => {
      const assigned = board.members.filter((m) => m.ingame && m.ingame.trim() !== '');
      const checked = assigned.filter((m) => m.checked).length;

      let tankCount = 0;
      let healerCount = 0;
      let dpsCount = 0;

      const classCounts: Record<string, number> = {};

      assigned.forEach((m) => {
        const meta = getEffectiveClassMeta(m.className, customColors);
        if (meta.role === 'Tank') tankCount++;
        else if (meta.role === 'Healer') healerCount++;
        else dpsCount++;

        classCounts[m.className] = (classCounts[m.className] || 0) + 1;
      });

      totalSlots += board.members.length;
      filledSlots += assigned.length;
      checkedCount += checked;
      totalTanks += tankCount;
      totalHealers += healerCount;
      totalDps += dpsCount;

      const isFull = assigned.length === board.members.length;
      const missingCount = board.members.length - assigned.length;
      const isMissingTank = tankCount === 0;
      const isMissingHealer = healerCount === 0;

      return {
        boardId: board.id,
        assignedCount: assigned.length,
        totalCount: board.members.length,
        checkedCount: checked,
        tankCount,
        healerCount,
        dpsCount,
        classCounts,
        isFull,
        missingCount,
        isMissingTank,
        isMissingHealer,
      };
    });

    // Detect Cross-board duplicate members
    const memberMap = new Map<
      string,
      {
        ingame: string;
        className: RaidClass;
        occurrences: { boardTitle: string; boardId: string; stt: number; party?: number }[];
      }
    >();

    boards.forEach((board) => {
      board.members.forEach((m) => {
        if (!m.ingame || !m.ingame.trim()) return;
        const norm = normalize(m.ingame);
        if (!memberMap.has(norm)) {
          memberMap.set(norm, {
            ingame: m.ingame,
            className: m.className,
            occurrences: [],
          });
        }
        memberMap.get(norm)!.occurrences.push({
          boardTitle: board.titlePrefix,
          boardId: board.id,
          stt: m.stt,
          party: m.party,
        });
      });
    });

    const duplicates = Array.from(memberMap.values()).filter(
      (item) => item.occurrences.length > 1
    );

    return {
      totalBoards: boards.length,
      totalSlots,
      filledSlots,
      checkedCount,
      occupancyRate: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0,
      totalTanks,
      totalHealers,
      totalDps,
      boardStats,
      duplicates,
    };
  }, [boards, customColors]);

  // Filtered members matching search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = normalize(searchQuery);

    const results: {
      ingame: string;
      className: RaidClass;
      loggedBy?: string;
      boardTitle: string;
      boardId: string;
      stt: number;
      party?: number;
      checked?: boolean;
    }[] = [];

    boards.forEach((board) => {
      board.members.forEach((m) => {
        if (!m.ingame || !m.ingame.trim()) return;
        const nameMatch = normalize(m.ingame).includes(q);
        const logMatch = m.loggedBy && normalize(m.loggedBy).includes(q);
        const classMatch = normalize(m.className).includes(q);

        if (nameMatch || logMatch || classMatch) {
          results.push({
            ingame: m.ingame,
            className: m.className,
            loggedBy: m.loggedBy,
            boardTitle: board.titlePrefix,
            boardId: board.id,
            stt: m.stt,
            party: m.party,
            checked: m.checked,
          });
        }
      });
    });

    return results;
  }, [searchQuery, boards]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Navigation Header */}
      <div className="bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#38BDF8] to-[#88DCFA] text-slate-950 font-black flex items-center justify-center shadow-xs">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Tổng Tình Trạng Tất Cả Bảng Raid</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-[#88DCFA]/15 text-sky-800 dark:text-[#88DCFA] border border-sky-300 dark:border-[#88DCFA]/30">
                  {boards.length} Bảng Raid
                </span>
              </h2>
              <p className="text-xs text-slate-700 dark:text-[#CADEEA] mt-0.5">
                Xem toàn cảnh slot nhân sự, đối chiếu vai trò Tank/Healer/DPS và kiểm tra trùng lặp nhân sự giữa các bảng
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setShowClassMatrix(!showClassMatrix)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-300/80 dark:border-[#1F3347] bg-white dark:bg-[#162230] hover:bg-slate-50 dark:hover:bg-[#1F3347] text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-[#88DCFA]" />
            <span>{showClassMatrix ? 'Ẩn Ma Trận Phái' : 'Ma Trận Môn Phái'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateBoardModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#88DCFA] hover:bg-[#68CEF6] active:bg-[#48BBF0] text-slate-950 font-black rounded-xl text-xs transition-all shadow-[0_0_12px_rgba(136,220,250,0.3)] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Bảng Raid Mới</span>
          </button>

          <button
            type="button"
            onClick={onBackToTable}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#101A24] hover:bg-slate-50 dark:hover:bg-[#162230] active:bg-slate-100 dark:active:bg-[#1F3347] text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-sky-300/80 dark:border-[#1F3347] rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <ArrowRight className="w-4 h-4 rotate-180 text-slate-500 dark:text-[#8CA4B8]" />
            <span>Về Bảng Xếp Chi Tiết</span>
          </button>
        </div>
      </div>

      {/* Global KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Slot đã xếp */}
        <div className="bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 dark:text-[#8CA4B8] text-xs font-bold mb-2">
            <span>Tiến Độ Lấp Slot</span>
            <Users className="w-4 h-4 text-sky-600 dark:text-[#88DCFA]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {globalStats.filledSlots}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-[#8CA4B8]">
                / {globalStats.totalSlots} slot ({globalStats.occupancyRate}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-[#0B1219] rounded-full mt-2 overflow-hidden border border-sky-200/80 dark:border-[#1F3347]">
              <div
                className="h-full bg-gradient-to-r from-[#38BDF8] to-[#88DCFA] transition-all duration-500"
                style={{ width: `${globalStats.occupancyRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Vai trò toàn cục */}
        <div className="bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 dark:text-[#8CA4B8] text-xs font-bold mb-2">
            <span>Cơ Cấu Vai Trò Tổng</span>
            <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-lg text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
              {globalStats.totalTanks} Tank
            </span>
            <span className="px-2 py-1 rounded-lg text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
              {globalStats.totalHealers} Healer
            </span>
            <span className="px-2 py-1 rounded-lg text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60">
              {globalStats.totalDps} DPS
            </span>
          </div>
        </div>

        {/* Card 3: Điểm danh có mặt */}
        <div className="bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 dark:text-[#8CA4B8] text-xs font-bold mb-2">
            <span>Điểm Danh Có Mặt</span>
            <UserCheck className="w-4 h-4 text-sky-600 dark:text-[#88DCFA]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-[#88DCFA]">
              {globalStats.checkedCount}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#8CA4B8]">
              / {globalStats.filledSlots} đã xếp
            </span>
          </div>
        </div>

        {/* Card 4: Kiểm tra trùng lặp */}
        <div className="bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 dark:text-[#8CA4B8] text-xs font-bold mb-2">
            <span>Trùng Lặp Nhân Sự</span>
            {globalStats.duplicates.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-[#88DCFA]" />
            )}
          </div>
          <div>
            {globalStats.duplicates.length > 0 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                  {globalStats.duplicates.length}
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  người ở &gt;1 bảng
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-[#88DCFA]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Không có nhân sự trùng lặp</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cross-Board Duplicate Inspector */}
      {globalStats.duplicates.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              Phát Hiện {globalStats.duplicates.length} Nhân Sự Được Xếp Vào Nhiều Hơn 1 Bảng Raid
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {globalStats.duplicates.map((dup) => {
              const meta = getEffectiveClassMeta(dup.className, customColors);
              return (
                <div
                  key={dup.ingame}
                  className="bg-white dark:bg-[#162230] border border-amber-300 dark:border-amber-900/60 rounded-xl p-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {dup.ingame}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                      style={{
                        backgroundColor: meta.bgColor,
                        color: meta.textColor,
                      }}
                    >
                      {dup.className}
                    </span>
                  </div>
                  <div className="text-[11px] space-y-1 text-slate-600 dark:text-[#8CA4B8]">
                    {dup.occurrences.map((occ, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-1 bg-amber-50/60 dark:bg-[#0B1219]/80 rounded-md"
                      >
                        <span className="font-bold text-amber-800 dark:text-amber-300">
                          {occ.boardTitle}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-[#CADEEA]">
                          STT {occ.stt} {occ.party ? `(PT ${occ.party})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 dark:text-[#8CA4B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm nhân sự trên toàn bộ các bảng Raid (theo Ingame, Logged by hoặc Môn phái)..."
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#88DCFA]/40 focus:border-[#88DCFA] shadow-2xs transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search results banner if searching */}
      {searchResults && (
        <div className="bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-black text-sky-800 dark:text-[#88DCFA]">
              Kết quả tìm kiếm cho "{searchQuery}": {searchResults.length} vị trí
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-bold text-sky-700 dark:text-[#88DCFA] hover:underline"
            >
              Đóng kết quả
            </button>
          </div>
          {searchResults.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-[#8CA4B8] italic">
              Không tìm thấy nhân sự nào khớp với từ khóa.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {searchResults.map((res, i) => {
                const meta = getEffectiveClassMeta(res.className, customColors);
                return (
                  <div
                    key={i}
                    onClick={() => onSelectBoard(res.boardId)}
                    className="p-2.5 bg-slate-50 dark:bg-[#162230] rounded-xl border border-slate-200 dark:border-[#1F3347] flex items-center justify-between gap-2 cursor-pointer hover:border-sky-400 dark:hover:border-[#88DCFA] transition-all shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {res.ingame}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ backgroundColor: meta.bgColor, color: meta.textColor }}
                        >
                          {res.className}
                        </span>
                      </div>
                      {res.loggedBy && (
                        <p className="text-[10px] text-slate-500 dark:text-[#8CA4B8]">
                          Log: {res.loggedBy}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-[#88DCFA] text-slate-950">
                        {res.boardTitle}
                      </span>
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-[#CADEEA] mt-0.5">
                        STT {res.stt} {res.party ? `(PT ${res.party})` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Class Matrix Table (Collapsible) */}
      {showClassMatrix && (
        <div className="bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-4 sm:p-5 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600 dark:text-[#88DCFA]" />
              <span>Bảng Phân Bổ Môn Phái Trên Tất Cả Các Bảng Raid</span>
            </h3>
            <span className="text-[11px] text-slate-600 dark:text-[#CADEEA]">
              Đối chiếu số lượng phái để cân đối lực lượng
            </span>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1F3347] text-slate-600 dark:text-[#8CA4B8] font-bold">
                <th className="py-2 px-3">Môn Phái</th>
                <th className="py-2 px-3">Vai Trò</th>
                {boards.map((b) => (
                  <th key={b.id} className="py-2 px-3 text-center">
                    {b.titlePrefix}
                  </th>
                ))}
                <th className="py-2 px-3 text-center font-black text-slate-900 dark:text-white">
                  Tổng Số
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F3347]/60 font-semibold">
              {CLASS_LIST.map((cls) => {
                const meta = getEffectiveClassMeta(cls, customColors);
                let rowTotal = 0;
                return (
                  <tr key={cls} className="hover:bg-slate-50 dark:hover:bg-[#162230]">
                    <td className="py-2 px-3 flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-black shrink-0"
                        style={{ backgroundColor: meta.bgColor, color: meta.textColor }}
                      >
                        {cls}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          meta.role === 'Tank'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                            : meta.role === 'Healer'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                        }`}
                      >
                        {meta.role}
                      </span>
                    </td>
                    {boards.map((b) => {
                      const count = b.members.filter((m) => m.className === cls && m.ingame).length;
                      rowTotal += count;
                      return (
                        <td
                          key={b.id}
                          className={`py-2 px-3 text-center font-bold ${
                            count > 0 ? 'text-sky-700 dark:text-[#88DCFA]' : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          {count > 0 ? count : '—'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center font-black text-slate-900 dark:text-white">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Multi-Board Grid: All Raid Boards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {boards.map((board, index) => {
          const stats = globalStats.boardStats[index];
          const isActive = board.id === activeBoardId;

          return (
            <div
              key={board.id}
              className={`bg-white dark:bg-[#101A24] border rounded-2xl flex flex-col shadow-sm transition-all ${
                isActive
                  ? 'border-sky-500 dark:border-[#88DCFA] ring-2 ring-sky-400/30 dark:ring-[#88DCFA]/40 shadow-lg'
                  : 'border-sky-300/80 dark:border-[#1F3347] hover:border-sky-400 dark:hover:border-[#2C4863]'
              }`}
            >
              {/* Board Card Header */}
              <div className="p-3.5 sm:p-4 border-b border-sky-200/80 dark:border-[#1F3347] bg-slate-50/90 dark:bg-[#162230] rounded-t-2xl">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-[#88DCFA] text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                      {board.titlePrefix}
                    </h3>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#88DCFA] text-slate-950 shrink-0 shadow-[0_0_8px_rgba(136,220,250,0.4)]">
                        Đang chọn
                      </span>
                    )}
                  </div>

                  {/* Slot Fill Status Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black shrink-0 border ${
                      stats.isFull
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80'
                        : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80'
                    }`}
                  >
                    {stats.assignedCount}/{stats.totalCount} Slot
                  </span>
                </div>

                {/* Subinfo: Schedule */}
                <div className="flex items-center text-xs text-sky-700 dark:text-[#88DCFA] gap-2 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-[#88DCFA]" />
                    <span>
                      {board.scheduleTime || 'Chưa hẹn giờ'}
                    </span>
                  </span>
                </div>

                {/* Role Pill Breakdown & Warnings */}
                <div className="mt-2.5 pt-2 border-t border-sky-200/60 dark:border-[#1F3347] flex items-center justify-between gap-2 flex-wrap text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800/50">
                      {stats.tankCount} Tank
                    </span>
                    <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/50">
                      {stats.healerCount} Healer
                    </span>
                    <span className="text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-800/50">
                      {stats.dpsCount} DPS
                    </span>
                  </div>

                  <span className="text-sky-700 dark:text-[#88DCFA] font-bold inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {stats.checkedCount} có mặt
                  </span>
                </div>

                {/* Warning notice if tank or healer is missing */}
                {(stats.isMissingTank || stats.isMissingHealer || stats.missingCount > 0) && (
                  <div className="mt-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>
                      {stats.missingCount > 0 ? `Còn trống ${stats.missingCount} slot. ` : ''}
                      {stats.isMissingTank ? 'Chưa có Tank! ' : ''}
                      {stats.isMissingHealer ? 'Chưa có Healer!' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Members List - Danh Sách 12 Slot Gộp Liền Mạch */}
              <div className="p-2.5 sm:p-3 flex-1 space-y-1 overflow-y-auto max-h-[460px]">
                {board.members.map((member) => {
                  const isAssigned = member.ingame && member.ingame.trim() !== '';
                  const meta = getEffectiveClassMeta(member.className, customColors);
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-colors ${
                        isAssigned
                          ? 'bg-slate-50 dark:bg-[#162230] border-slate-200 dark:border-[#1F3347] hover:border-sky-400 dark:hover:border-[#2C4863] text-slate-900 dark:text-white'
                          : 'border-dashed border-slate-200 dark:border-[#1F3347] text-slate-400 dark:text-[#64748B] bg-slate-50/50 dark:bg-[#0B1219]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 text-[11px] font-mono font-bold text-slate-500 dark:text-[#8CA4B8] shrink-0">
                          #{member.stt}
                        </span>
                        {isAssigned ? (
                          <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-black truncate text-xs ${
                                member.checked
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                              title={member.ingame}
                            >
                              {member.ingame}
                            </span>
                            {member.loggedBy && member.loggedBy !== member.ingame && (
                              <span className="text-[10px] text-slate-500 dark:text-[#8CA4B8] truncate">
                                (Log: {member.loggedBy})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-xs text-slate-400 dark:text-[#64748B]">Trống</span>
                        )}
                      </div>

                      {isAssigned && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-black shadow-2xs"
                            style={{
                              backgroundColor: meta.bgColor,
                              color: meta.textColor,
                            }}
                          >
                            {meta.name}
                          </span>
                          {onToggleCheckMember && (
                            <button
                              type="button"
                              onClick={() => onToggleCheckMember(board.id, member.id)}
                              title={member.checked ? 'Đã có mặt (Click để bỏ chọn)' : 'Chưa điểm danh (Click để xác nhận có mặt)'}
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                member.checked
                                  ? 'bg-[#88DCFA] text-slate-950 shadow-2xs'
                                  : 'border border-slate-300 dark:border-[#1F3347] hover:border-[#88DCFA] bg-white dark:bg-[#0B1219]'
                              }`}
                            >
                              {member.checked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Board Card Footer: Actions */}
              <div className="p-3 border-t border-sky-200/80 dark:border-[#1F3347] bg-slate-50/90 dark:bg-[#162230] rounded-b-2xl flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectBoard(board.id)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 ${
                    isActive
                      ? 'bg-[#88DCFA] hover:bg-[#68CEF6] text-slate-950 font-black shadow-[0_0_12px_rgba(136,220,250,0.3)]'
                      : 'bg-white hover:bg-slate-100 dark:bg-[#101A24] dark:hover:bg-[#1F3347] border border-slate-300 dark:border-[#1F3347] text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isActive ? 'Đang mở bảng này' : 'Chuyển đến bảng này'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDuplicateBoard(board.id)}
                    title="Nhân bản bảng Raid này"
                    className="p-1.5 text-slate-600 hover:text-slate-950 dark:text-[#8CA4B8] dark:hover:text-white bg-white hover:bg-slate-100 dark:bg-[#101A24] dark:hover:bg-[#1F3347] border border-slate-300 dark:border-[#1F3347] rounded-lg transition-colors shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {boards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteBoard(board.id)}
                      title="Xóa bảng này"
                      className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-[#8CA4B8] dark:hover:text-rose-400 bg-white hover:bg-slate-100 dark:bg-[#101A24] dark:hover:bg-[#1F3347] border border-slate-300 dark:border-[#1F3347] rounded-lg transition-colors shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
