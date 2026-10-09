import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  PersonnelMember,
  RaidBoard,
  GuildWarBoard,
  CustomClassColors,
  RaidClass,
} from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
import { normalizeName } from '../utils/duplicates';
import {
  X,
  Copy,
  Users,
  Swords,
  Table as TableIcon,
  Check,
  CheckSquare,
  Square,
  Search,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Filter,
} from 'lucide-react';

export type CopySourceTab = 'all' | 'raid_pool' | 'guild_war' | 'raid_boards';

interface CandidateMember {
  id: string;
  ingame: string;
  className: RaidClass;
  loggedBy: string;
  source: string;
  sourceType: 'raid_pool' | 'guild_war' | 'raid_board';
  note?: string;
  alreadyExistsInUpdate: boolean;
}

interface CopyPersonnelToUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUpdatePool: PersonnelMember[];
  raidPersonnelPool: PersonnelMember[];
  raidBoards: RaidBoard[];
  guildWarBoards: GuildWarBoard[];
  customColors?: CustomClassColors;
  onCopyMembers: (newMembers: PersonnelMember[], mode: 'merge' | 'overwrite') => void;
}

export const CopyPersonnelToUpdateModal: React.FC<CopyPersonnelToUpdateModalProps> = ({
  isOpen,
  onClose,
  currentUpdatePool,
  raidPersonnelPool,
  raidBoards,
  guildWarBoards,
  customColors,
  onCopyMembers,
}) => {
  const [activeSourceTab, setActiveSourceTab] = useState<CopySourceTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [copyMode, setCopyMode] = useState<'merge' | 'overwrite'>('merge');
  const [customLoggedByMap, setCustomLoggedByMap] = useState<Record<string, string>>({});

  // Helper to get effective loggedBy for candidate
  const getCandidateLoggedBy = (c: CandidateMember) => {
    if (customLoggedByMap[c.id] !== undefined) {
      return customLoggedByMap[c.id];
    }
    return c.loggedBy;
  };

  // Set of existing normalized names in current Raid Update pool
  const existingUpdateNames = useMemo(() => {
    const set = new Set<string>();
    currentUpdatePool.forEach((p) => {
      const norm = normalizeName(p.ingame);
      if (norm) set.add(norm);
    });
    return set;
  }, [currentUpdatePool]);

  // Aggregate candidate members from all sources with accurate loggedBy
  const allCandidates = useMemo(() => {
    const list: CandidateMember[] = [];
    const seenNames = new Set<string>();

    // Map existing known loggedBy from Raid pool & boards
    const knownRaidLoggedByMap = new Map<string, string>();
    raidPersonnelPool.forEach((p) => {
      const norm = normalizeName(p.ingame);
      const log = (p.loggedBy && p.loggedBy.trim()) || p.ingame.trim();
      if (norm && log) knownRaidLoggedByMap.set(norm, log);
    });
    raidBoards.forEach((b) => {
      b.members.forEach((m) => {
        const norm = normalizeName(m.ingame);
        const log = m.loggedBy && m.loggedBy.trim();
        if (norm && log && !knownRaidLoggedByMap.has(norm)) {
          knownRaidLoggedByMap.set(norm, log);
        }
      });
    });

    // 1. From Raid Personnel Pool
    raidPersonnelPool.forEach((p, idx) => {
      const norm = normalizeName(p.ingame);
      if (norm && !seenNames.has(norm)) {
        seenNames.add(norm);
        const effectiveLoggedBy = (p.loggedBy && p.loggedBy.trim()) ? p.loggedBy.trim() : p.ingame.trim();
        list.push({
          id: `cand_rp_${p.id || idx}`,
          ingame: p.ingame.trim(),
          className: p.className,
          loggedBy: effectiveLoggedBy,
          source: 'Kho Nhân Sự Raid',
          sourceType: 'raid_pool',
          note: p.note,
          alreadyExistsInUpdate: existingUpdateNames.has(norm),
        });
      }
    });

    // 2. From Raid Boards (members with names)
    raidBoards.forEach((b) => {
      b.members.forEach((m, mIdx) => {
        const norm = normalizeName(m.ingame);
        if (norm && !seenNames.has(norm)) {
          seenNames.add(norm);
          const effectiveLoggedBy = (m.loggedBy && m.loggedBy.trim())
            ? m.loggedBy.trim()
            : (knownRaidLoggedByMap.get(norm) || m.ingame.trim());
          list.push({
            id: `cand_rb_${b.id}_${m.id || mIdx}`,
            ingame: m.ingame.trim(),
            className: m.className,
            loggedBy: effectiveLoggedBy,
            source: `Bảng ${b.titlePrefix}`,
            sourceType: 'raid_board',
            alreadyExistsInUpdate: existingUpdateNames.has(norm),
          });
        }
      });
    });

    // 3. From Bang Chiến (Guild War Boards)
    guildWarBoards.forEach((gwb) => {
      gwb.members.forEach((m, mIdx) => {
        const norm = normalizeName(m.ingame);
        if (norm && !seenNames.has(norm)) {
          seenNames.add(norm);
          const effectiveLoggedBy = knownRaidLoggedByMap.get(norm) || (m.discord ? m.discord.trim() : m.ingame.trim());
          const teamLabel = m.team && m.team !== 'Chưa xếp' ? ` - ${m.team}` : '';
          list.push({
            id: `cand_gw_${gwb.id}_${m.id || mIdx}`,
            ingame: m.ingame.trim(),
            className: m.className,
            loggedBy: effectiveLoggedBy,
            source: `Bang Chiến${teamLabel}`,
            sourceType: 'guild_war',
            note: m.note || (m.discord ? `Discord: ${m.discord}` : undefined),
            alreadyExistsInUpdate: existingUpdateNames.has(norm),
          });
        }
      });
    });

    return list;
  }, [raidPersonnelPool, raidBoards, guildWarBoards, existingUpdateNames]);

  // Filter candidates by tab and search query
  const filteredCandidates = useMemo(() => {
    return allCandidates.filter((c) => {
      // Tab filter
      if (activeSourceTab === 'raid_pool' && c.sourceType !== 'raid_pool') return false;
      if (activeSourceTab === 'raid_boards' && c.sourceType !== 'raid_board') return false;
      if (activeSourceTab === 'guild_war' && c.sourceType !== 'guild_war') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = normalizeName(searchQuery);
        const nameMatch = normalizeName(c.ingame).includes(q);
        const classMatch = normalizeName(c.className).includes(q);
        const sourceMatch = normalizeName(c.source).includes(q);
        const logMatch = normalizeName(getCandidateLoggedBy(c)).includes(q);
        if (!nameMatch && !classMatch && !sourceMatch && !logMatch) return false;
      }

      return true;
    });
  }, [allCandidates, activeSourceTab, searchQuery, customLoggedByMap]);

  // Auto initialize selected IDs on modal open or tab change
  React.useEffect(() => {
    if (isOpen) {
      // Default: select all candidates that don't already exist if skipDuplicates is true
      const initial = new Set<string>();
      filteredCandidates.forEach((c) => {
        if (!skipDuplicates || !c.alreadyExistsInUpdate) {
          initial.add(c.id);
        }
      });
      setSelectedIds(initial);
    }
  }, [isOpen, activeSourceTab, skipDuplicates]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    const selectable = filteredCandidates.filter((c) => !skipDuplicates || !c.alreadyExistsInUpdate);
    const allSelected = selectable.every((c) => selectedIds.has(c.id));

    const next = new Set(selectedIds);
    if (allSelected) {
      selectable.forEach((c) => next.delete(c.id));
    } else {
      selectable.forEach((c) => next.add(c.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleExecuteCopy = () => {
    const chosen = allCandidates.filter((c) => selectedIds.has(c.id));
    if (chosen.length === 0) return;

    const timestamp = Date.now();
    const newPersonnelList: PersonnelMember[] = chosen.map((c, idx) => {
      const userEdited = customLoggedByMap[c.id];
      const finalLoggedBy = (userEdited !== undefined ? userEdited : c.loggedBy).trim() || c.ingame;
      return {
        id: `p_up_${timestamp}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        ingame: c.ingame,
        className: c.className,
        loggedBy: finalLoggedBy,
        note: c.note || '',
        createdAt: timestamp,
      };
    });

    onCopyMembers(newPersonnelList, copyMode);
    onClose();
  };

  // Counts for each source tab
  const raidPoolCount = allCandidates.filter((c) => c.sourceType === 'raid_pool').length;
  const raidBoardsCount = allCandidates.filter((c) => c.sourceType === 'raid_board').length;
  const guildWarCount = allCandidates.filter((c) => c.sourceType === 'guild_war').length;
  const selectedCount = selectedIds.size;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#0f172a] text-slate-100 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#162238] border-b border-slate-700/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0">
              <Copy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Sao Chép Nhân Sự Sang Raid Update</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Raid Update
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                Lấy danh sách thành viên từ Kho Raid hoặc Bang Chiến chuyển vào Kho Raid Update riêng biệt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Filter Tabs */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#121c2e] border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSourceTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSourceTab === 'all'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'bg-[#162230] text-slate-400 hover:text-white hover:bg-[#1f3045]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tất Cả Nguồn ({allCandidates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSourceTab('raid_pool')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSourceTab === 'raid_pool'
                ? 'bg-[#88DCFA] text-slate-950 shadow-xs font-black'
                : 'bg-[#162230] text-slate-400 hover:text-white hover:bg-[#1f3045]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Kho Nhân Sự Raid ({raidPoolCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSourceTab('guild_war')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSourceTab === 'guild_war'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs font-black'
                : 'bg-[#162230] text-slate-400 hover:text-white hover:bg-[#1f3045]'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span>Bang Chiến ({guildWarCount})</span>
          </button>

          {raidBoardsCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveSourceTab('raid_boards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeSourceTab === 'raid_boards'
                  ? 'bg-sky-700 text-white shadow-xs font-black'
                  : 'bg-[#162230] text-slate-400 hover:text-white hover:bg-[#1f3045]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Bảng Raid ({raidBoardsCount})</span>
            </button>
          )}
        </div>

        {/* Toolbar: Search & Select All */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#0d1524] border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên ingame, môn phái hoặc nguồn..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#090f1a] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Chọn tất cả ({filteredCandidates.length})</span>
            </button>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
              />
              <span>Bỏ qua người đã có</span>
            </label>
          </div>
        </div>

        {/* Candidates List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1 max-h-[46vh]">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs italic">
              Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredCandidates.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const classMeta = getEffectiveClassMeta(c.className, customColors);
                const isDupe = c.alreadyExistsInUpdate;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (!isDupe || !skipDuplicates) {
                        toggleSelectOne(c.id);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-xs'
                        : isDupe && skipDuplicates
                        ? 'bg-[#090f1a]/50 border-slate-800/80 opacity-50 cursor-not-allowed'
                        : 'bg-[#131d2e] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">
                            {c.ingame}
                          </span>
                          {isDupe && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 shrink-0">
                              Đã có
                            </span>
                          )}
                        </div>
                        {/* Logged by editable field & source badge */}
                        <div
                          className="flex items-center gap-1.5 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">
                            Log:
                          </span>
                          <input
                            type="text"
                            value={getCandidateLoggedBy(c)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomLoggedByMap((prev) => ({ ...prev, [c.id]: val }));
                            }}
                            placeholder={c.ingame}
                            title="Tên người log (Logged By) khi copy. Bạn có thể sửa trực tiếp tại đây."
                            className="text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-purple-200 font-semibold w-24 sm:w-28 transition-colors"
                          />
                          <span className="text-[10px] text-slate-400 truncate" title={`Nguồn: ${c.source}`}>
                            • {c.source}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2 shadow-2xs"
                      style={{
                        backgroundColor: classMeta.bgColor,
                        color: classMeta.textColor,
                      }}
                    >
                      {c.className}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Options & Actions */}
        <div className="px-4 sm:px-5 py-3 bg-[#121c2e] border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Mode Selector */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-400">Hình thức sao chép:</span>
            <label className="flex items-center gap-1 text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="copyMode"
                value="merge"
                checked={copyMode === 'merge'}
                onChange={() => setCopyMode('merge')}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span>Thêm vào kho (Giữ dữ liệu cũ)</span>
            </label>
            <label className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="copyMode"
                value="overwrite"
                checked={copyMode === 'overwrite'}
                onChange={() => setCopyMode('overwrite')}
                className="text-rose-600 focus:ring-rose-500"
              />
              <span>Ghi đè toàn bộ</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleExecuteCopy}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép {selectedCount} nhân sự</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
