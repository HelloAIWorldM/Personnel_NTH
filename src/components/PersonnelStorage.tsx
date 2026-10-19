import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, PersonnelMember, RaidBoard, RaidClass, RaidMember, PersonnelSubPool } from '../types';
import { normalizeName, deduplicatePersonnelList, findDuplicatePersonnel, compareVietnameseAlphabet, sortPersonnelAlphabetically } from '../utils/duplicates';
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
  Plus,
  Sparkles,
  Shield,
  Heart,
  Swords,
  Tent,
  MessageSquare,
  Share2,
  Layers,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowUpDown,
} from 'lucide-react';

export interface PersonnelAssignment {
  boardId: string;
  boardTitle: string;
  stt: number;
  party?: number;
  isActiveBoard: boolean;
  poolType?: 'raid' | 'raid_update' | 'guild_war';
}

interface PersonnelStorageProps {
  personnelPool: PersonnelMember[];
  onUpdatePersonnelPool: (updated: PersonnelMember[]) => void;
  activeRaidMembers: RaidMember[];
  allBoards?: Array<
    RaidBoard | {
      id: string;
      titlePrefix: string;
      createdAt?: number;
      members: RaidMember[];
      poolType?: 'raid' | 'raid_update' | 'guild_war';
    }
  >;
  activeBoardId?: string;
  activeBoardTitle?: string;
  onAssignToRaid: (personnel: PersonnelMember, targetStt?: number) => void;
  onRemoveFromRaid: (ingame: string) => void;
  onSyncFromActiveRaid?: () => void;
  customColors?: CustomClassColors;
  onOpenColorCustomizer?: () => void;
  isCompact?: boolean; // For sidebar display
  isRaidUpdate?: boolean;
  onOpenCopyModal?: () => void;
  onMoveToDiBui?: (person: PersonnelMember) => void;

  // Master & Sub-pool architecture
  poolType?: 'master' | 'raid' | 'raid_update' | 'guild_war';
  poolTitle?: string;
  poolCounts?: {
    master: number;
    raid: number;
    update: number;
    guildWar: number;
  };
  onSwitchPoolType?: (poolType: 'master' | 'raid' | 'raid_update' | 'guild_war') => void;
  onOpenShareModal?: (targetPool?: PersonnelSubPool) => void;
  onQuickShareMember?: (member: PersonnelMember, target: PersonnelSubPool) => void;
  onPushToMaster?: () => void;
  onClearSubPool?: () => void;
  onSyncFromGuildWar?: () => void;
  subPoolMembershipMap?: {
    inRaid: Set<string>;
    inUpdate: Set<string>;
    inGuildWar: Set<string>;
  };
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
  poolType = 'raid',
  poolTitle,
  poolCounts,
  onSwitchPoolType,
  onOpenShareModal,
  onQuickShareMember,
  onPushToMaster,
  onClearSubPool,
  onSyncFromGuildWar,
  subPoolMembershipMap,
}) => {
  const isMasterPool = poolType === 'master';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'UNASSIGNED_IN_ACTIVE'
  >('ALL');

  // Thứ tự sắp xếp nhân sự trong kho: 'alpha-asc' (mặc định A-Z) | 'alpha-desc' (Z-A) | 'class' (Môn phái) | 'default' (Thứ tự gốc)
  const [sortOrder, setSortOrder] = useState<'alpha-asc' | 'alpha-desc' | 'class' | 'default'>('alpha-asc');

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
  const [personToDelete, setPersonToDelete] = useState<PersonnelMember | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

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

    const boardsToScan: Array<{
      id: string;
      titlePrefix: string;
      members: RaidMember[];
      poolType?: 'raid' | 'raid_update' | 'guild_war';
    }> =
      allBoards && allBoards.length > 0
        ? (allBoards as any)
        : [
            {
              id: activeBoardId || 'active',
              titlePrefix: activeBoardTitle || 'Bảng',
              members: activeRaidMembers,
              poolType: (poolType === 'master' ? 'raid' : poolType),
            },
          ];

    boardsToScan.forEach((board) => {
      const isCurrentActive = board.id === activeBoardId;
      let bPoolType: 'raid' | 'raid_update' | 'guild_war' = board.poolType || 'raid';
      if (!board.poolType) {
        const titleLower = (board.titlePrefix || '').toLowerCase();
        if (titleLower.startsWith('bc') || titleLower.includes('bang chiến')) {
          bPoolType = 'guild_war';
        } else if (titleLower.includes('up')) {
          bPoolType = 'raid_update';
        }
      }

      (board.members || []).forEach((m) => {
        const key = normalizeName(m.ingame);
        if (key) {
          // Đối với Bang Chiến: chỉ tính là "Đã xếp" nếu đã vào team (Mid/Cơ động/Đẩy trụ) hoặc có party
          // Nếu team === 'Chưa xếp' hoặc không có team -> tính là "Chưa xếp"!
          const isGwMember = bPoolType === 'guild_war' || typeof (m as any).team === 'string';
          const isAssigned = isGwMember
            ? Boolean(
                (m as any).party !== undefined ||
                ((m as any).team &&
                  (m as any).team !== 'Chưa xếp' &&
                  (m as any).team !== 'Top' &&
                  (m as any).team !== 'Bot')
              )
            : Boolean(m.ingame && m.ingame.trim() !== '');

          if (isAssigned) {
            const list = map.get(key) || [];
            list.push({
              boardId: board.id,
              boardTitle: board.titlePrefix,
              stt: m.stt,
              party: m.party,
              isActiveBoard: isCurrentActive,
              poolType: bPoolType,
            });
            map.set(key, list);
          }
        }
      });
    });

    return map;
  }, [allBoards, activeBoardId, activeBoardTitle, activeRaidMembers, poolType]);

  // Precompute assignment status across pools for all personnel members in O(N) single pass
  const assignmentStatsMap = useMemo(() => {
    const map = new Map<string, {
      assignments: PersonnelAssignment[];
      hasRaid: boolean;
      hasUpdate: boolean;
      hasGw: boolean;
      isAssignedInAll3: boolean;
      isAssignedAny: boolean;
      isConsideredAssigned: boolean;
      assignedPoolCount: number;
    }>();

    personnelPool.forEach((person) => {
      const norm = normalizeName(person.ingame);
      if (!norm) return;
      const assignments = assignmentsByIngame.get(norm) || [];
      const hasRaid = assignments.some((a) => a.poolType === 'raid');
      const hasUpdate = assignments.some((a) => a.poolType === 'raid_update');
      const hasGw = assignments.some((a) => a.poolType === 'guild_war');
      const isAssignedInAll3 = hasRaid && hasUpdate && hasGw;
      const isAssignedAny = assignments.length > 0;
      const isConsideredAssigned = isMasterPool ? isAssignedInAll3 : isAssignedAny;
      const assignedPoolCount = (hasRaid ? 1 : 0) + (hasUpdate ? 1 : 0) + (hasGw ? 1 : 0);

      map.set(norm, {
        assignments,
        hasRaid,
        hasUpdate,
        hasGw,
        isAssignedInAll3,
        isAssignedAny,
        isConsideredAssigned,
        assignedPoolCount,
      });
    });

    return map;
  }, [personnelPool, assignmentsByIngame, isMasterPool]);

  const defaultStats = useMemo(() => ({
    assignments: [] as PersonnelAssignment[],
    hasRaid: false,
    hasUpdate: false,
    hasGw: false,
    isAssignedInAll3: false,
    isAssignedAny: false,
    isConsideredAssigned: false,
    assignedPoolCount: 0,
  }), []);

  // Helper tra cứu siêu tốc O(1) từ assignmentStatsMap
  const getAssignmentStats = (ingame: string) => {
    const norm = normalizeName(ingame);
    return assignmentStatsMap.get(norm) || defaultStats;
  };

  // Filtered and sorted list
  const filteredPersonnel = useMemo(() => {
    const list = personnelPool.filter((person) => {
      const stats = getAssignmentStats(person.ingame);
      const isAssignedInActive = stats.assignments.some((a) => a.isActiveBoard);

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
      if (statusFilter === 'UNASSIGNED' && stats.isConsideredAssigned) return false;
      if (statusFilter === 'ASSIGNED' && !stats.isConsideredAssigned) return false;
      if (statusFilter === 'UNASSIGNED_IN_ACTIVE' && isAssignedInActive) return false;

      return true;
    });

    if (sortOrder === 'alpha-asc') {
      return [...list].sort((a, b) => compareVietnameseAlphabet(a.ingame || '', b.ingame || ''));
    }
    if (sortOrder === 'alpha-desc') {
      return [...list].sort((a, b) => compareVietnameseAlphabet(b.ingame || '', a.ingame || ''));
    }
    if (sortOrder === 'class') {
      return [...list].sort((a, b) => {
        const cDiff = compareVietnameseAlphabet(a.className || '', b.className || '');
        if (cDiff !== 0) return cDiff;
        return compareVietnameseAlphabet(a.ingame || '', b.ingame || '');
      });
    }
    return list;
  }, [personnelPool, searchQuery, selectedClassFilter, statusFilter, assignmentStatsMap, sortOrder]);

  // Counts - Preserved accurately across all boards
  const totalCount = personnelPool.length;
  const assignedCount = useMemo(() => {
    let count = 0;
    for (const stats of assignmentStatsMap.values()) {
      if (stats.isConsideredAssigned) count++;
    }
    return count;
  }, [assignmentStatsMap]);
  const unassignedCount = totalCount - assignedCount;
  const unassignedInActiveCount = useMemo(() => {
    return personnelPool.filter((p) => {
      const list = assignmentsByIngame.get(normalizeName(p.ingame));
      return !list || !list.some((a) => a.isActiveBoard);
    }).length;
  }, [personnelPool, assignmentsByIngame]);

  // Duplicate Detection & Groups
  const duplicateGroups = useMemo(() => {
    return findDuplicatePersonnel(personnelPool);
  }, [personnelPool]);

  const handleCleanDuplicates = () => {
    const cleaned = deduplicatePersonnelList(personnelPool);
    onUpdatePersonnelPool(cleaned);
    setDuplicateError(null);
  };

  // Lưu thứ tự A-Z vĩnh viễn vào mảng kho lưu trữ
  const handleSortStoragePermanently = (ascending: boolean = true) => {
    const sorted = sortPersonnelAlphabetically(personnelPool, ascending);
    onUpdatePersonnelPool(sorted);
    setSortOrder(ascending ? 'alpha-asc' : 'alpha-desc');
  };

  // Handlers
  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIngame = newIngame.trim();
    if (!cleanIngame) return;

    // Ngăn chặn trùng lặp nhân sự trong cùng kho
    const norm = normalizeName(cleanIngame);
    if (personnelPool.some((p) => normalizeName(p.ingame) === norm)) {
      setDuplicateError(`Nhân sự "${cleanIngame}" đã tồn tại trong ${effectiveTitle}! Vui lòng không nhập trùng.`);
      return;
    }

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
    setDuplicateError(null);
    setIsAddingNew(false);
  };

  const handleStartEdit = (person: PersonnelMember) => {
    setEditingId(person.id);
    setEditIngame(person.ingame);
    setEditClass(person.className);
    setEditLoggedBy(person.loggedBy);
    setDuplicateError(null);
  };

  const handleSaveEdit = (id: string) => {
    const cleanIngame = editIngame.trim();
    if (!cleanIngame) return;

    // Ngăn chặn sửa thành tên trùng lặp với người khác
    const norm = normalizeName(cleanIngame);
    if (personnelPool.some((p) => p.id !== id && normalizeName(p.ingame) === norm)) {
      setDuplicateError(`Tên "${cleanIngame}" đã tồn tại trong ${effectiveTitle}! Vui lòng không nhập trùng.`);
      return;
    }

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
    setDuplicateError(null);
  };

  const handleDelete = (person: PersonnelMember) => {
    setPersonToDelete(person);
  };

  const confirmDeletePerson = () => {
    if (!personToDelete) return;
    onUpdatePersonnelPool(personnelPool.filter((p) => p.id !== personToDelete.id));
    setPersonToDelete(null);
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

  const effectiveTitle =
    poolTitle ||
    (isMasterPool
      ? 'Tổng Kho Nhân Sự'
      : poolType === 'raid'
      ? 'Kho Raid'
      : poolType === 'raid_update'
      ? 'Kho Raid Update'
      : poolType === 'guild_war'
      ? 'Kho Bang Chiến'
      : 'Kho Nhân Sự');

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl shadow-sm overflow-hidden transition-colors">
      {/* Header bar - Tactical Operations Console */}
      <div className="p-3 sm:p-3.5 border-b border-sky-200/80 dark:border-[#1F3347] bg-slate-50/90 dark:bg-[#162230]">
        {/* Pool Switcher Tabs */}
        {onSwitchPoolType && (
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-[#0B1219] rounded-xl mb-2.5 overflow-x-auto no-scrollbar border border-slate-200 dark:border-[#1F3347]">
            <button
              type="button"
              onClick={() => onSwitchPoolType('master')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                poolType === 'master'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black shadow-xs'
                  : 'text-slate-600 dark:text-[#8CA4B8] hover:bg-slate-300/50 dark:hover:bg-[#162230]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tổng Kho</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${poolType === 'master' ? 'bg-white/25' : 'bg-slate-300 dark:bg-[#1B2A3B]'}`}>
                {poolCounts?.master ?? totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchPoolType('raid')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                poolType === 'raid'
                  ? 'bg-sky-500 text-white font-black shadow-xs'
                  : 'text-slate-600 dark:text-[#8CA4B8] hover:bg-slate-300/50 dark:hover:bg-[#162230]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kho Raid</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${poolType === 'raid' ? 'bg-white/25' : 'bg-slate-300 dark:bg-[#1B2A3B]'}`}>
                {poolCounts?.raid ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchPoolType('raid_update')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                poolType === 'raid_update'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black shadow-xs'
                  : 'text-slate-600 dark:text-[#8CA4B8] hover:bg-slate-300/50 dark:hover:bg-[#162230]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kho Update</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${poolType === 'raid_update' ? 'bg-white/25' : 'bg-slate-300 dark:bg-[#1B2A3B]'}`}>
                {poolCounts?.update ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchPoolType('guild_war')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                poolType === 'guild_war'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black shadow-xs'
                  : 'text-slate-600 dark:text-[#8CA4B8] hover:bg-slate-300/50 dark:hover:bg-[#162230]'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Kho BC</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${poolType === 'guild_war' ? 'bg-white/25' : 'bg-slate-300 dark:bg-[#1B2A3B]'}`}>
                {poolCounts?.guildWar ?? 0}
              </span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${
              isMasterPool
                ? 'bg-gradient-to-br from-sky-400 to-indigo-600 text-white'
                : poolType === 'raid_update'
                ? 'bg-emerald-500 text-white'
                : poolType === 'guild_war'
                ? 'bg-amber-500 text-white'
                : 'bg-sky-100 dark:bg-[#88DCFA]/15 border border-sky-300 dark:border-[#88DCFA]/40 text-sky-700 dark:text-[#88DCFA]'
            }`}>
              {isMasterPool ? <Layers className="w-4 h-4" /> : poolType === 'guild_war' ? <Swords className="w-4 h-4" /> : poolType === 'raid_update' ? <Sparkles className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm flex items-center gap-2">
                <span className="text-slate-900 dark:text-white tracking-tight">{effectiveTitle}</span>
                {isMasterPool ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-[#88DCFA]/15 text-sky-800 dark:text-[#88DCFA] border border-sky-300 dark:border-[#88DCFA]/30 shadow-2xs">
                    {totalCount} nhân sự
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-[#88DCFA]/15 text-sky-800 dark:text-[#88DCFA] border border-sky-300 dark:border-[#88DCFA]/30 shadow-2xs">
                    {assignedCount}/{totalCount} đã xếp
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Master Pool: Button Chia Sẻ Sang Kho Con */}
            {isMasterPool && onOpenShareModal && (
              <button
                type="button"
                onClick={() => onOpenShareModal()}
                title="Mở hộp thoại chia sẻ nhân sự từ Tổng kho sang các kho con"
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-black text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 rounded-lg shadow-[0_0_12px_rgba(99,102,241,0.35)] transition-all active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Chia sẻ sang Kho con</span>
              </button>
            )}

            {/* Sub-pools: Nhận từ Tổng Kho */}
            {!isMasterPool && onOpenShareModal && (
              <button
                type="button"
                onClick={() => onOpenShareModal(poolType === 'raid_update' ? 'RAID_UPDATE' : poolType === 'guild_war' ? 'GUILD_WAR' : 'RAID')}
                title="Nhận / Nhập nhân sự từ Tổng kho vào kho con này"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-300 dark:border-sky-800 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                <span>Nhận từ Tổng kho</span>
              </button>
            )}

            {/* Sub-pools: Nạp ngược vào Tổng Kho */}
            {!isMasterPool && onPushToMaster && (
              <button
                type="button"
                onClick={onPushToMaster}
                title="Đồng bộ những nhân sự mới trong kho này lên Tổng kho nhân sự"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#101A24] hover:bg-slate-100 dark:hover:bg-[#1D2D40] border border-slate-300 dark:border-[#1F3347] rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Nạp vào Tổng kho</span>
              </button>
            )}

            {/* Sub-pools: Làm trống kho */}
            {!isMasterPool && onClearSubPool && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                title="Làm trống kho con này (dữ liệu vẫn còn nguyên vẹn trong Tổng kho)"
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {isRaidUpdate && onOpenCopyModal && (
              <button
                type="button"
                onClick={onOpenCopyModal}
                title="Sao chép nhân sự từ Kho Raid và Bang Chiến vào Kho Raid Update này"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-300 dark:border-purple-800/80 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Copy className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span className="hidden sm:inline">Sao chép</span>
              </button>
            )}

            <button
              type="button"
              id="btn-add-personnel-open"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-slate-950 bg-[#88DCFA] hover:bg-[#68CEF6] rounded-lg shadow-[0_0_12px_rgba(136,220,250,0.3)] transition-all active:scale-95 font-black cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingNew ? 'Đóng' : '+ Thêm'}</span>
            </button>
          </div>
        </div>

        {/* Confirmation modal for clearing subpool */}
        {showResetConfirm && (
          <div className="mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs space-y-2 animate-in fade-in">
            <div className="font-bold text-rose-900 dark:text-rose-200">
              Xác nhận làm trống {effectiveTitle}?
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300">
              Thao tác này chỉ làm trống kho con hiện tại. Toàn bộ nhân sự vẫn được lưu giữ 100% an toàn trong Tổng Kho Nhân Sự!
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-400 font-bold hover:text-black dark:hover:text-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearSubPool && onClearSubPool();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black cursor-pointer"
              >
                Làm trống kho
              </button>
            </div>
          </div>
        )}

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
                    if (duplicateError) setDuplicateError(null);
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

            {duplicateError && (
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{duplicateError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setDuplicateError(null);
                }}
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

      {/* Guide note & Alphabet Sorting Controls */}
      <div className="px-3.5 py-1.5 bg-sky-50 dark:bg-[#0B1219]/80 border-b border-sky-200/80 dark:border-[#1F3347] text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between font-medium flex-wrap gap-2">
        <span className="flex items-center gap-1.5 text-[11px]">
          <GripVertical className="w-3.5 h-3.5 text-sky-600 dark:text-[#88DCFA]" />
          <span>Kéo thả thẻ nhân sự vào hàng bảng Raid hoặc bấm <strong>+ Xếp</strong></span>
        </span>

        {/* Sort Alphabet Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">
            Sắp xếp:
          </span>

          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc'))}
            title={sortOrder === 'alpha-asc' ? 'Đang xếp A → Z. Bấm để đảo ngược Z → A' : 'Đang xếp Z → A. Bấm để xếp A → Z'}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shadow-2xs border cursor-pointer ${
              sortOrder === 'alpha-asc' || sortOrder === 'alpha-desc'
                ? 'bg-sky-500 text-white border-sky-400 font-black'
                : 'bg-white dark:bg-[#162230] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#1F3347]'
            }`}
          >
            {sortOrder === 'alpha-desc' ? (
              <>
                <ArrowUpZA className="w-3.5 h-3.5" />
                <span>Z → A</span>
              </>
            ) : (
              <>
                <ArrowDownAZ className="w-3.5 h-3.5" />
                <span>A → Z</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'class' ? 'alpha-asc' : 'class'))}
            title="Sắp xếp theo nhóm Môn phái"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shadow-2xs border cursor-pointer ${
              sortOrder === 'class'
                ? 'bg-indigo-600 text-white border-indigo-500 font-black'
                : 'bg-white dark:bg-[#162230] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#1F3347]'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>Môn phái</span>
          </button>

          {sortOrder !== 'default' && (
            <button
              type="button"
              onClick={() => setSortOrder('default')}
              title="Khôi phục thứ tự nhập ban đầu"
              className="px-1.5 py-0.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Gốc
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSortStoragePermanently(true)}
            title="Lưu thứ tự Alphabet A-Z vĩnh viễn vào kho nhân sự này"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer ml-0.5"
          >
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Lưu A-Z kho</span>
          </button>
        </div>
      </div>

      {/* Duplicate Warning & 1-Click Clean Banner */}
      {duplicateGroups.length > 0 && (
        <div className="mx-2 sm:mx-3 my-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between gap-2 flex-wrap text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="leading-snug">
              Phát hiện <strong>{duplicateGroups.length}</strong> nhân sự bị lặp lại tên trong {effectiveTitle} ({duplicateGroups.map((d) => d.name).slice(0, 3).join(', ')}{duplicateGroups.length > 3 ? '...' : ''})
            </span>
          </div>
          <button
            type="button"
            onClick={handleCleanDuplicates}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-lg shadow-xs transition-all cursor-pointer text-[11px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Lọc trùng lặp ngay</span>
          </button>
        </div>
      )}

      {/* Personnel List */}
      <div className="p-2 sm:p-3 overflow-y-auto flex-1 space-y-1.5 max-h-[560px]">
        {filteredPersonnel.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-semibold">Không tìm thấy nhân sự phù hợp</p>
            <p className="text-[11px] mt-0.5">
              {searchQuery || selectedClassFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Thử xóa bớt bộ lọc để hiển thị nhiều hơn'
                : 'Bấm "+ Thêm" hoặc "Nhận từ Tổng kho" để nạp danh sách nhân sự'}
            </p>
          </div>
        ) : (
          filteredPersonnel.map((person) => {
            const classMeta = getEffectiveClassMeta(person.className, customColors);
            const stats = getAssignmentStats(person.ingame);
            const {
              assignments,
              hasRaid,
              hasUpdate,
              hasGw,
              isAssignedInAll3,
              isAssignedAny,
              isConsideredAssigned,
              assignedPoolCount,
            } = stats;
            const isAssignedInActiveBoard = assignments.some((a) => a.isActiveBoard);
            const activeAssignment = assignments.find((a) => a.isActiveBoard);
            const otherAssignments = assignments.filter((a) => !a.isActiveBoard);

            const isEditing = editingId === person.id;
            const isDragging = draggedPersonnelId === person.id;

            // Strikethrough condition:
            // In Master Pool: Only struck through when assigned in ALL 3 pools (Kho Raid, Kho Update, Kho Bang Chiến) OR manually checked
            // In Sub-pools: Struck through when assigned in this sub-pool's boards OR manually checked
            const isCrossedOut = isConsideredAssigned || Boolean(person.checked);

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
                      onChange={(e) => {
                        setEditIngame(e.target.value);
                        if (duplicateError) setDuplicateError(null);
                      }}
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
                  {duplicateError && editingId === person.id && (
                    <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1 animate-in fade-in">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{duplicateError}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setDuplicateError(null);
                      }}
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
                draggable={true}
                onDragStart={(e) => handleDragStart(e, person)}
                onDragEnd={handleDragEnd}
                className={`group flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                  isDragging
                    ? 'opacity-40 border-[#88DCFA] bg-[#88DCFA]/15'
                    : isCrossedOut
                    ? 'bg-slate-100/90 dark:bg-[#121B24] border-slate-200 dark:border-[#1A2A38] opacity-85 hover:border-sky-400 dark:hover:border-[#2C4863] shadow-2xs hover:shadow-xs'
                    : 'bg-white dark:bg-[#162230] border-slate-200 dark:border-[#1F3347] hover:border-sky-400 dark:hover:border-[#2C4863] shadow-2xs hover:shadow-xs'
                }`}
              >
                {/* 1. Top Row: Grip, Checkbox, Ingame Name (Left) & Class Pill, Actions (Right) */}
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                  {/* Left: Grip, Checkbox, Name */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Drag Grip Handle */}
                    <span
                      className="shrink-0 cursor-grab text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-[#88DCFA]"
                      title={
                        isAssignedInActiveBoard
                          ? `Đã có trong ${activeBoardTitle || 'bảng hiện tại'} - Có thể kéo thả sang vị trí khác trong Bảng`
                          : isAssignedAny
                          ? `Đã xếp ở ${otherAssignments.map((a) => a.boardTitle).join(', ')} - Có thể kéo thả vào Bảng hiện tại`
                          : 'Kéo thẻ này thả vào hàng bất kỳ trong Bảng'
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

                    {/* Ingame name */}
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

                    {/* Master Pool: Quick Share Distribution Badges */}
                    {isMasterPool ? (
                      <div className="flex items-center gap-1">
                        {/* Raid */}
                        {subPoolMembershipMap?.inRaid.has(normalizeName(person.ingame)) ? (
                          <span
                            title="Đã có trong Kho Raid"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>Raid</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onQuickShareMember && onQuickShareMember(person, 'RAID')}
                            title="Chia sẻ ngay sang Kho Raid"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800/60 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Raid</span>
                          </button>
                        )}

                        {/* Update */}
                        {subPoolMembershipMap?.inUpdate.has(normalizeName(person.ingame)) ? (
                          <span
                            title="Đã có trong Kho Raid Update"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 shadow-2xs"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>Update</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onQuickShareMember && onQuickShareMember(person, 'RAID_UPDATE')}
                            title="Chia sẻ ngay sang Kho Raid Update"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800/60 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Update</span>
                          </button>
                        )}

                        {/* Guild War */}
                        {subPoolMembershipMap?.inGuildWar.has(normalizeName(person.ingame)) ? (
                          <span
                            title="Đã có trong Kho Bang Chiến"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>BC</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onQuickShareMember && onQuickShareMember(person, 'GUILD_WAR')}
                            title="Chia sẻ ngay sang Kho Bang Chiến"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>BC</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Sub-pools: Normal Assign / Remove Button */
                      isAssignedInActiveBoard ? (
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
                            isAssignedAny
                              ? `Đã có ở ${otherAssignments.map((a) => a.boardTitle).join(', ')} - Click để xếp vào bảng này`
                              : 'Xếp vào ô trống kế tiếp hoặc thêm slot mới trong Raid'
                          }
                          className="flex items-center gap-0.5 px-2.5 py-1 text-[11px] font-black rounded-lg bg-[#88DCFA] hover:bg-[#68CEF6] active:bg-[#48bbf0] text-slate-950 shadow-[0_0_10px_rgba(136,220,250,0.3)] transition-all hover:scale-105 active:scale-95"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                          <span>{isAssignedAny ? 'Xếp tiếp' : 'Xếp'}</span>
                        </button>
                      )
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
                        onClick={() => handleDelete(person)}
                        title={isMasterPool ? 'Xoá khỏi Tổng kho (đồng loạt biến mất ở 3 kho con)' : `Xoá khỏi ${effectiveTitle} (Tổng kho vẫn giữ nguyên)`}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Middle Row (Full Width): Status Tag (Kéo dài toàn bộ theo hướng ngang) & Note Badge */}
                {(isAssignedAny || (!isAssignedAny && person.checked) || person.note?.trim()) && (
                  <div className="flex items-center gap-1.5 flex-wrap w-full pl-6">
                    {isAssignedAny && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-black border shadow-2xs whitespace-nowrap max-w-full overflow-x-auto no-scrollbar ${
                          isMasterPool && isAssignedInAll3
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-sky-100 dark:bg-[#152B3B] text-sky-900 dark:text-[#88DCFA] border border-sky-300 dark:border-[#1E435E]'
                        }`}
                        title={
                          isMasterPool
                            ? isAssignedInAll3
                              ? `Đã xếp đủ cả 3 kho: ${assignments.map((a) => `${a.boardTitle} (STT #${a.stt}${a.party ? ` - P${a.party}` : ''})`).join(', ')} (Đã gạch tên)`
                              : `Đã xếp ở ${[hasRaid ? 'Raid' : null, hasUpdate ? 'Update' : null, hasGw ? 'BC' : null].filter(Boolean).join(' + ')} (${assignedPoolCount}/3 kho): ${assignments.map((a) => `${a.boardTitle} (STT #${a.stt}${a.party ? ` - P${a.party}` : ''})`).join(', ')}`
                            : `Đã xếp ở: ${assignments.map((a) => `${a.boardTitle} (STT #${a.stt}${a.party ? ` - P${a.party}` : ''})`).join(', ')}`
                        }
                      >
                        <Check className="w-3 h-3 stroke-[3] shrink-0" />
                        <span className="whitespace-nowrap">
                          {isMasterPool && !isAssignedInAll3 && (
                            <span className="mr-1 text-[10px] opacity-75 font-bold">
                              ({assignedPoolCount}/3 kho)
                            </span>
                          )}
                          {isMasterPool && isAssignedInAll3 && (
                            <span className="mr-1 text-[10px] opacity-90 font-bold">
                              (Đủ 3 kho)
                            </span>
                          )}
                          {Array.from(new Set(assignments.map((a) => a.boardTitle))).join(', ')}
                        </span>
                      </span>
                    )}

                    {!isAssignedAny && person.checked && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-black bg-sky-100 dark:bg-sky-950/70 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800/70 shadow-2xs whitespace-nowrap"
                      >
                        <Check className="w-3 h-3 stroke-[3] shrink-0" />
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
                        className="inline-flex items-start gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/80 shadow-2xs whitespace-pre-line text-left break-words max-w-full transition-all hover:scale-[1.01] cursor-pointer"
                        title={`Ghi chú:\n${person.note}\n(Click để mở xem & sửa)`}
                      >
                        <MessageSquare className="w-2.5 h-2.5 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5" />
                        <span className="whitespace-pre-line break-words text-left">{person.note}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 3. Bottom Row: Logged by */}
                <div className="text-[11px] truncate flex items-center gap-1 text-slate-500 dark:text-slate-400 pl-6">
                  <span className="font-semibold text-slate-500 dark:text-[#8CA4B8]">
                    Log:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {person.loggedBy || person.ingame}
                  </span>
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
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 ${
              isMasterPool ? 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isMasterPool
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {isMasterPool ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <Trash2 className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {isMasterPool ? 'Làm trống Tổng Kho Nhân Sự?' : `Làm trống ${effectiveTitle}?`}
                  </h4>
                </div>
              </div>

              {isMasterPool ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-1.5 text-xs text-rose-900 dark:text-rose-200">
                  <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>CẢNH BÁO NGUY HIỂM: XOÁ ĐỒNG LOẠT 3 KHO CON</span>
                  </div>
                  <p className="leading-relaxed">
                    Làm trống Tổng kho sẽ <strong>đồng loạt làm trống cả 3 kho con</strong> (Kho Raid, Kho Raid Update, Kho Bang Chiến)! Bạn có chắc chắn muốn xóa toàn bộ?
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 rounded-xl space-y-1 text-xs text-sky-900 dark:text-sky-200">
                  <div className="font-bold flex items-center gap-1.5 text-sky-700 dark:text-sky-300">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Dữ liệu an toàn trong Tổng kho</span>
                  </div>
                  <p className="leading-relaxed">
                    Chỉ làm trống danh sách của <strong>{effectiveTitle}</strong>. Toàn bộ nhân sự vẫn được <strong>bảo toàn an toàn 100% trong Tổng kho nhân sự</strong>.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdatePersonnelPool([]);
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isMasterPool ? 'Đồng ý xoá tất cả' : 'Đồng ý làm trống'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Single Person Confirmation Modal */}
      {personToDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 ${
              isMasterPool
                ? 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/30'
                : 'border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isMasterPool
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                }`}>
                  {isMasterPool ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <Trash2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {isMasterPool ? 'Xác nhận xoá khỏi Tổng Kho Nhân Sự' : `Xác nhận loại bỏ khỏi ${effectiveTitle}`}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nhân sự: <span className="font-bold text-slate-900 dark:text-white">{personToDelete.ingame}</span> ({personToDelete.className})
                  </p>
                </div>
              </div>

              {isMasterPool ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-1.5 text-xs text-rose-900 dark:text-rose-200">
                  <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>LƯU Ý QUAN TRỌNG: ĐỒNG LOẠT BIẾN MẤT Ở CẢ 3 KHO CON</span>
                  </div>
                  <p className="leading-relaxed">
                    Xoá nhân sự <strong>"{personToDelete.ingame}"</strong> khỏi Tổng kho sẽ đồng loạt loại bỏ nhân sự này khỏi <strong>cả 3 kho con</strong> (Kho Raid, Kho Raid Update, Kho Bang Chiến) và các bảng liên quan!
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 rounded-xl space-y-1 text-xs text-sky-900 dark:text-sky-200">
                  <div className="font-bold flex items-center gap-1.5 text-sky-700 dark:text-sky-300">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Tổng kho vẫn được bảo toàn 100%</span>
                  </div>
                  <p className="leading-relaxed">
                    Loại bỏ nhân sự <strong>"{personToDelete.ingame}"</strong> khỏi <strong>{effectiveTitle}</strong> không làm mất dữ liệu gốc. Nhân sự vẫn được lưu trữ an toàn trong Tổng kho nhân sự.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPersonToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePerson}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isMasterPool ? 'Đồng ý xoá (Xoá cả 3 kho con)' : 'Đồng ý loại bỏ'}
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
