import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  PersonnelMember,
  GuildMember,
  CustomClassColors,
  RaidClass,
} from '../../types';
import { CLASS_LIST, getEffectiveClassMeta } from '../../constants/classes';
import { normalizeName } from '../../utils/duplicates';
import {
  X,
  Search,
  Users,
  Check,
  CheckSquare,
  Square,
  Filter,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ImportFromMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterPersonnelPool: PersonnelMember[];
  guildWarPersonnelPool?: PersonnelMember[];
  currentBoardMembers: GuildMember[];
  customColors?: CustomClassColors;
  onImportSelected: (selectedMembers: PersonnelMember[]) => void;
}

export const ImportFromMasterModal: React.FC<ImportFromMasterModalProps> = ({
  isOpen,
  onClose,
  masterPersonnelPool,
  guildWarPersonnelPool = [],
  currentBoardMembers,
  customColors,
  onImportSelected,
}) => {
  const [activeSource, setActiveSource] = useState<'master' | 'guild_war'>('master');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<RaidClass | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Nguồn nhân sự hiện tại được chọn (Tổng kho hoặc Kho Bang Chiến)
  const currentPool = useMemo(() => {
    if (activeSource === 'guild_war') {
      return guildWarPersonnelPool;
    }
    return masterPersonnelPool;
  }, [activeSource, guildWarPersonnelPool, masterPersonnelPool]);

  // Tập hợp các tên đã có trong bảng Bang Chiến hiện tại (chuẩn hóa theo normalizeName)
  const existingNamesSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of currentBoardMembers) {
      if (m && m.ingame) {
        const norm = normalizeName(m.ingame);
        if (norm) set.add(norm);
      }
    }
    return set;
  }, [currentBoardMembers]);

  // Reset form khi modal mở
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFilterClass('ALL');
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  // Danh sách nhân sự sau khi lọc
  const filteredPersonnel = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return currentPool.filter((p) => {
      if (!p || !p.ingame) return false;
      if (filterClass !== 'ALL' && p.className !== filterClass) return false;
      if (q) {
        const matchIngame = p.ingame.toLowerCase().includes(q);
        const matchLogged = (p.loggedBy || '').toLowerCase().includes(q);
        const matchNote = (p.note || '').toLowerCase().includes(q);
        const matchClass = (p.className || '').toLowerCase().includes(q);
        if (!matchIngame && !matchLogged && !matchNote && !matchClass) return false;
      }
      return true;
    });
  }, [currentPool, filterClass, searchQuery]);

  // Thống kê
  const stats = useMemo(() => {
    let inBoardCount = 0;
    let availableCount = 0;
    currentPool.forEach((p) => {
      const norm = normalizeName(p.ingame);
      if (norm && existingNamesSet.has(norm)) {
        inBoardCount++;
      } else {
        availableCount++;
      }
    });
    return {
      total: currentPool.length,
      inBoard: inBoardCount,
      available: availableCount,
    };
  }, [currentPool, existingNamesSet]);

  if (!isOpen) return null;

  // Toggle chọn một nhân sự
  const handleToggleSelect = (person: PersonnelMember) => {
    const norm = normalizeName(person.ingame);
    if (norm && existingNamesSet.has(norm)) return; // Không thể chọn người đã có trong bảng

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(person.id)) {
        next.delete(person.id);
      } else {
        next.add(person.id);
      }
      return next;
    });
  };

  // Chọn tất cả người chưa có trong bảng (theo danh sách đang hiển thị)
  const handleSelectAllVisibleAvailable = () => {
    const next = new Set(selectedIds);
    filteredPersonnel.forEach((p) => {
      const norm = normalizeName(p.ingame);
      if (norm && !existingNamesSet.has(norm)) {
        next.add(p.id);
      }
    });
    setSelectedIds(next);
  };

  // Bỏ chọn tất cả
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Xác nhận nhập
  const handleConfirmImport = () => {
    if (selectedIds.size === 0) return;
    const allPool = [
      ...masterPersonnelPool,
      ...guildWarPersonnelPool,
    ];
    const seen = new Set<string>();
    const selectedMembers: PersonnelMember[] = [];
    allPool.forEach((p) => {
      if (selectedIds.has(p.id) && !seen.has(p.id)) {
        seen.add(p.id);
        selectedMembers.push(p);
      }
    });
    onImportSelected(selectedMembers);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0E1722] border border-sky-300 dark:border-[#1F3347] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/15 via-sky-500/15 to-purple-500/15 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                {activeSource === 'master' ? 'Nhập Từ Tổng Kho Nhân Sự' : 'Nhập Từ Kho Bang Chiến'}
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 rounded-full">
                  Bang Chiến
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeSource === 'master'
                  ? 'Chọn từng nhân sự trong Tổng kho để đưa vào bảng Bang Chiến'
                  : 'Chọn từng nhân sự trong Kho Bang Chiến để đưa vào bảng Bang Chiến'}{' '}
                (không ghi đè thành viên hiện có)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nguồn kho chuyển đổi: Tổng kho vs Kho BC */}
        <div className="px-6 py-2.5 bg-slate-100/90 dark:bg-[#101A24] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#162230] border border-slate-200 dark:border-[#22364D] rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveSource('master');
                setSelectedIds(new Set());
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSource === 'master'
                  ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tổng kho nhân sự ({masterPersonnelPool.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSource('guild_war');
                setSelectedIds(new Set());
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSource === 'guild_war'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kho Bang Chiến ({guildWarPersonnelPool.length})</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Đang chọn nguồn: <strong className="text-slate-800 dark:text-slate-200">{activeSource === 'master' ? 'Tổng kho' : 'Kho BC'}</strong>
          </span>
        </div>

        {/* Thống kê nhanh & Bộ lọc */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#131E2B] space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Quick Stats Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-[#182637] border border-slate-200 dark:border-[#22364D] text-slate-700 dark:text-slate-300 shadow-2xs">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                {activeSource === 'master' ? 'Tổng kho' : 'Kho BC'}: <strong className="text-slate-950 dark:text-white">{stats.total}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-2xs">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Đã có trong bảng: <strong className="text-emerald-950 dark:text-emerald-200">{stats.inBoard}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-[#88DCFA] shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                Có thể nhập thêm: <strong className="text-sky-950 dark:text-sky-200">{stats.available}</strong>
              </span>
            </div>

            {/* Quick Select Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisibleAvailable}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Chọn tất cả chưa có ({filteredPersonnel.filter(p => !existingNamesSet.has(normalizeName(p.ingame))).length})</span>
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Bỏ chọn</span>
                </button>
              )}
            </div>
          </div>

          {/* Search bar & Class filter */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên ingame, người log, môn phái hoặc ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-[#162230] border border-slate-300 dark:border-[#22364D] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="sm:col-span-4 relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value as RaidClass | 'ALL')}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-[#162230] border border-slate-300 dark:border-[#22364D] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs font-bold cursor-pointer"
              >
                <option value="ALL">Tất cả môn phái ({currentPool.length})</option>
                {CLASS_LIST.map((cls) => {
                  const count = currentPool.filter((p) => p.className === cls).length;
                  return (
                    <option key={cls} value={cls}>
                      {cls} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Danh sách nhân sự */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {filteredPersonnel.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <Users className="w-10 h-10 mx-auto stroke-1 opacity-50" />
              <p className="text-sm font-bold">Không tìm thấy nhân sự phù hợp</p>
              <p className="text-xs">Thử thay đổi từ khóa tìm kiếm hoặc môn phái lọc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
              {filteredPersonnel.map((person, idx) => {
                const norm = normalizeName(person.ingame);
                const isAlreadyInBoard = Boolean(norm && existingNamesSet.has(norm));
                const isSelected = selectedIds.has(person.id);
                const classMeta = getEffectiveClassMeta(person.className, customColors);

                return (
                  <div
                    key={person.id || idx}
                    onClick={() => {
                      if (!isAlreadyInBoard) handleToggleSelect(person);
                    }}
                    className={`relative p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isAlreadyInBoard
                        ? 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600/70 ring-1 ring-indigo-400/50 shadow-xs cursor-pointer'
                        : 'bg-white dark:bg-[#14202E] border-slate-200/90 dark:border-[#1F3347] hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50/80 dark:hover:bg-[#182637] shadow-2xs cursor-pointer'
                    }`}
                  >
                    {/* Checkbox & Member info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="shrink-0 flex items-center justify-center">
                        {isAlreadyInBoard ? (
                          <div className="w-4 h-4 rounded bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : isSelected ? (
                          <div className="w-4 h-4 rounded bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                        )}
                      </div>

                      {/* Ingame & Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-black truncate text-slate-900 dark:text-white"
                            title={person.ingame}
                          >
                            {person.ingame}
                          </span>

                          {/* Class Pill */}
                          <span
                            style={{
                              backgroundColor: classMeta.bgColor,
                              color: classMeta.textColor,
                              borderColor: classMeta.borderColor,
                            }}
                            className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold rounded border shrink-0"
                          >
                            {person.className}
                          </span>
                        </div>

                        {/* Extra metadata: Logged by / Note */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {person.loggedBy && person.loggedBy !== person.ingame && (
                            <span className="truncate" title={`Log: ${person.loggedBy}`}>
                              Log: <strong className="font-semibold text-slate-700 dark:text-slate-300">{person.loggedBy}</strong>
                            </span>
                          )}
                          {person.note && (
                            <span className="truncate italic text-[10px] text-amber-600 dark:text-amber-400" title={person.note}>
                              • {person.note}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isAlreadyInBoard ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                          Đã có trong bảng
                        </span>
                      ) : isSelected ? (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-indigo-500 text-white shadow-xs">
                          Đã chọn
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          Chưa có
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {selectedIds.size > 0 ? (
              <span>
                Đang chọn: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{selectedIds.size}</strong> nhân sự
              </span>
            ) : (
              <span>Chưa chọn nhân sự nào để nhập.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedIds.size === 0}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 font-black text-xs rounded-xl shadow-md transition-all ${
                selectedIds.size > 0
                  ? 'bg-gradient-to-r from-indigo-500 to-sky-400 hover:from-indigo-600 hover:to-sky-500 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Xác nhận nhập ({selectedIds.size} nhân sự)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
