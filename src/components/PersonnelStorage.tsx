import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, PersonnelMember, RaidClass, RaidMember } from '../types';
import { normalizeName } from '../utils/duplicates';
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  Trash2,
  Edit2,
  Copy,
  GripVertical,
  Filter,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Plus,
  Sparkles,
  Shield,
  Heart,
  Swords,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PersonnelStorageProps {
  personnelPool: PersonnelMember[];
  onUpdatePersonnelPool: (updated: PersonnelMember[]) => void;
  activeRaidMembers: RaidMember[];
  onAssignToRaid: (personnel: PersonnelMember, targetStt?: number) => void;
  onRemoveFromRaid: (ingame: string) => void;
  onSyncFromActiveRaid: () => void;
  customColors?: CustomClassColors;
  isCompact?: boolean; // For sidebar display
}

export const PersonnelStorage: React.FC<PersonnelStorageProps> = ({
  personnelPool,
  onUpdatePersonnelPool,
  activeRaidMembers,
  onAssignToRaid,
  onRemoveFromRaid,
  onSyncFromActiveRaid,
  customColors,
  isCompact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');

  // Form states
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New member form
  const [newIngame, setNewIngame] = useState('');
  const [newClass, setNewClass] = useState<RaidClass>('Toái Mộng');
  const [newLoggedBy, setNewLoggedBy] = useState('');

  // Edit form
  const [editIngame, setEditIngame] = useState('');
  const [editClass, setEditClass] = useState<RaidClass>('Toái Mộng');
  const [editLoggedBy, setEditLoggedBy] = useState('');

  // Dragging state
  const [draggedPersonnelId, setDraggedPersonnelId] = useState<string | null>(null);

  // In-app dialog states (avoids window.confirm which is blocked in sandboxed iframes)
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Map of active raid members by normalized ingame name for lightning-fast lookup
  const assignedMap = useMemo(() => {
    const map = new Map<string, RaidMember>();
    activeRaidMembers.forEach((m) => {
      const key = normalizeName(m.ingame);
      if (key) {
        map.set(key, m);
      }
    });
    return map;
  }, [activeRaidMembers]);

  // Filtered list
  const filteredPersonnel = useMemo(() => {
    return personnelPool.filter((person) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchIngame = person.ingame.toLowerCase().includes(query);
        const matchLogged = person.loggedBy.toLowerCase().includes(query);
        const matchClass = person.className.toLowerCase().includes(query);
        if (!matchIngame && !matchLogged && !matchClass) return false;
      }

      // Class filter
      if (selectedClassFilter !== 'ALL' && person.className !== selectedClassFilter) {
        return false;
      }

      // Assignment status filter
      const isAssigned = assignedMap.has(normalizeName(person.ingame));
      if (statusFilter === 'UNASSIGNED' && isAssigned) return false;
      if (statusFilter === 'ASSIGNED' && !isAssigned) return false;

      return true;
    });
  }, [personnelPool, searchQuery, selectedClassFilter, statusFilter, assignedMap]);

  // Counts
  const totalCount = personnelPool.length;
  const assignedCount = personnelPool.filter((p) =>
    assignedMap.has(normalizeName(p.ingame))
  ).length;
  const unassignedCount = totalCount - assignedCount;

  // Handlers
  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIngame = newIngame.trim();
    if (!cleanIngame) return;

    const newMember: PersonnelMember = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ingame: cleanIngame,
      className: newClass,
      loggedBy: newLoggedBy.trim() || cleanIngame,
      createdAt: Date.now(),
    };

    onUpdatePersonnelPool([newMember, ...personnelPool]);
    setNewIngame('');
    setNewLoggedBy('');
    setIsAddingNew(false);
  };

  const handleStartEdit = (person: PersonnelMember) => {
    setEditingId(person.id);
    setEditIngame(person.ingame);
    setEditClass(person.className);
    setEditLoggedBy(person.loggedBy);
  };

  const handleSaveEdit = (id: string) => {
    const cleanIngame = editIngame.trim();
    if (!cleanIngame) return;

    const updated = personnelPool.map((p) =>
      p.id === id
        ? {
            ...p,
            ingame: cleanIngame,
            className: editClass,
            loggedBy: editLoggedBy.trim() || cleanIngame,
          }
        : p
    );
    onUpdatePersonnelPool(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onUpdatePersonnelPool(personnelPool.filter((p) => p.id !== id));
  };

  const handleToggleCheck = (id: string) => {
    const updated = personnelPool.map((p) =>
      p.id === id ? { ...p, checked: !p.checked } : p
    );
    onUpdatePersonnelPool(updated);
  };

  // HTML5 Drag Start
  const handleDragStart = (e: React.DragEvent, person: PersonnelMember) => {
    setDraggedPersonnelId(person.id);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'personnel',
        member: {
          ingame: person.ingame,
          className: person.className,
          loggedBy: person.loggedBy,
        },
      })
    );
    e.dataTransfer.setData('text/plain', person.ingame);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragEnd = () => {
    setDraggedPersonnelId(null);
  };

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
      {/* Header bar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                <span className="text-black">Kho Nhân Sự</span>
                <span className="text-[11px] font-bold text-black">
                  ({assignedCount}/{totalCount} đã xếp)
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onSyncFromActiveRaid}
              title="Thêm các thành viên trong bảng Raid hiện tại vào Kho Nhân Sự (nếu chưa có)"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-indigo-500" />
              <span className="hidden sm:inline">Lấy từ Raid</span>
            </button>

            <button
              type="button"
              id="btn-add-personnel-open"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingNew ? 'Đóng' : '+ Thêm'}</span>
            </button>
          </div>
        </div>

        {/* Add New Personnel Form */}
        {isAddingNew && (
          <form
            onSubmit={handleAddNew}
            className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800/60 shadow-xs animate-in fade-in space-y-2.5"
          >
            <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Lưu thông tin nhân sự mới</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tên Ingame *
                </label>
                <input
                  type="text"
                  required
                  value={newIngame}
                  onChange={(e) => {
                    setNewIngame(e.target.value);
                    if (!newLoggedBy) {
                      setNewLoggedBy(e.target.value);
                    }
                  }}
                  placeholder="Ví dụ: Hiệp Sĩ 01"
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Class (Môn phái) *
                </label>
                <select
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value as RaidClass)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {CLASS_LIST.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    Logged by
                  </label>
                  {newIngame && (
                    <button
                      type="button"
                      onClick={() => setNewLoggedBy(newIngame)}
                      className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      = Ingame
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={newLoggedBy}
                  onChange={(e) => setNewLoggedBy(e.target.value)}
                  placeholder="Người log acc..."
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu nhân sự</span>
              </button>
            </div>
          </form>
        )}

        {/* Search & Filter Controls */}
        <div className="mt-2.5 space-y-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Ingame, Logged by hoặc Class..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl text-black placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
            <div className="flex items-center gap-1 bg-slate-200/90 dark:bg-slate-800 p-0.5 rounded-lg w-full">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-black shadow-2xs font-black'
                    : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-bold'
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNASSIGNED')}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  statusFilter === 'UNASSIGNED'
                    ? 'bg-white text-emerald-800 shadow-2xs font-black'
                    : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-bold'
                }`}
              >
                Chưa xếp ({unassignedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ASSIGNED')}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  statusFilter === 'ASSIGNED'
                    ? 'bg-white text-black shadow-2xs font-black'
                    : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-bold'
                }`}
              >
                Đã xếp ({assignedCount})
              </button>
            </div>
          </div>

          {/* Class Filter Badges (Horizontal scroll) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
            <button
              type="button"
              onClick={() => setSelectedClassFilter('ALL')}
              className={`px-2 py-0.5 rounded-md font-bold shrink-0 transition-colors ${
                selectedClassFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Tất cả phái
            </button>
            {CLASS_LIST.map((cls) => {
              const meta = getEffectiveClassMeta(cls, customColors);
              const isSelected = selectedClassFilter === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() =>
                    setSelectedClassFilter(isSelected ? 'ALL' : cls)
                  }
                  className={`px-1.5 py-0.5 rounded-md font-bold shrink-0 flex items-center gap-1 transition-all ${
                    isSelected ? 'ring-2 ring-indigo-500 shadow-2xs scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: meta.bgColor,
                    color: meta.textColor,
                  }}
                >
                  <span>{cls}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Guide note */}
      <div className="px-3 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
        <span className="flex items-center gap-1 font-medium">
          <GripVertical className="w-3.5 h-3.5 text-indigo-500" />
          <span>Kéo thả thẻ nhân sự vào hàng bảng Raid hoặc bấm <strong>+ Xếp</strong></span>
        </span>
      </div>

      {/* Personnel List */}
      <div className="p-2 sm:p-3 overflow-y-auto flex-1 space-y-1.5 max-h-[560px]">
        {filteredPersonnel.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-semibold">Không tìm thấy nhân sự phù hợp</p>
            <p className="text-[11px] mt-0.5">
              {searchQuery || selectedClassFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Thử xóa bớt bộ lọc để hiển thị nhiều hơn'
                : 'Bấm "+ Thêm" hoặc "Lấy từ Raid" để nạp danh sách nhân sự'}
            </p>
          </div>
        ) : (
          filteredPersonnel.map((person) => {
            const classMeta = getEffectiveClassMeta(person.className, customColors);
            const isAssigned = assignedMap.has(normalizeName(person.ingame));
            const assignedInfo = assignedMap.get(normalizeName(person.ingame));
            const isEditing = editingId === person.id;
            const isDragging = draggedPersonnelId === person.id;

            // Strikethrough condition:
            // Either assigned to the active raid board OR manually checked
            const isCrossedOut = isAssigned || person.checked;

            if (isEditing) {
              return (
                <div
                  key={person.id}
                  className="p-2.5 bg-amber-50 dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700/60 shadow-xs space-y-2 text-xs"
                >
                  <div className="font-bold text-amber-900 dark:text-amber-300 text-[11px]">
                    Chỉnh sửa thông tin
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      value={editIngame}
                      onChange={(e) => setEditIngame(e.target.value)}
                      placeholder="Ingame..."
                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white text-black text-xs font-bold"
                    />
                    <select
                      value={editClass}
                      onChange={(e) => setEditClass(e.target.value as RaidClass)}
                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white text-black text-xs font-bold"
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
                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white text-black text-xs font-bold"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
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
                draggable={!isAssigned}
                onDragStart={(e) => handleDragStart(e, person)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
                  isDragging
                    ? 'opacity-40 border-indigo-500 bg-indigo-50'
                    : isAssigned
                    ? 'bg-slate-100 border-slate-300 text-black'
                    : 'bg-white border-slate-300 hover:border-indigo-400 shadow-2xs hover:shadow-xs cursor-grab active:cursor-grabbing text-black'
                }`}
              >
                {/* Left side: Grip handle, Checkbox, Name, LoggedBy */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Drag Grip Handle */}
                  <span
                    className={`cursor-grab shrink-0 ${
                      isAssigned
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-600 group-hover:text-black'
                    }`}
                    title={
                      isAssigned
                        ? 'Nhân sự này đã có trong bảng Raid'
                        : 'Kéo thẻ này thả vào hàng bất kỳ trong Bảng Raid'
                    }
                  >
                    <GripVertical className="w-4 h-4" />
                  </span>

                  {/* Presence Checkbox (Điểm danh / Có mặt) */}
                  <button
                    type="button"
                    onClick={() => handleToggleCheck(person.id)}
                    title={
                      person.checked
                        ? 'Đã đánh dấu có mặt (Click để bỏ gạch tên)'
                        : 'Đánh dấu có mặt / Điểm danh (Click để gạch tên)'
                    }
                    className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                      person.checked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-400 hover:border-slate-600 bg-white'
                    }`}
                  >
                    {person.checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  {/* Name and Logged by */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-black truncate ${
                          isCrossedOut
                            ? 'line-through decoration-2 decoration-red-600 text-black/70'
                            : 'text-black'
                        }`}
                        title={person.ingame}
                      >
                        {person.ingame}
                      </span>

                      {/* Status Tag: Đã xếp or Đã có mặt */}
                      {isAssigned && assignedInfo && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-black border border-slate-300 shrink-0">
                          <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
                          <span className="text-black font-bold">STT #{assignedInfo.stt}</span>
                          {assignedInfo.party && (
                            <span className="text-slate-800 font-bold">
                              • P{assignedInfo.party}
                            </span>
                          )}
                        </span>
                      )}

                      {!isAssigned && person.checked && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shrink-0">
                          ✓ Có mặt
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-black truncate flex items-center gap-1">
                      <span className="text-slate-800 font-medium">Log:</span>
                      <span className="font-bold text-black">
                        {person.loggedBy || person.ingame}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Class Pill & Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Class Badge */}
                  <span
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: classMeta.bgColor,
                      color: classMeta.textColor,
                    }}
                  >
                    {person.className}
                  </span>

                  {/* Assign / Remove Button */}
                  {isAssigned ? (
                    <button
                      type="button"
                      onClick={() => onRemoveFromRaid(person.ingame)}
                      title="Bỏ nhân sự này khỏi bảng Raid hiện tại"
                      className="px-2 py-1 text-[10px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900/60 transition-colors"
                    >
                      Bỏ xếp
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAssignToRaid(person)}
                      title="Xếp vào ô trống kế tiếp hoặc thêm slot mới trong Raid"
                      className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-2xs transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Xếp</span>
                    </button>
                  )}

                  {/* Edit & Delete trigger buttons */}
                  <div className="flex items-center gap-0.5 pl-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(person)}
                      title="Chỉnh sửa thông tin"
                      className="p-1 text-slate-500 hover:text-black dark:hover:text-white rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(person.id)}
                      title="Xoá khỏi kho nhân sự"
                      className="p-1 text-slate-500 hover:text-red-600 rounded transition-colors"
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

      {/* Storage Footer */}
      <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] text-black dark:text-white flex items-center justify-between">
        <span className="text-black dark:text-white font-medium">
          Đã gạch tên: <strong className="text-black dark:text-white font-black">{assignedCount}</strong> nhân sự
        </span>
        {personnelPool.length > 0 && (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[10px]"
          >
            Xoá toàn bộ kho
          </button>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                Xoá toàn bộ nhân sự trong kho?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Thao tác này sẽ xoá tất cả danh sách nhân sự lưu trữ trong kho để bạn bắt đầu lại từ đầu.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdatePersonnelPool([]);
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors"
                >
                  Đồng ý xoá
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
