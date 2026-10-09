import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, PersonnelMember, RaidBoard, RaidClass, RaidMember } from '../types';
import { normalizeName } from '../utils/duplicates';
import { PixelSquad } from './PixelSquad';
import { PixelNoteBubble } from './PixelNoteBubble';
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
  Tent,
  MessageSquare,
} from 'lucide-react';

export interface PersonnelAssignment {
  boardId: string;
  boardTitle: string;
  stt: number;
  party?: number;
  isActiveBoard: boolean;
}

interface PersonnelStorageProps {
  personnelPool: PersonnelMember[];
  onUpdatePersonnelPool: (updated: PersonnelMember[]) => void;
  activeRaidMembers: RaidMember[];
  allBoards?: RaidBoard[];
  activeBoardId?: string;
  activeBoardTitle?: string;
  onAssignToRaid: (personnel: PersonnelMember, targetStt?: number) => void;
  onRemoveFromRaid: (ingame: string) => void;
  onSyncFromActiveRaid: () => void;
  customColors?: CustomClassColors;
  onOpenColorCustomizer?: () => void;
  isCompact?: boolean; // For sidebar display
  isRaidUpdate?: boolean;
  onOpenCopyModal?: () => void;
  onMoveToDiBui?: (person: PersonnelMember) => void;
}

export const PersonnelStorage: React.FC<PersonnelStorageProps> = ({
  personnelPool,
  onUpdatePersonnelPool,
  activeRaidMembers,
  allBoards,
  activeBoardId,
  activeBoardTitle,
  onAssignToRaid,
  onRemoveFromRaid,
  onSyncFromActiveRaid,
  customColors,
  onOpenColorCustomizer,
  isCompact = false,
  isRaidUpdate = false,
  onOpenCopyModal,
  onMoveToDiBui,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'UNASSIGNED_IN_ACTIVE'
  >('ALL');

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

  // Pixel Note Bubble click-to-toggle state
  const [activeNotePerson, setActiveNotePerson] = useState<PersonnelMember | null>(null);
  const [noteAnchorRect, setNoteAnchorRect] = useState<DOMRect | null>(null);

  const handleToggleNoteForPerson = (person: PersonnelMember, rect: DOMRect) => {
    if (activeNotePerson && activeNotePerson.id === person.id) {
      setActiveNotePerson(null);
      setNoteAnchorRect(null);
    } else {
      setActiveNotePerson(person);
      setNoteAnchorRect(rect);
    }
  };

  const handleSavePersonNote = (personId: string, noteText: string) => {
    const trimmed = noteText.trim();
    const updated = personnelPool.map((p) =>
      p.id === personId ? { ...p, note: trimmed ? trimmed : undefined } : p
    );
    onUpdatePersonnelPool(updated);
    if (activeNotePerson && activeNotePerson.id === personId) {
      setActiveNotePerson((prev) => (prev ? { ...prev, note: trimmed ? trimmed : undefined } : null));
    }
  };

  // Count personnel per class in pool (hiển thị số lượng trên từng badge giống Ảnh 2)
  const classCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    CLASS_LIST.forEach((cls) => {
      counts[cls] = 0;
    });
    personnelPool.forEach((p) => {
      if (counts[p.className] !== undefined) {
        counts[p.className]++;
      } else {
        counts[p.className] = 1;
      }
    });
    return counts;
  }, [personnelPool]);



  // Comprehensive assignment tracking across all boards
  // This guarantees that when a new board is created, all personnel already assigned in previous boards maintain their "Đã xếp" status!
  const assignmentsByIngame = useMemo(() => {
    const map = new Map<string, PersonnelAssignment[]>();

    const boardsToScan: Array<{ id: string; titlePrefix: string; members: RaidMember[] }> =
      allBoards && allBoards.length > 0
        ? allBoards
        : [
            {
              id: activeBoardId || 'active',
              titlePrefix: activeBoardTitle || 'Raid',
              members: activeRaidMembers,
            },
          ];

    boardsToScan.forEach((board) => {
      const isCurrentActive = board.id === activeBoardId;
      (board.members || []).forEach((m) => {
        const key = normalizeName(m.ingame);
        if (key) {
          const list = map.get(key) || [];
          list.push({
            boardId: board.id,
            boardTitle: board.titlePrefix,
            stt: m.stt,
            party: m.party,
            isActiveBoard: isCurrentActive,
          });
          map.set(key, list);
        }
      });
    });

    return map;
  }, [allBoards, activeBoardId, activeBoardTitle, activeRaidMembers]);

  // Filtered list
  const filteredPersonnel = useMemo(() => {
    return personnelPool.filter((person) => {
      const norm = normalizeName(person.ingame);
      const assignments = assignmentsByIngame.get(norm) || [];
      const isAssigned = assignments.length > 0;
      const isAssignedInActive = assignments.some((a) => a.isActiveBoard);

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchIngame = person.ingame.toLowerCase().includes(query);
        const matchLogged = (person.loggedBy || '').toLowerCase().includes(query);
        const matchClass = person.className.toLowerCase().includes(query);
        const matchNote = (person.note || '').toLowerCase().includes(query);
        if (!matchIngame && !matchLogged && !matchClass && !matchNote) return false;
      }

      // Class filter
      if (selectedClassFilter !== 'ALL' && person.className !== selectedClassFilter) {
        return false;
      }

      // Assignment status filter
      if (statusFilter === 'UNASSIGNED' && isAssigned) return false;
      if (statusFilter === 'ASSIGNED' && !isAssigned) return false;
      if (statusFilter === 'UNASSIGNED_IN_ACTIVE' && isAssignedInActive) return false;

      return true;
    });
  }, [personnelPool, searchQuery, selectedClassFilter, statusFilter, assignmentsByIngame]);

  // Counts - Preserved accurately across all boards
  const totalCount = personnelPool.length;
  const assignedCount = personnelPool.filter((p) =>
    assignmentsByIngame.has(normalizeName(p.ingame))
  ).length;
  const unassignedCount = totalCount - assignedCount;
  const unassignedInActiveCount = personnelPool.filter((p) => {
    const list = assignmentsByIngame.get(normalizeName(p.ingame));
    return !list || !list.some((a) => a.isActiveBoard);
  }).length;

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
    <div className="w-full flex flex-col h-full bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl shadow-sm overflow-hidden transition-colors">
      {/* Header bar - Tactical Operations Console */}
      <div className="p-3 sm:p-3.5 border-b border-sky-200/80 dark:border-[#1F3347] bg-slate-50/90 dark:bg-[#162230]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-[#88DCFA]/15 border border-sky-300 dark:border-[#88DCFA]/40 text-sky-700 dark:text-[#88DCFA] flex items-center justify-center font-bold text-xs shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm flex items-center gap-2">
                <span className="text-slate-900 dark:text-white tracking-tight">Kho Nhân Sự</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-[#88DCFA]/15 text-sky-800 dark:text-[#88DCFA] border border-sky-300 dark:border-[#88DCFA]/30 shadow-2xs">
                  {assignedCount}/{totalCount} đã xếp
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isRaidUpdate && onOpenCopyModal && (
              <button
                type="button"
                onClick={onOpenCopyModal}
                title="Sao chép nhân sự từ Kho Raid và Bang Chiến vào Kho Raid Update này"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-300 dark:border-purple-800/80 rounded-lg shadow-2xs transition-all active:scale-95"
              >
                <Copy className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span className="hidden sm:inline">Sao chép từ Raid/BC</span>
                <span className="sm:hidden">Sao chép</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSyncFromActiveRaid}
              title="Thêm các thành viên trong bảng Raid hiện tại vào Kho Nhân Sự (nếu chưa có)"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-[#101A24] hover:bg-slate-100 dark:hover:bg-[#1D2D40] border border-slate-300 dark:border-[#1F3347] rounded-lg shadow-2xs transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3 text-sky-600 dark:text-[#88DCFA]" />
              <span className="hidden sm:inline">Lấy từ Raid</span>
            </button>

            <button
              type="button"
              id="btn-add-personnel-open"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-slate-950 bg-[#88DCFA] hover:bg-[#68CEF6] rounded-lg shadow-[0_0_12px_rgba(136,220,250,0.3)] transition-all active:scale-95 font-black"
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
            className="mt-3 p-3 bg-slate-100 dark:bg-[#101A24] rounded-xl border border-sky-200/80 dark:border-[#1F3347] shadow-sm animate-in fade-in space-y-2.5"
          >
            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-[#88DCFA]" />
              <span>Lưu thông tin nhân sự mới</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-[#8CA4B8] mb-1">
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
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#1F3347] bg-white dark:bg-[#0B1219] text-slate-900 dark:text-white focus:outline-none focus:border-[#88DCFA]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-[#8CA4B8] mb-1">
                  Class (Môn phái) *
                </label>
                <select
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value as RaidClass)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-[#1F3347] bg-white dark:bg-[#0B1219] text-slate-900 dark:text-white focus:outline-none focus:border-[#88DCFA]"
                >
                  {CLASS_LIST.map((cls) => (
                    <option key={cls} value={cls} className="bg-white dark:bg-[#101A24] text-slate-900 dark:text-white">
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-[#8CA4B8]">
                    Logged by
                  </label>
                  {newIngame && (
                    <button
                      type="button"
                      onClick={() => setNewLoggedBy(newIngame)}
                      className="text-[9px] font-bold text-sky-700 dark:text-[#88DCFA] hover:underline"
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
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#1F3347] bg-white dark:bg-[#0B1219] text-slate-900 dark:text-white focus:outline-none focus:border-[#88DCFA]"
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
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-slate-950 bg-[#88DCFA] hover:bg-[#68CEF6] rounded-lg shadow-[0_0_12px_rgba(136,220,250,0.3)]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu nhân sự</span>
              </button>
            </div>
          </form>
        )}

        {/* Search & Filter Controls with Pixel Squad (4 characters running in a train) */}
        <div className="mt-9 space-y-2">
          {/* Search bar */}
          <div className="relative">
            <PixelSquad isSearching={Boolean(searchQuery.trim())} />
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Ingame, Logged by hoặc Class..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-bold bg-white dark:bg-[#0B1219] border border-sky-300/80 dark:border-[#1F3347] focus:border-[#88DCFA] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#88DCFA] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B1219] p-0.5 rounded-xl w-full border border-sky-200/80 dark:border-[#1F3347]">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1 rounded-lg transition-all text-center ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-[#162230] text-slate-900 dark:text-white shadow-xs font-black border border-slate-200 dark:border-[#1F3347]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNASSIGNED')}
                title="Các nhân sự chưa được xếp vào bất kỳ bảng Raid nào"
                className={`flex-1 py-1 rounded-lg transition-all text-center ${
                  statusFilter === 'UNASSIGNED'
                    ? 'bg-white dark:bg-[#162230] text-sky-700 dark:text-[#88DCFA] shadow-xs font-black border border-slate-200 dark:border-[#1F3347]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                }`}
              >
                Chưa xếp ({unassignedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ASSIGNED')}
                title="Tất cả nhân sự đã được xếp vào các bảng Raid (giữ nguyên khi thêm bảng mới)"
                className={`flex-1 py-1 rounded-lg transition-all text-center ${
                  statusFilter === 'ASSIGNED'
                    ? 'bg-white dark:bg-[#162230] text-slate-900 dark:text-slate-200 shadow-xs font-black border border-slate-200 dark:border-[#1F3347]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                }`}
              >
                Đã xếp ({assignedCount})
              </button>
              {allBoards && allBoards.length > 1 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('UNASSIGNED_IN_ACTIVE')}
                  title={`Nhân sự chưa có trong bảng ${activeBoardTitle || 'hiện tại'}`}
                  className={`flex-1 py-1 rounded-lg transition-all text-center text-[10px] ${
                    statusFilter === 'UNASSIGNED_IN_ACTIVE'
                      ? 'bg-slate-950 text-white dark:bg-[#88DCFA] dark:text-slate-950 shadow-xs font-black'
                      : 'text-sky-800 dark:text-[#88DCFA] hover:text-slate-950 dark:hover:text-white font-bold'
                  }`}
                >
                  Chưa vào bảng này ({unassignedInActiveCount})
                </button>
              )}
            </div>
          </div>

          {/* Class Filter Badges (Đầy đủ 12 môn phái kèm số lượng như Ảnh 2, đặt ở vị trí cũ) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {CLASS_LIST.map((cls) => {
              const meta = getEffectiveClassMeta(cls, customColors);
              const count = classCountMap[cls] || 0;
              const isSelected = selectedClassFilter === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClassFilter(isSelected ? 'ALL' : cls)}
                  title={`Môn phái: ${cls} (${count} nhân sự) - Bấm để ${isSelected ? 'bỏ lọc' : 'lọc'}`}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-white scale-105 shadow-md'
                      : 'opacity-90 hover:opacity-100 hover:scale-102'
                  }`}
                  style={{
                    backgroundColor: meta.bgColor,
                    color: meta.textColor,
                  }}
                >
                  <span className="truncate max-w-[56px] sm:max-w-none">{cls}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-black/35 text-white/95">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Guide note */}
      <div className="px-3.5 py-1.5 bg-sky-50 dark:bg-[#0B1219]/80 border-b border-sky-200/80 dark:border-[#1F3347] text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between font-medium">
        <span className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-sky-600 dark:text-[#88DCFA]" />
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
            const norm = normalizeName(person.ingame);
            const assignments = assignmentsByIngame.get(norm) || [];
            const isAssigned = assignments.length > 0;
            const isAssignedInActiveBoard = assignments.some((a) => a.isActiveBoard);
            const activeAssignment = assignments.find((a) => a.isActiveBoard);
            const otherAssignments = assignments.filter((a) => !a.isActiveBoard);

            const isEditing = editingId === person.id;
            const isDragging = draggedPersonnelId === person.id;

            // Strikethrough condition:
            // Either assigned to any raid board OR manually checked
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
                data-person-card="true"
                draggable={!isAssignedInActiveBoard}
                onDragStart={(e) => handleDragStart(e, person)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                  isDragging
                    ? 'opacity-40 border-[#88DCFA] bg-[#88DCFA]/15'
                    : isAssigned
                    ? 'bg-slate-100/90 dark:bg-[#121B24] border-slate-200 dark:border-[#1A2A38] opacity-80'
                    : 'bg-white dark:bg-[#162230] border-slate-200 dark:border-[#1F3347] hover:border-sky-400 dark:hover:border-[#2C4863] shadow-2xs hover:shadow-xs cursor-grab active:cursor-grabbing'
                }`}
              >
                {/* Left side: Grip handle, Checkbox, Name, LoggedBy */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Drag Grip Handle */}
                  <span
                    className={`shrink-0 ${
                      isAssignedInActiveBoard
                        ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        : 'cursor-grab text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-[#88DCFA]'
                    }`}
                    title={
                      isAssignedInActiveBoard
                        ? `Nhân sự này đã có trong ${activeBoardTitle || 'bảng hiện tại'}`
                        : isAssigned
                        ? `Đã xếp ở ${otherAssignments.map((a) => a.boardTitle).join(', ')} - Có thể kéo thả vào bảng hiện tại`
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
                        ? 'bg-[#88DCFA] border-[#88DCFA] text-slate-950 shadow-xs'
                        : 'border-slate-300 dark:border-[#1F3347] hover:border-[#88DCFA] bg-slate-50 dark:bg-[#0B1219]'
                    }`}
                  >
                    {person.checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  {/* Name and Logged by */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs sm:text-sm font-black truncate ${
                          isCrossedOut
                            ? 'line-through decoration-2 decoration-rose-500 text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                        title={person.ingame}
                      >
                        {person.ingame || 'Chưa đặt tên'}
                      </span>

                      {/* Status Tag: Assigned status across all boards */}
                      {isAssigned && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-black bg-sky-100 dark:bg-[#152B3B] text-sky-900 dark:text-[#88DCFA] border border-sky-300 dark:border-[#1E435E] shrink-0 shadow-2xs"
                          title={`Đã xếp ở: ${assignments.map((a) => `${a.boardTitle} (STT #${a.stt}${a.party ? ` - P${a.party}` : ''})`).join(', ')}`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>
                            {assignments.map((a) => a.boardTitle).join(', ')}
                          </span>
                        </span>
                      )}

                      {!isAssigned && person.checked && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black bg-sky-100 dark:bg-sky-950/70 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800/70 shrink-0 shadow-2xs"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Có mặt</span>
                        </span>
                      )}

                      {/* Note Badge nếu đã có ghi chú */}
                      {person.note?.trim() && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const card = e.currentTarget.closest('[data-person-card]') as HTMLElement;
                            handleToggleNoteForPerson(
                              person,
                              card ? card.getBoundingClientRect() : e.currentTarget.getBoundingClientRect()
                            );
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-black bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/80 shadow-2xs shrink-0 max-w-[130px] transition-all hover:scale-105 cursor-pointer"
                          title={`Ghi chú: ${person.note} (Click để mở xem & sửa)`}
                        >
                          <span className="text-[11px]">📝</span>
                          <span className="truncate">{person.note}</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] truncate flex items-center gap-1 text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-semibold text-slate-500 dark:text-[#8CA4B8]">
                        Log:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {person.loggedBy || person.ingame}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Class Pill & Actions */}
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

                  {/* Assign / Remove Button */}
                  {isAssignedInActiveBoard ? (
                    <button
                      type="button"
                      onClick={() => onRemoveFromRaid(person.ingame)}
                      title={`Bỏ nhân sự này khỏi ${activeBoardTitle || 'bảng hiện tại'}`}
                      className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 transition-all hover:scale-105 active:scale-95 shadow-2xs"
                    >
                      Bỏ xếp
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAssignToRaid(person)}
                      title={
                        isAssigned
                          ? `Đã có ở ${otherAssignments.map((a) => a.boardTitle).join(', ')} - Click để xếp vào bảng này`
                          : 'Xếp vào ô trống kế tiếp hoặc thêm slot mới trong Raid'
                      }
                      className="flex items-center gap-0.5 px-2.5 py-1 text-[11px] font-black rounded-lg bg-[#88DCFA] hover:bg-[#68CEF6] active:bg-[#48bbf0] text-slate-950 shadow-[0_0_10px_rgba(136,220,250,0.3)] transition-all hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>{isAssigned ? 'Xếp tiếp' : 'Xếp'}</span>
                    </button>
                  )}

                  {/* Edit & Delete trigger buttons */}
                  <div className="flex items-center gap-0.5 pl-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {onMoveToDiBui && (
                      <button
                        type="button"
                        onClick={() => onMoveToDiBui(person)}
                        title="Chuyển sang Kho Đi Bụi (Tạm nghỉ / chờ quay lại game)"
                        className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded transition-colors"
                      >
                        <Tent className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Note button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const card = e.currentTarget.closest('[data-person-card]') as HTMLElement;
                        handleToggleNoteForPerson(
                          person,
                          card ? card.getBoundingClientRect() : e.currentTarget.getBoundingClientRect()
                        );
                      }}
                      title={person.note ? 'Xem & sửa ghi chú (Click để ẩn/hiện)' : 'Thêm ghi chú (Click để ẩn/hiện)'}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        activeNotePerson?.id === person.id
                          ? 'text-amber-500 bg-amber-100 dark:bg-amber-950/70 ring-1 ring-amber-400'
                          : person.note
                          ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(person)}
                      title="Chỉnh sửa thông tin"
                      className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(person.id)}
                      title="Xoá khỏi kho nhân sự"
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
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
      <div className="p-3 px-4 border-t border-sky-200/80 dark:border-[#1F3347] bg-slate-50 dark:bg-[#101A24] text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
        <span className="font-bold flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-[#8CA4B8]">Đã xếp / gạch tên:</span>
          <strong className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-[#1B2A3B] text-sky-800 dark:text-[#88DCFA] font-black text-[11px]">
            {assignedCount}
          </strong>
        </span>
        {personnelPool.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline font-bold text-[11px] transition-colors"
          >
            Xoá toàn bộ kho
          </button>
        ) : null}
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

      {/* Floating Pixel Note Bubble Modal / Tooltip (Click để ẩn/hiện) */}
      {activeNotePerson && noteAnchorRect && (
        <PixelNoteBubble
          person={activeNotePerson}
          anchorRect={noteAnchorRect}
          onSaveNote={handleSavePersonNote}
          onClose={() => {
            setActiveNotePerson(null);
            setNoteAnchorRect(null);
          }}
          customColors={customColors}
        />
      )}
    </div>
  );
};
