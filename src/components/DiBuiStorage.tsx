import React, { useState, useMemo } from 'react';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, PersonnelMember, RaidClass } from '../types';
import { normalizeName } from '../utils/duplicates';
import {
  Tent,
  UserPlus,
  Search,
  Check,
  X,
  Trash2,
  Edit2,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface DiBuiStorageProps {
  diBuiPool: PersonnelMember[];
  onUpdateDiBuiPool: (updated: PersonnelMember[]) => void;
  onRestoreToActivePool: (person: PersonnelMember) => void;
  customColors?: CustomClassColors;
  isCompact?: boolean;
  activePoolName?: string;
}

export const DiBuiStorage: React.FC<DiBuiStorageProps> = ({
  diBuiPool,
  onUpdateDiBuiPool,
  onRestoreToActivePool,
  customColors,
  isCompact = false,
  activePoolName = 'Kho Nhân Sự',
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('di_bui_is_collapsed_v1');
      if (saved !== null) return saved === 'true';
    } catch {}
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('di_bui_is_collapsed_v1', String(next));
      } catch {}
      return next;
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | 'ALL'>('ALL');

  // Form states
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New member form
  const [newIngame, setNewIngame] = useState('');
  const [newClass, setNewClass] = useState<RaidClass>('Toái Mộng');
  const [newLoggedBy, setNewLoggedBy] = useState('');
  const [newNote, setNewNote] = useState('');

  // Edit form
  const [editIngame, setEditIngame] = useState('');
  const [editClass, setEditClass] = useState<RaidClass>('Toái Mộng');
  const [editLoggedBy, setEditLoggedBy] = useState('');
  const [editNote, setEditNote] = useState('');

  // Confirmation dialogs
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Count personnel per class in Kho Đi Bụi
  const classCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    CLASS_LIST.forEach((cls) => {
      counts[cls] = 0;
    });
    diBuiPool.forEach((p) => {
      if (counts[p.className] !== undefined) {
        counts[p.className]++;
      } else {
        counts[p.className] = 1;
      }
    });
    return counts;
  }, [diBuiPool]);

  // Filtered list
  const filteredList = useMemo(() => {
    return diBuiPool.filter((person) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchIngame = (person.ingame || '').toLowerCase().includes(query);
        const matchLogged = (person.loggedBy || '').toLowerCase().includes(query);
        const matchClass = (person.className || '').toLowerCase().includes(query);
        const matchNote = (person.note || '').toLowerCase().includes(query);
        if (!matchIngame && !matchLogged && !matchClass && !matchNote) return false;
      }

      if (selectedClassFilter !== 'ALL' && person.className !== selectedClassFilter) {
        return false;
      }

      return true;
    });
  }, [diBuiPool, searchQuery, selectedClassFilter]);

  // Handlers
  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIngame = newIngame.trim();
    if (!cleanIngame) return;

    const newMember: PersonnelMember = {
      id: 'dibui_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ingame: cleanIngame,
      className: newClass,
      loggedBy: newLoggedBy.trim() || cleanIngame,
      note: newNote.trim() || 'Tạm nghỉ đi bụi',
      createdAt: Date.now(),
    };

    onUpdateDiBuiPool([newMember, ...diBuiPool]);
    setNewIngame('');
    setNewLoggedBy('');
    setNewNote('');
    setIsAddingNew(false);
  };

  const handleStartEdit = (person: PersonnelMember) => {
    setEditingId(person.id);
    setEditIngame(person.ingame);
    setEditClass(person.className);
    setEditLoggedBy(person.loggedBy);
    setEditNote(person.note || '');
  };

  const handleSaveEdit = (id: string) => {
    const cleanIngame = editIngame.trim();
    if (!cleanIngame) return;

    const updated = diBuiPool.map((p) =>
      p.id === id
        ? {
            ...p,
            ingame: cleanIngame,
            className: editClass,
            loggedBy: editLoggedBy.trim() || cleanIngame,
            note: editNote.trim(),
          }
        : p
    );
    onUpdateDiBuiPool(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onUpdateDiBuiPool(diBuiPool.filter((p) => p.id !== id));
  };

  const handleClearAll = () => {
    onUpdateDiBuiPool([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="bg-white dark:bg-[#0E1722] rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 shadow-md flex flex-col overflow-hidden transition-all duration-200">
      {/* Header Bar */}
      <div className="p-3 sm:p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2">
        <div
          onClick={toggleCollapse}
          className="flex items-center gap-2 cursor-pointer select-none group min-w-0 flex-1"
          title={isCollapsed ? 'Mở rộng Kho Đi Bụi' : 'Thu gọn Kho Đi Bụi'}
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shadow-2xs">
            <Tent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                <span>Kho Đi Bụi</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                {diBuiPool.length} người
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                (Tạm off / Chờ quay lại game)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Kho độc lập chứa nhân sự nghỉ game tạm thời. Khi trở lại chỉ cần bấm nút để nạp về Kho.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (isCollapsed) setIsCollapsed(false);
              setIsAddingNew(!isAddingNew);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black text-amber-950 dark:text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Thêm nhân sự mới vào Kho Đi Bụi"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAddingNew ? 'Đóng form' : '+ Thêm'}</span>
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="animate-in fade-in duration-200">
          {/* Add Member Form */}
          {isAddingNew && (
            <form
              onSubmit={handleAddNew}
              className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/60 space-y-2.5 animate-in fade-in"
            >
              <div className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Thêm nhân sự tạm nghỉ vào Kho Đi Bụi</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên Ingame *
                  </label>
                  <input
                    type="text"
                    required
                    value={newIngame}
                    onChange={(e) => {
                      setNewIngame(e.target.value);
                      if (!newLoggedBy) setNewLoggedBy(e.target.value);
                    }}
                    placeholder="Tên nhân sự..."
                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Môn phái *
                  </label>
                  <select
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value as RaidClass)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    {CLASS_LIST.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Logged by
                  </label>
                  <input
                    type="text"
                    value={newLoggedBy}
                    onChange={(e) => setNewLoggedBy(e.target.value)}
                    placeholder="Chủ acc / Log..."
                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ghi chú / Hẹn ngày lại
                  </label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="VD: 2 tuần nữa quay lại..."
                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-lg shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu vào Kho Đi Bụi</span>
                </button>
              </div>
            </form>
          )}

          {/* Search Bar & Class Filter */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/60 dark:bg-slate-900/40">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhân sự đi bụi theo tên, môn phái, ghi chú..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-bold bg-white dark:bg-[#0B1219] border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Class Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setSelectedClassFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 transition-all shadow-2xs cursor-pointer ${
                  selectedClassFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-black scale-102'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                Tất cả ({diBuiPool.length})
              </button>

              {CLASS_LIST.map((cls) => {
                const count = classCountMap[cls] || 0;
                const isSelected = selectedClassFilter === cls;
                const meta = getEffectiveClassMeta(cls, customColors);

                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClassFilter(isSelected ? 'ALL' : cls)}
                    style={{
                      backgroundColor: meta.bgColor,
                      color: meta.textColor,
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-amber-500 scale-105 shadow-md font-black'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    <span>{cls}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-black/35 text-white/95">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List of Personnel in Kho Đi Bụi */}
          <div className="p-2 sm:p-3 overflow-y-auto space-y-1.5 max-h-[360px]">
            {filteredList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                <Tent className="w-7 h-7 mx-auto text-amber-500/50 mb-1.5" />
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  {diBuiPool.length === 0
                    ? 'Chưa có nhân sự nào trong Kho Đi Bụi'
                    : 'Không tìm thấy nhân sự phù hợp với bộ lọc'}
                </p>
                <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {diBuiPool.length === 0
                    ? 'Khi có thành viên tạm nghỉ hoặc chờ ngày quay lại game, hãy bấm nút "+ Thêm" hoặc chuyển từ Kho Nhân Sự sang đây để lưu trữ.'
                    : 'Hãy thử xóa bớt điều kiện tìm kiếm hoặc chọn "Tất cả".'}
                </p>
              </div>
            ) : (
              filteredList.map((person) => {
                const classMeta = getEffectiveClassMeta(person.className, customColors);
                const isEditing = editingId === person.id;

                if (isEditing) {
                  return (
                    <div
                      key={person.id}
                      className="p-2.5 bg-amber-50 dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700/60 shadow-xs space-y-2 text-xs"
                    >
                      <div className="font-bold text-amber-900 dark:text-amber-300 text-[11px]">
                        Chỉnh sửa thông tin đi bụi
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5">
                        <input
                          type="text"
                          value={editIngame}
                          onChange={(e) => setEditIngame(e.target.value)}
                          placeholder="Ingame..."
                          className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                        />
                        <select
                          value={editClass}
                          onChange={(e) => setEditClass(e.target.value as RaidClass)}
                          className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                        >
                          {CLASS_LIST.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editLoggedBy}
                          onChange={(e) => setEditLoggedBy(e.target.value)}
                          placeholder="Logged by..."
                          className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Ghi chú hẹn ngày..."
                          className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          onClick={() => handleSaveEdit(person.id)}
                          className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Lưu</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={person.id}
                    className="group flex items-center justify-between gap-2 p-2.5 rounded-xl border border-amber-200/80 dark:border-slate-800 bg-amber-50/30 dark:bg-[#121B26] hover:border-amber-400 dark:hover:border-amber-600/70 shadow-2xs hover:shadow-xs transition-all"
                  >
                    {/* Left: Info */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Đang đi bụi" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {person.ingame}
                          </span>
                          {person.note && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 truncate max-w-[200px]">
                              <span>📝</span>
                              <span className="truncate">{person.note}</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] truncate flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>
                            Log:{' '}
                            <strong className="text-slate-700 dark:text-slate-300 font-bold">
                              {person.loggedBy || person.ingame}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Class & Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Class Badge */}
                      <span
                        className="px-2 py-0.5 rounded-lg text-[11px] font-black shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: classMeta.bgColor,
                          color: classMeta.textColor,
                        }}
                      >
                        {person.className}
                      </span>

                      {/* Button: Quay Lại Game (Chuyển về Kho Nhân Sự) */}
                      <button
                        type="button"
                        onClick={() => onRestoreToActivePool(person)}
                        title={`Chuyển "${person.ingame}" quay lại ${activePoolName}`}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-black transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                        <span>Quay lại game</span>
                      </button>

                      {/* Edit & Delete */}
                      <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(person)}
                          title="Chỉnh sửa"
                          className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(person.id)}
                          title="Xóa khỏi Kho Đi Bụi"
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 px-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1219] text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="text-[11px] font-bold flex items-center gap-1.5">
              <span>Đang lưu trữ:</span>
              <strong className="text-amber-600 dark:text-amber-400 font-black">
                {diBuiPool.length} nhân sự
              </strong>
            </span>

            {diBuiPool.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-rose-500 hover:text-rose-700 dark:text-rose-400 text-[11px] font-bold hover:underline"
              >
                Làm trống kho đi bụi
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Pool */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 max-w-sm w-full space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Xác nhận làm trống Kho Đi Bụi?</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Thao tác này sẽ xóa toàn bộ {diBuiPool.length} nhân sự trong Kho Đi Bụi. Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
