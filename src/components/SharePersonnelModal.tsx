import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  PersonnelMember,
  PersonnelSubPool,
  CustomClassColors,
  RaidClass,
} from '../types';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { normalizeName } from '../utils/duplicates';
import {
  X,
  Share2,
  Users,
  Swords,
  Sparkles,
  Check,
  CheckSquare,
  Square,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Layers,
  RotateCcw,
  Plus,
} from 'lucide-react';

interface SharePersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterPool: PersonnelMember[];
  raidPool: PersonnelMember[];
  updatePool: PersonnelMember[];
  guildWarPool: PersonnelMember[];
  customColors?: CustomClassColors;
  initialTargetPool?: PersonnelSubPool;
  onShare: (
    targetPool: PersonnelSubPool,
    members: PersonnelMember[],
    mode: 'merge' | 'overwrite'
  ) => void;
}

export const SharePersonnelModal: React.FC<SharePersonnelModalProps> = ({
  isOpen,
  onClose,
  masterPool,
  raidPool,
  updatePool,
  guildWarPool,
  customColors,
  initialTargetPool = 'RAID',
  onShare,
}) => {
  const [targetPool, setTargetPool] = useState<PersonnelSubPool>(initialTargetPool);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareMode, setShareMode] = useState<'merge' | 'overwrite'>('merge');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<RaidClass | 'ALL'>('ALL');
  const [selectionTab, setSelectionTab] = useState<'all' | 'by_class' | 'custom'>('all');

  // Khi modal mở hoặc thay đổi initialTargetPool, reset state hợp lý
  useEffect(() => {
    if (isOpen) {
      setTargetPool(initialTargetPool);
      // Mặc định chọn tất cả
      setSelectedIds(new Set(masterPool.map((p) => p.id)));
      setSelectionTab('all');
      setSearchQuery('');
      setFilterClass('ALL');
    }
  }, [isOpen, initialTargetPool, masterPool]);

  // Danh sách tên đã có trong kho đích
  const targetExistingNames = useMemo(() => {
    const set = new Set<string>();
    const pool =
      targetPool === 'RAID'
        ? raidPool
        : targetPool === 'RAID_UPDATE'
        ? updatePool
        : guildWarPool;

    pool.forEach((p) => {
      const norm = normalizeName(p.ingame);
      if (norm) set.add(norm);
    });
    return set;
  }, [targetPool, raidPool, updatePool, guildWarPool]);

  // Lọc danh sách nhân sự từ Master Pool theo tìm kiếm và môn phái
  const filteredCandidates = useMemo(() => {
    return masterPool.filter((p) => {
      if (filterClass !== 'ALL' && p.className !== filterClass) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchIngame = p.ingame.toLowerCase().includes(query);
        const matchClass = p.className.toLowerCase().includes(query);
        const matchLogged = (p.loggedBy || '').toLowerCase().includes(query);
        const matchNote = (p.note || '').toLowerCase().includes(query);
        if (!matchIngame && !matchClass && !matchLogged && !matchNote) return false;
      }
      return true;
    });
  }, [masterPool, filterClass, searchQuery]);

  // Xử lý thay đổi tab chọn nhanh
  const handleSelectTabChange = (tab: 'all' | 'by_class' | 'custom') => {
    setSelectionTab(tab);
    if (tab === 'all') {
      setSelectedIds(new Set(masterPool.map((p) => p.id)));
      setFilterClass('ALL');
    } else if (tab === 'by_class') {
      // Khi chọn theo class, nếu có class filter thì chọn hết class đó
      if (filterClass !== 'ALL') {
        const ids = masterPool.filter((p) => p.className === filterClass).map((p) => p.id);
        setSelectedIds(new Set(ids));
      }
    }
  };

  const handleSelectClassFilter = (cls: RaidClass | 'ALL') => {
    setFilterClass(cls);
    if (cls === 'ALL') {
      setSelectedIds(new Set(masterPool.map((p) => p.id)));
    } else {
      const ids = masterPool.filter((p) => p.className === cls).map((p) => p.id);
      setSelectedIds(new Set(ids));
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map((p) => p.id)));
    }
  };

  const handleToggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmShare = () => {
    const selectedMembers = masterPool.filter((p) => selectedIds.has(p.id));
    if (selectedMembers.length === 0) return;
    onShare(targetPool, selectedMembers, shareMode);
    onClose();
  };

  if (!isOpen) return null;

  const targetName =
    targetPool === 'RAID'
      ? 'Kho Raid'
      : targetPool === 'RAID_UPDATE'
      ? 'Kho Raid Update'
      : 'Kho Bang Chiến';

  const targetCount =
    targetPool === 'RAID'
      ? raidPool.length
      : targetPool === 'RAID_UPDATE'
      ? updatePool.length
      : guildWarPool.length;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-sky-200/80 dark:border-[#1F3347] bg-gradient-to-r from-sky-50 via-indigo-50/50 to-purple-50/40 dark:from-[#162230] dark:to-[#1B2A3B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Chia Sẻ Nhân Sự Từ Tổng Kho</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-800">
                  {masterPool.length} nhân sự
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#8CA4B8] mt-0.5">
                Phân phối hoặc đồng bộ nhân sự từ Tổng kho sang các kho con riêng biệt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1D2D40] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Bước 1: Chọn Kho đích */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-[#8CA4B8] mb-2 flex items-center gap-1.5">
              <span>1. Chọn Kho Con Đích Đến</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Kho Raid */}
              <button
                type="button"
                onClick={() => setTargetPool('RAID')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  targetPool === 'RAID'
                    ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-2 ring-sky-400/50 shadow-xs'
                    : 'border-slate-200 dark:border-[#1F3347] bg-slate-50/70 dark:bg-[#162230] hover:bg-slate-100 dark:hover:bg-[#1D2D40] text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      targetPool === 'RAID'
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-200 dark:bg-[#1F3347] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black">Kho Raid</div>
                    <div className="text-[10px] text-slate-500 dark:text-[#8CA4B8]">
                      Hiện có: <strong>{raidPool.length}</strong>
                    </div>
                  </div>
                </div>
                {targetPool === 'RAID' && (
                  <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-3" />
                  </div>
                )}
              </button>

              {/* Kho Raid Update */}
              <button
                type="button"
                onClick={() => setTargetPool('RAID_UPDATE')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  targetPool === 'RAID_UPDATE'
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400/50 shadow-xs'
                    : 'border-slate-200 dark:border-[#1F3347] bg-slate-50/70 dark:bg-[#162230] hover:bg-slate-100 dark:hover:bg-[#1D2D40] text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      targetPool === 'RAID_UPDATE'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-[#1F3347] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black">Kho Raid Update</div>
                    <div className="text-[10px] text-slate-500 dark:text-[#8CA4B8]">
                      Hiện có: <strong>{updatePool.length}</strong>
                    </div>
                  </div>
                </div>
                {targetPool === 'RAID_UPDATE' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-3" />
                  </div>
                )}
              </button>

              {/* Kho Bang Chiến */}
              <button
                type="button"
                onClick={() => setTargetPool('GUILD_WAR')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  targetPool === 'GUILD_WAR'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/50 shadow-xs'
                    : 'border-slate-200 dark:border-[#1F3347] bg-slate-50/70 dark:bg-[#162230] hover:bg-slate-100 dark:hover:bg-[#1D2D40] text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      targetPool === 'GUILD_WAR'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-[#1F3347] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Swords className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black">Kho Bang Chiến</div>
                    <div className="text-[10px] text-slate-500 dark:text-[#8CA4B8]">
                      Hiện có: <strong>{guildWarPool.length}</strong>
                    </div>
                  </div>
                </div>
                {targetPool === 'GUILD_WAR' && (
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-3" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Bước 2: Chọn danh sách nhân sự */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-[#8CA4B8] flex items-center gap-1.5">
                <span>2. Chọn Nhân Sự Cần Chia Sẻ</span>
                <span className="text-[11px] font-black text-sky-600 dark:text-[#88DCFA] ml-1">
                  ({selectedIds.size} / {masterPool.length} đã chọn)
                </span>
              </label>

              {/* Tabs chọn nhanh */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#162230] p-0.5 rounded-lg border border-slate-200 dark:border-[#1F3347] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleSelectTabChange('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    selectionTab === 'all'
                      ? 'bg-white dark:bg-[#0B1219] text-sky-700 dark:text-[#88DCFA] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Tất cả ({masterPool.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTabChange('by_class')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    selectionTab === 'by_class'
                      ? 'bg-white dark:bg-[#0B1219] text-sky-700 dark:text-[#88DCFA] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Theo Môn Phái
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTabChange('custom')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    selectionTab === 'custom'
                      ? 'bg-white dark:bg-[#0B1219] text-sky-700 dark:text-[#88DCFA] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Tùy Chọn
                </button>
              </div>
            </div>

            {/* Bộ lọc Môn phái nếu tab by_class hoặc custom */}
            {selectionTab !== 'all' && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectClassFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
                    filterClass === 'ALL'
                      ? 'bg-sky-500 text-white border-transparent'
                      : 'bg-slate-50 dark:bg-[#162230] border-slate-200 dark:border-[#1F3347] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Tất cả phái
                </button>
                {CLASS_LIST.map((cls) => {
                  const meta = getEffectiveClassMeta(cls, customColors);
                  const isSelected = filterClass === cls;
                  const count = masterPool.filter((p) => p.className === cls).length;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => handleSelectClassFilter(cls)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'border-transparent text-white shadow-xs'
                          : 'border-slate-200 dark:border-[#1F3347] bg-slate-50 dark:bg-[#162230] text-slate-700 dark:text-slate-300'
                      }`}
                      style={isSelected ? { backgroundColor: meta.bgColor, color: meta.textColor } : {}}
                    >
                      <span>{cls}</span>
                      <span className="text-[9px] opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Thanh tìm kiếm & Nút Chọn tất cả */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm Ingame, Môn phái, Logged by, Note..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-[#1F3347] rounded-xl bg-slate-50 dark:bg-[#0B1219] focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#162230] dark:hover:bg-[#1D2D40] border border-slate-200 dark:border-[#1F3347] rounded-xl transition-all shrink-0 cursor-pointer"
              >
                {selectedIds.size === filteredCandidates.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-sky-600 dark:text-[#88DCFA]" />
                    <span>Bỏ chọn</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Chọn tất cả ({filteredCandidates.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Danh sách thẻ nhân sự cuộn */}
            <div className="border border-slate-200 dark:border-[#1F3347] rounded-xl p-2 max-h-[220px] overflow-y-auto space-y-1.5 bg-slate-50/50 dark:bg-[#0B1219]/60">
              {filteredCandidates.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 dark:text-[#8CA4B8]">
                  Không tìm thấy nhân sự phù hợp
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                  {filteredCandidates.map((p) => {
                    const isChecked = selectedIds.has(p.id);
                    const meta = getEffectiveClassMeta(p.className, customColors);
                    const alreadyInTarget = targetExistingNames.has(normalizeName(p.ingame));

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleCandidate(p.id)}
                        className={`p-2 rounded-xl border text-xs cursor-pointer select-none transition-all flex items-center justify-between gap-1.5 ${
                          isChecked
                            ? 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800'
                            : 'bg-white dark:bg-[#162230] border-slate-200 dark:border-[#1F3347] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-sky-600 dark:text-[#88DCFA] shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold truncate text-[11px] text-slate-900 dark:text-white">
                              {p.ingame}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[9px]">
                              <span
                                className="px-1 py-0.2 rounded font-black shrink-0"
                                style={{ backgroundColor: meta.bgColor, color: meta.textColor }}
                              >
                                {meta.shortName}
                              </span>
                              <span className="text-slate-500 dark:text-[#8CA4B8] truncate">
                                {p.loggedBy || p.ingame}
                              </span>
                            </div>
                          </div>
                        </div>

                        {alreadyInTarget && (
                          <span
                            title="Nhân sự này đã có mặt trong kho đích"
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 shrink-0"
                          >
                            Đã có
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bước 3: Chế độ nạp */}
          <div className="pt-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-[#8CA4B8] mb-2 flex items-center gap-1.5">
              <span>3. Chế Độ Chia Sẻ Sang {targetName}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  shareMode === 'merge'
                    ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-1 ring-sky-400/50'
                    : 'border-slate-200 dark:border-[#1F3347] bg-white dark:bg-[#162230] text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="shareMode"
                  checked={shareMode === 'merge'}
                  onChange={() => setShareMode('merge')}
                  className="mt-0.5 text-sky-600 focus:ring-sky-500"
                />
                <div className="text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <Plus className="w-3.5 h-3.5 text-sky-500" />
                    <span>Thêm mới / Gộp thêm (Khuyến nghị)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#8CA4B8] block mt-0.5">
                    Chỉ thêm những người chưa có trong {targetName}, không xóa các thành viên hiện tại của kho con.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  shareMode === 'overwrite'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-white ring-1 ring-amber-400/50'
                    : 'border-slate-200 dark:border-[#1F3347] bg-white dark:bg-[#162230] text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="shareMode"
                  checked={shareMode === 'overwrite'}
                  onChange={() => setShareMode('overwrite')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ghi đè / Thay thế toàn bộ</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#8CA4B8] block mt-0.5">
                    Xóa sạch dữ liệu cũ trong {targetName} và thay thế bằng danh sách nhân sự vừa chọn.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-sky-200/80 dark:border-[#1F3347] bg-slate-50/80 dark:bg-[#162230] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-[#8CA4B8]">
            Sẽ nạp <strong>{selectedIds.size}</strong> nhân sự vào <strong>{targetName}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmShare}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer active:scale-95 ${
                selectedIds.size > 0
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-sky-500/20'
                  : 'bg-slate-300 dark:bg-[#1F3347] text-slate-500 cursor-not-allowed'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Xác Nhận Chia Sẻ ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
