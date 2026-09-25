import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, RaidClass, RaidMember, RaidParty } from '../types';
import { DuplicateWarningBanner } from './DuplicateWarningBanner';
import { getDuplicateIngameMap, getDuplicateLoggedByMap } from '../utils/duplicates';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Copy,
  Edit2,
  Check,
  Palette,
  GripVertical,
  Layers,
  Shield,
  Heart,
  Swords,
  MoreVertical,
  ArrowRightLeft,
  X,
  Sun,
  Moon,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

interface RaidTableProps {
  titlePrefix: string;
  scheduleTime: string;
  bossName: string;
  members: RaidMember[];
  parties?: RaidParty[];
  customColors?: CustomClassColors;
  onUpdateTitle: (titlePrefix: string, scheduleTime: string, bossName: string) => void;
  onUpdateMembers: (newMembers: RaidMember[]) => void;
  onOpenColorCustomizer?: () => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
  selectedClassFilter?: RaidClass | null;
  darkMode?: boolean;
}

export const RaidTable: React.FC<RaidTableProps> = ({
  titlePrefix,
  scheduleTime,
  bossName,
  members,
  parties = [
    { id: 1, name: 'PT 1' },
    { id: 2, name: 'PT 2' },
  ],
  customColors,
  onUpdateTitle,
  onUpdateMembers,
  onOpenColorCustomizer,
  tableRef,
  selectedClassFilter,
  darkMode = false,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempPrefix, setTempPrefix] = useState(titlePrefix);
  const [tempSchedule, setTempSchedule] = useState(scheduleTime);
  const [tempBoss, setTempBoss] = useState(bossName);
  const [activeClassSelectId, setActiveClassSelectId] = useState<string | null>(null);

  // Toggle showing party section dividers inside the table
  const [showPartyDividers, setShowPartyDividers] = useState(false);

  // Custom table canvas theme: 'auto' (follow dark mode) | 'light' | 'dark'
  const [canvasTheme, setCanvasTheme] = useState<'auto' | 'light' | 'dark'>('auto');

  // Compute effective table darkness
  const isTableDark =
    canvasTheme === 'dark' || (canvasTheme === 'auto' && darkMode);

  // Drag and drop state for table rows
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [dragOverMemberId, setDragOverMemberId] = useState<string | null>(null);

  // Mobile row actions modal state
  const [mobileActionMemberId, setMobileActionMemberId] = useState<string | null>(null);
  const [showResetRaidConfirm, setShowResetRaidConfirm] = useState(false);

  // Duplicate Ingame and LoggedBy lookup maps
  const duplicateIngameMap = useMemo(() => getDuplicateIngameMap(members), [members]);
  const duplicateLoggedByMap = useMemo(() => getDuplicateLoggedByMap(members), [members]);

  // Smooth scroll and highlight a member row
  const handleScrollToMember = (stt: number) => {
    const row = document.getElementById(`raid-row-${stt}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('ring-2', 'ring-amber-500', 'bg-amber-100/40');
      setTimeout(() => {
        row.classList.remove('ring-2', 'ring-amber-500', 'bg-amber-100/40');
      }, 2500);
    }
  };

  // Close class selection popover on click outside (desktop)
  useEffect(() => {
    if (!activeClassSelectId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(`#class-picker-${activeClassSelectId}`) &&
        !target.closest(`#class-picker-modal`)
      ) {
        setActiveClassSelectId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeClassSelectId]);

  const handleSaveTitle = () => {
    onUpdateTitle(tempPrefix.trim(), tempSchedule.trim(), tempBoss.trim());
    setEditingTitle(false);
  };

  const handleUpdateMember = (id: string, updates: Partial<RaidMember>) => {
    const updated = members.map((m) => (m.id === id ? { ...m, ...updates } : m));
    onUpdateMembers(updated);
  };

  const handleCopyIngameToLoggedBy = (id: string) => {
    const member = members.find((m) => m.id === id);
    if (member) {
      handleUpdateMember(id, { loggedBy: member.ingame });
    }
  };

  const handleCopyAllIngameToLoggedBy = () => {
    const updated = members.map((m) => ({
      ...m,
      loggedBy: m.loggedBy ? m.loggedBy : m.ingame,
    }));
    onUpdateMembers(updated);
  };

  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= members.length) return;

    const list = [...members];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    // Re-index STT
    const reindexed = list.map((item, idx) => ({ ...item, stt: idx + 1 }));
    onUpdateMembers(reindexed);
  };

  const handleDeleteRow = (id: string) => {
    const remaining = members.filter((m) => m.id !== id);
    const reindexed = remaining.map((item, idx) => ({ ...item, stt: idx + 1 }));
    onUpdateMembers(reindexed);
    if (mobileActionMemberId === id) {
      setMobileActionMemberId(null);
    }
  };

  const handleClearRow = (id: string) => {
    handleUpdateMember(id, { ingame: '', loggedBy: '' });
    if (mobileActionMemberId === id) {
      setMobileActionMemberId(null);
    }
  };

  const handleAddRow = () => {
    const nextStt = members.length + 1;
    const lastParty = members.length > 0 ? members[members.length - 1].party || 1 : 1;
    const newMember: RaidMember = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      stt: nextStt,
      ingame: '',
      className: 'Toái Mộng',
      loggedBy: '',
      party: lastParty,
    };
    onUpdateMembers([...members, newMember]);
  };

  // Row Drag and drop handlers
  const handleRowDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('source-type', 'row-reorder');
    e.dataTransfer.effectAllowed = 'move';
    setDraggedMemberId(id);
  };

  const handleRowDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverMemberId !== id) {
      setDragOverMemberId(id);
    }
  };

  const handleRowDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDraggedMemberId(null);
    setDragOverMemberId(null);

    // 1. Check if this is a drop from Kho Nhân Sự (Personnel Storage)
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'personnel' && parsed.member) {
          const p = parsed.member;
          const updated = members.map((m) =>
            m.id === targetId
              ? {
                  ...m,
                  ingame: p.ingame,
                  className: p.className,
                  loggedBy: p.loggedBy || p.ingame,
                }
              : m
          );
          onUpdateMembers(updated);
          return;
        }
      }
    } catch {}

    // 2. Fallback to row reordering
    const sourceId = e.dataTransfer.getData('text/plain') || draggedMemberId;
    if (!sourceId || sourceId === targetId) {
      return;
    }

    const sourceIndex = members.findIndex((m) => m.id === sourceId);
    const targetIndex = members.findIndex((m) => m.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const list = [...members];
    const [moved] = list.splice(sourceIndex, 1);

    const targetMember = members[targetIndex];
    if (showPartyDividers && targetMember.party) {
      moved.party = targetMember.party;
    }

    list.splice(targetIndex, 0, moved);

    const reindexed = list.map((item, idx) => ({ ...item, stt: idx + 1 }));
    onUpdateMembers(reindexed);
  };

  const handleBottomDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverMemberId(null);
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'personnel' && parsed.member) {
          const p = parsed.member;
          const nextStt = members.length + 1;
          const lastParty = members.length > 0 ? members[members.length - 1].party || 1 : 1;
          const newMember: RaidMember = {
            id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            stt: nextStt,
            ingame: p.ingame,
            className: p.className,
            loggedBy: p.loggedBy || p.ingame,
            party: lastParty,
          };
          onUpdateMembers([...members, newMember]);
          return;
        }
      }
    } catch {}
  };

  const handleQuickSwitchParty = (memberId: string, partyId: number) => {
    if (showPartyDividers) {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;
      if ((member.party || 1) === partyId) return;

      const updated = { ...member, party: partyId };
      const remaining = members.filter((m) => m.id !== memberId);

      // Place at the end of the target party group
      const lastTargetIndex = remaining.reduce(
        (lastIdx, m, idx) => ((m.party || 1) === partyId ? idx : lastIdx),
        -1
      );

      if (lastTargetIndex !== -1) {
        remaining.splice(lastTargetIndex + 1, 0, updated);
      } else {
        remaining.push(updated);
      }

      const reindexed = remaining.map((m, idx) => ({ ...m, stt: idx + 1 }));
      onUpdateMembers(reindexed);
    } else {
      handleUpdateMember(memberId, { party: partyId });
    }
  };

  // Split members evenly: first half to PT 1, second half to PT 2
  const handleSplitPartiesEvenly = () => {
    const half = Math.ceil(members.length / 2);
    const updated = members.map((m, idx) => ({
      ...m,
      party: idx < half ? 1 : 2,
    }));
    onUpdateMembers(updated);
  };

  // Group members so that all PT 1 are top, PT 2 are bottom, re-indexed 1..N
  const handleGroupMembersByParty = () => {
    const p1 = members.filter((m) => (m.party || 1) === 1);
    const p2 = members.filter((m) => (m.party || 1) === 2);
    const others = members.filter((m) => (m.party || 1) > 2);
    const sorted = [...p1, ...p2, ...others].map((m, idx) => ({
      ...m,
      stt: idx + 1,
    }));
    onUpdateMembers(sorted);
  };

  const activeMobileMember = members.find((m) => m.id === mobileActionMemberId);
  const activeMobileIndex = members.findIndex((m) => m.id === mobileActionMemberId);
  const activeClassMember = members.find((m) => m.id === activeClassSelectId);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Table Control Bar */}
      <div className="w-full max-w-[620px] flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 mb-3 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            type="button"
            id="btn-edit-title"
            onClick={() => {
              setTempPrefix(titlePrefix);
              setTempSchedule(scheduleTime);
              setTempBoss(bossName);
              setEditingTitle(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors border border-slate-300 dark:border-slate-700"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Tiêu đề</span>
          </button>

          <button
            type="button"
            id="btn-fill-all-loggedby"
            onClick={handleCopyAllIngameToLoggedBy}
            title="Tự động điền Logged by = Ingame cho các ô còn trống"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors border border-slate-300 dark:border-slate-700"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Điền Logged by</span>
            <span className="sm:hidden">Logged by</span>
          </button>

          {/* Toggle Party Section Dividers */}
          <button
            type="button"
            id="btn-toggle-party-dividers"
            onClick={() => setShowPartyDividers(!showPartyDividers)}
            title="Bật/Tắt hiển thị phân chia theo nhóm PT trong bảng"
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] font-semibold rounded-lg transition-colors border ${
              showPartyDividers
                ? 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-600'
                : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showPartyDividers ? 'Ẩn chia PT' : 'Hiện chia PT'}</span>
          </button>

          {/* Quick Party Split / Group Buttons */}
          <button
            type="button"
            id="btn-split-parties-evenly"
            onClick={handleSplitPartiesEvenly}
            title="Chia đều danh sách: 6 người đầu vào PT 1, 6 người sau vào PT 2"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-blue-50 hover:bg-blue-100 active:bg-blue-200 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Chia 6-6 (P1/P2)</span>
            <span className="sm:hidden">Chia 6-6</span>
          </button>

          <button
            type="button"
            id="btn-group-by-party"
            onClick={handleGroupMembersByParty}
            title="Sắp xếp gom nhóm: tất cả thành viên PT 1 lên trên, PT 2 xuống dưới"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Gom nhóm PT</span>
            <span className="sm:hidden">Gom PT</span>
          </button>

          {onOpenColorCustomizer && (
            <button
              type="button"
              id="btn-open-color-customizer-table"
              onClick={onOpenColorCustomizer}
              title="Đổi màu cho môn phái bất kỳ"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-purple-50 hover:bg-purple-100 active:bg-purple-200 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold rounded-lg transition-colors border border-purple-200 dark:border-purple-800"
            >
              <Palette className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Đổi màu</span>
            </button>
          )}

          {/* Toggle Table Canvas Theme (Light/Dark board) */}
          <button
            type="button"
            id="btn-toggle-canvas-theme"
            onClick={() => {
              if (isTableDark) setCanvasTheme('light');
              else setCanvasTheme('dark');
            }}
            title="Chuyển nền bảng ảnh: Nền Sáng / Nền Tối"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors border border-slate-300 dark:border-slate-700"
          >
            {isTableDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Bảng sáng</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Bảng tối</span>
              </>
            )}
          </button>
        </div>

        <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline text-[11px]">
          Kéo thả hàng để đổi vị trí • Chạm ô để sửa
        </span>
      </div>

      {/* Title Edit Form Popover/Banner */}
      {editingTitle && (
        <div
          id="title-edit-panel"
          className="w-full max-w-[620px] bg-amber-50/90 dark:bg-slate-850 border border-amber-300 dark:border-amber-700/60 rounded-xl p-3 sm:p-3.5 mb-4 shadow-sm"
        >
          <div className="font-bold text-black text-xs uppercase mb-2">
            Chỉnh sửa tiêu đề Raid
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-black mb-1">
                Tên Raid (ví dụ: RAID 1)
              </label>
              <input
                type="text"
                value={tempPrefix}
                onChange={(e) => setTempPrefix(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="RAID 1"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-red-600 dark:text-red-400 mb-1">
                Lịch Raid (màu đỏ)
              </label>
              <input
                type="text"
                value={tempSchedule}
                onChange={(e) => setTempSchedule(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="MON 20:30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black mb-1">
                Tên Boss / Ải Raid
              </label>
              <input
                type="text"
                value={tempBoss}
                onChange={(e) => setTempBoss(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="NIÊN DU"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={() => setEditingTitle(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg min-h-[36px]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveTitle}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm min-h-[36px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu tiêu đề</span>
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Ingame / Logged By Warning Banner */}
      <DuplicateWarningBanner
        members={members}
        onScrollToMember={handleScrollToMember}
      />

      {/* Responsive Horizontal Scroll Wrapper for Table */}
      <div className="w-full max-w-[620px] overflow-x-auto pb-1">
        {/* The Visual Raid Table (Replicating Image, Dark/Light adaptive) */}
        <div
          ref={tableRef}
          id="raid-capture-canvas"
          data-table-theme={isTableDark ? 'dark' : 'light'}
          className={`w-full min-w-[320px] max-w-[620px] select-none shadow-md relative transition-colors ${
            isTableDark
              ? 'bg-slate-900 border-[2px] border-slate-600 text-slate-100'
              : 'bg-white border-[2px] border-black text-slate-900'
          }`}
          style={{ fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
        >
          {/* Banner Title */}
          <div
            id="raid-table-title"
            className={`w-full py-2 sm:py-2.5 px-2 sm:px-3 text-center border-b-[2px] ${
              isTableDark
                ? 'bg-slate-900 border-slate-600'
                : 'bg-white border-black'
            }`}
          >
            <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight uppercase leading-snug">
              <span>{titlePrefix || 'RAID 1'} - </span>
              <span className="text-[#e50000] font-black">
                {scheduleTime || 'MON 20:30'}
              </span>{' '}
              <span>{bossName || 'NIÊN DU'}</span>
            </h2>
          </div>

          {/* Table Content */}
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className={isTableDark ? 'bg-slate-900' : 'bg-white'}>
                <th
                  className={`w-[14%] sm:w-[14%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-black uppercase text-xs sm:text-sm md:text-base border-r-[2px] border-b-[2px] ${
                    isTableDark ? 'border-slate-600 text-slate-200' : 'border-black text-slate-900'
                  }`}
                >
                  STT
                </th>
                <th
                  className={`w-[31%] sm:w-[32%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-black text-xs sm:text-sm md:text-base border-b-[2px] ${
                    isTableDark ? 'border-slate-600 text-slate-200' : 'border-black text-slate-900'
                  }`}
                >
                  Ingame
                </th>
                <th
                  className={`w-[27%] sm:w-[27%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-black text-xs sm:text-sm md:text-base border-l-[2px] border-r-[2px] border-b-[2px] ${
                    isTableDark ? 'border-slate-600 text-slate-200' : 'border-black text-slate-900'
                  }`}
                >
                  Class
                </th>
                <th
                  className={`w-[28%] sm:w-[27%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-black text-xs sm:text-sm md:text-base border-b-[2px] ${
                    isTableDark ? 'border-slate-600 text-slate-200' : 'border-black text-slate-900'
                  }`}
                >
                  Logged by
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, idx) => {
                const classMeta = getEffectiveClassMeta(member.className, customColors);
                const isFilteredOut =
                  selectedClassFilter && member.className !== selectedClassFilter;
                const isClassPickerOpen = activeClassSelectId === member.id;
                const openUpward = idx >= Math.max(3, Math.floor(members.length / 2));
                const isDragging = draggedMemberId === member.id;
                const isDragOver = dragOverMemberId === member.id;

                const isIngameDup = duplicateIngameMap.has(member.id);
                const ingameDupInfo = duplicateIngameMap.get(member.id);
                const isLoggedByDup = duplicateLoggedByMap.has(member.id);
                const loggedByDupInfo = duplicateLoggedByMap.get(member.id);

                const currentPartyId = member.party || 1;
                const prevMember = idx > 0 ? members[idx - 1] : null;
                const prevPartyId = prevMember ? prevMember.party || 1 : null;
                const shouldShowDivider =
                  showPartyDividers && (idx === 0 || currentPartyId !== prevPartyId);

                const partyObj = parties.find((p) => p.id === currentPartyId) || {
                  id: currentPartyId,
                  name: `PT ${currentPartyId}`,
                };

                const membersInThisParty = members.filter(
                  (m) => (m.party || 1) === currentPartyId
                );
                let pTanks = 0;
                let pHealers = 0;
                let pDps = 0;
                membersInThisParty.forEach((m) => {
                  const meta = getEffectiveClassMeta(m.className, customColors);
                  if (meta.role === 'Tank') pTanks++;
                  else if (meta.role === 'Healer') pHealers++;
                  else pDps++;
                });

                return (
                  <React.Fragment key={member.id}>
                    {/* Party Section Divider Row */}
                    {shouldShowDivider && (
                      <tr
                        className={`border-b-[2px] ${
                          isTableDark
                            ? 'bg-slate-800 border-slate-600 text-slate-200'
                            : 'bg-slate-100 border-black text-slate-800'
                        }`}
                      >
                        <td
                          colSpan={4}
                          className="py-1 px-2 sm:px-3 text-left font-black text-[11px] sm:text-xs uppercase tracking-wider"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`flex items-center gap-1 font-black ${
                                isTableDark ? 'text-indigo-300' : 'text-indigo-900'
                              }`}
                            >
                              <Shield className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{partyObj.name}</span>
                              <span
                                className={`text-[10px] sm:text-[11px] font-bold ${
                                  isTableDark ? 'text-slate-400' : 'text-slate-600'
                                }`}
                              >
                                ({membersInThisParty.length})
                              </span>
                            </span>
                            <span
                              className={`text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5 sm:gap-2 ${
                                isTableDark ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              <span className="flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" />
                                {pTanks}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" />
                                {pHealers}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Swords className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                                {pDps}
                              </span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Member Row */}
                    <tr
                      id={`raid-row-${member.stt}`}
                      draggable
                      onDragStart={(e) => handleRowDragStart(e, member.id)}
                      onDragOver={(e) => handleRowDragOver(e, member.id)}
                      onDragEnd={() => {
                        setDraggedMemberId(null);
                        setDragOverMemberId(null);
                      }}
                      onDrop={(e) => handleRowDrop(e, member.id)}
                      style={{ zIndex: isClassPickerOpen ? 40 : undefined }}
                      className={`transition-colors group relative cursor-default ${
                        isTableDark
                          ? 'hover:bg-slate-800/60'
                          : 'hover:bg-slate-50'
                      } ${isFilteredOut ? 'opacity-30' : ''} ${
                        isDragging
                          ? isTableDark
                            ? 'opacity-30 bg-indigo-950/50'
                            : 'opacity-30 bg-indigo-50'
                          : ''
                      } ${
                        isDragOver
                          ? 'border-t-2 border-t-indigo-500 bg-indigo-500/20'
                          : ''
                      }`}
                    >
                      {/* STT Column */}
                      <td
                        className={`py-1.5 sm:py-2 px-1 text-center font-black text-xs sm:text-base relative cursor-pointer sm:cursor-default border-r-[2px] border-b-[2px] ${
                          isTableDark
                            ? 'border-slate-700 text-slate-200'
                            : 'border-black text-slate-900'
                        }`}
                        onClick={() => setMobileActionMemberId(member.id)}
                        title="Chạm để mở menu hành động cho thành viên này"
                      >
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                          {/* Desktop Drag Handle */}
                          <span
                            data-html2canvas-ignore="true"
                            className={`cursor-grab hidden sm:inline ${
                              isTableDark
                                ? 'text-slate-600 group-hover:text-slate-400'
                                : 'text-slate-300 group-hover:text-slate-500'
                            }`}
                            title="Kéo thả hàng để đổi vị trí"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>

                          <span className="font-black min-w-[14px] text-center">{member.stt}</span>

                          {/* Interactive P1 / P2 Quick Toggle Button - Always visible, 1-click party switch */}
                          {parties.length > 1 && (
                            <button
                              type="button"
                              data-html2canvas-ignore="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentP = member.party || 1;
                                const nextPartyId = currentP === 1 ? 2 : 1;
                                handleQuickSwitchParty(member.id, nextPartyId);
                              }}
                              title={`Thành viên này thuộc ${partyObj.name} • Nhấp để chuyển nhanh sang ${
                                (member.party || 1) === 1 ? 'PT 2' : 'PT 1'
                              }`}
                              className={`inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black tracking-tight transition-all active:scale-90 hover:brightness-110 shadow-2xs border select-none ${
                                (member.party || 1) === 1
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-700'
                                  : (member.party || 1) === 2
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-700'
                              }`}
                            >
                              <span>P{member.party || 1}</span>
                              <ArrowRightLeft className="w-2.5 h-2.5 opacity-80" />
                            </button>
                          )}

                          {/* Mobile quick actions trigger indicator */}
                          <span data-html2canvas-ignore="true" className="sm:hidden text-slate-400">
                            <MoreVertical className="w-3 h-3" />
                          </span>
                        </div>

                        {/* Desktop Hover Row Actions - Floating sleek toolbar above cell, never obscuring STT */}
                        <div
                          data-html2canvas-ignore="true"
                          className={`absolute -top-9 sm:-top-9.5 left-1/2 -translate-x-1/2 hidden sm:group-hover:flex items-center gap-1 px-1.5 py-1 rounded-xl border shadow-lg z-30 print:hidden transition-all duration-150 animate-in fade-in zoom-in-95 before:absolute before:inset-x-0 before:top-full before:h-3 before:content-[''] ${
                            isTableDark
                              ? 'bg-slate-800/98 border-slate-600 text-slate-200 shadow-black/60'
                              : 'bg-white/98 border-slate-300 text-slate-800 shadow-slate-900/15'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveRow(idx, 'up');
                            }}
                            disabled={idx === 0}
                            title="Di chuyển lên trên (STT nhỏ hơn)"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-700/80 dark:hover:bg-indigo-500 text-indigo-600 dark:text-indigo-300 font-bold transition-all active:scale-95 disabled:opacity-25 disabled:hover:bg-slate-100 disabled:hover:text-indigo-600 dark:disabled:hover:bg-slate-700/80 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                          >
                            <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveRow(idx, 'down');
                            }}
                            disabled={idx === members.length - 1}
                            title="Di chuyển xuống dưới (STT lớn hơn)"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-700/80 dark:hover:bg-indigo-500 text-indigo-600 dark:text-indigo-300 font-bold transition-all active:scale-95 disabled:opacity-25 disabled:hover:bg-slate-100 disabled:hover:text-indigo-600 dark:disabled:hover:bg-slate-700/80 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                          >
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </button>

                          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRow(member.id);
                            }}
                            title="Xoá thành viên này khỏi bảng"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/50 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-400 font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="w-4 h-4 stroke-[2.2]" />
                          </button>

                          {/* Pointer triangle pointing down towards the STT cell */}
                          <div
                            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b ${
                              isTableDark
                                ? 'bg-slate-800 border-slate-600'
                                : 'bg-white border-slate-300'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Ingame Column */}
                      <td
                        style={{ textAlign: 'center' }}
                        className={`py-1 sm:py-2 px-1 text-center font-semibold text-xs sm:text-[15px] border-b-[2px] transition-colors ${
                          isTableDark
                            ? 'border-slate-700 text-slate-100'
                            : 'border-black text-slate-900'
                        } ${
                          isIngameDup
                            ? isTableDark
                              ? 'bg-red-950/40 text-red-200'
                              : 'bg-red-50 text-red-900'
                            : ''
                        }`}
                      >
                        <div style={{ textAlign: 'center', width: '100%' }} className="flex items-center justify-center relative w-full text-center">
                          <input
                            type="text"
                            data-column-type="ingame"
                            value={member.ingame}
                            defaultValue={member.ingame}
                            data-text-value={member.ingame || ''}
                            style={{ textAlign: 'center' }}
                            dir="ltr"
                            onChange={(e) =>
                              handleUpdateMember(member.id, { ingame: e.target.value })
                            }
                            placeholder="Ingame..."
                            className={`w-full text-center bg-transparent rounded px-0.5 sm:px-1 py-1 sm:py-0.5 font-semibold text-xs sm:text-[15px] focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                              isIngameDup
                                ? isTableDark
                                  ? 'text-red-200 font-bold placeholder:text-red-400'
                                  : 'text-red-900 font-bold placeholder:text-red-400'
                                : isTableDark
                                ? 'text-slate-100 placeholder:text-slate-500 focus:bg-slate-800'
                                : 'text-slate-900 placeholder:text-slate-400 focus:bg-amber-50'
                            }`}
                          />

                          {isIngameDup && (
                            <span
                              data-html2canvas-ignore="true"
                              title={`Cảnh báo: Trùng tên Ingame với ${ingameDupInfo?.stts
                                .filter((s) => s !== member.stt)
                                .map((s) => `STT #${s}`)
                                .join(', ')}`}
                              className="absolute right-0.5 sm:right-1 text-red-500 hover:text-red-600 cursor-help"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Class Badge Cell with exact background color */}
                      <td
                        className={`py-0.5 sm:py-1 px-0.5 sm:px-1 text-center relative cursor-pointer active:opacity-90 border-l-[2px] border-r-[2px] border-b-[2px] ${
                          isTableDark ? 'border-slate-700' : 'border-black'
                        } ${isClassPickerOpen ? 'z-40' : ''}`}
                        style={{
                          backgroundColor: classMeta.bgColor,
                          color: classMeta.textColor,
                          boxSizing: 'border-box',
                          backgroundClip: 'padding-box',
                        }}
                        onClick={() =>
                          setActiveClassSelectId(
                            isClassPickerOpen ? null : member.id
                          )
                        }
                        title="Chạm để đổi môn phái"
                      >
                        <div className="flex items-center justify-center h-full min-h-[30px] sm:min-h-[34px] font-bold text-xs sm:text-[15px] truncate px-0.5">
                          <span>{member.className}</span>
                        </div>

                        {/* Desktop Class Selection Popover (>= 640px) */}
                        {isClassPickerOpen && (
                          <div
                            id={`class-picker-${member.id}`}
                            data-html2canvas-ignore="true"
                            className={`hidden sm:block absolute left-1/2 -translate-x-1/2 ${
                              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                            } w-56 rounded-xl shadow-2xl p-2 z-50 text-left border ${
                              isTableDark
                                ? 'bg-slate-900 border-slate-700 text-slate-100'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className={`flex items-center justify-between text-[11px] font-bold px-1 pb-1.5 border-b mb-1 ${
                                isTableDark
                                  ? 'border-slate-800 text-slate-400'
                                  : 'border-slate-100 text-slate-500'
                              }`}
                            >
                              <span>Chọn môn phái:</span>
                              {onOpenColorCustomizer && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveClassSelectId(null);
                                    onOpenColorCustomizer();
                                  }}
                                  className="text-purple-600 dark:text-purple-400 hover:underline text-[10px] font-bold flex items-center gap-0.5"
                                >
                                  <Palette className="w-3 h-3" />
                                  <span>Đổi màu</span>
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto pr-0.5">
                              {CLASS_LIST.map((cls) => {
                                const meta = getEffectiveClassMeta(cls, customColors);
                                return (
                                  <button
                                    key={cls}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateMember(member.id, {
                                        className: cls,
                                      });
                                      setActiveClassSelectId(null);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-transform hover:scale-[1.02] ${
                                      member.className === cls
                                        ? 'ring-2 ring-white dark:ring-white shadow-xs'
                                        : ''
                                    }`}
                                    style={{
                                      backgroundColor: meta.bgColor,
                                      color: meta.textColor,
                                    }}
                                  >
                                    <span>{cls}</span>
                                    <span className="text-[10px] opacity-80">
                                      {meta.role}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Logged by Column */}
                      <td
                        style={{ textAlign: 'center' }}
                        className={`py-1 sm:py-2 px-1 text-center font-semibold text-xs sm:text-[15px] border-b-[2px] relative group/log transition-colors ${
                          isTableDark ? 'border-slate-700 text-slate-100' : 'border-black text-slate-900'
                        } ${
                          isLoggedByDup
                            ? isTableDark
                              ? 'bg-amber-950/40 text-amber-200'
                              : 'bg-amber-50 text-amber-900'
                            : ''
                        }`}
                      >
                        <div style={{ textAlign: 'center', width: '100%' }} className="flex items-center justify-center relative w-full text-center">
                          {isLoggedByDup && (
                            <span
                              data-html2canvas-ignore="true"
                              title={`Cảnh báo: Trùng người log "${loggedByDupInfo?.originalName}" đang log cho ${loggedByDupInfo?.count} acc (STT: ${loggedByDupInfo?.stts
                                .map((s) => `#${s}`)
                                .join(', ')})`}
                              className="absolute left-0.5 sm:left-1 text-amber-500 hover:text-amber-600 cursor-help"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                          )}

                          <input
                            type="text"
                            data-column-type="logged-by"
                            value={member.loggedBy}
                            defaultValue={member.loggedBy}
                            data-text-value={member.loggedBy || member.ingame || ''}
                            style={{ textAlign: 'center' }}
                            dir="ltr"
                            onChange={(e) =>
                              handleUpdateMember(member.id, {
                                loggedBy: e.target.value,
                              })
                            }
                            placeholder={member.ingame || 'Log by...'}
                            className={`w-full text-center bg-transparent rounded px-0.5 sm:px-1 py-1 sm:py-0.5 font-semibold text-xs sm:text-[15px] focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                              isLoggedByDup
                                ? isTableDark
                                  ? 'text-amber-200 font-bold placeholder:text-amber-400'
                                  : 'text-amber-900 font-bold placeholder:text-amber-400'
                                : isTableDark
                                ? 'text-slate-100 placeholder:text-slate-500 focus:bg-slate-800'
                                : 'text-slate-900 placeholder:text-slate-400 focus:bg-amber-50'
                            }`}
                          />

                          {/* Quick copy button from Ingame */}
                          {!member.loggedBy && member.ingame && (
                            <button
                              type="button"
                              data-html2canvas-ignore="true"
                              onClick={() => handleCopyIngameToLoggedBy(member.id)}
                              title="Lấy tên Ingame làm Logged by"
                              className={`absolute right-0 hidden sm:group-hover/log:flex p-1 rounded text-[9px] font-bold border ${
                                isTableDark
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                              }`}
                            >
                              = Ingame
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Drop Zone to add new slot at bottom */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={handleBottomDrop}
          className={`w-full py-2 px-3 mt-2 border-2 border-dashed rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none print:hidden ${
            isTableDark
              ? 'border-slate-700 hover:border-indigo-500 bg-slate-900/60 text-slate-400 hover:text-indigo-400'
              : 'border-slate-300 hover:border-indigo-500 bg-slate-50/70 text-slate-500 hover:text-indigo-600'
          }`}
          title="Kéo thả thẻ nhân sự vào đây để tạo vị trí mới"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Kéo thả nhân sự vào đây để thêm vị trí mới (STT #{members.length + 1})</span>
        </div>
      </div>

      {/* Table Footer Controls */}
      <div className="w-full max-w-[620px] flex flex-wrap items-center justify-between gap-2 mt-3 sm:mt-4 px-1">
        <button
          type="button"
          id="btn-add-raid-slot"
          onClick={handleAddRow}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm vị trí ({members.length + 1})</span>
        </button>

        <button
          type="button"
          onClick={() => setShowResetRaidConfirm(true)}
          className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 min-h-[42px]"
        >
          Làm trống bảng
        </button>
      </div>

      {/* Reset / Clear Raid Table Confirmation Modal */}
      {showResetRaidConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-html2canvas-ignore="true"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                Làm trống tên Ingame & Logged by?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Thao tác này sẽ xoá sạch toàn bộ tên Ingame và Logged by của các vị trí trong bảng hiện tại để bạn nhập mới từ đầu.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetRaidConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const clearedMembers = members.map((m) => ({
                      ...m,
                      ingame: '',
                      loggedBy: '',
                    }));
                    onUpdateMembers(clearedMembers);
                    setShowResetRaidConfirm(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors"
                >
                  Đồng ý làm trống
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Mobile-Friendly Class Picker Bottom Sheet / Modal (Screen < 640px) */}
      {activeClassSelectId &&
        activeClassMember &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="class-picker-modal"
            data-html2canvas-ignore="true"
            className="sm:hidden fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 z-[100] animate-in fade-in"
            onClick={() => setActiveClassSelectId(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Chọn môn phái cho {activeClassMember.ingame || `STT ${activeClassMember.stt}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hiện tại: <strong>{activeClassMember.className}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveClassSelectId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-0.5 flex-1">
                {CLASS_LIST.map((cls) => {
                  const meta = getEffectiveClassMeta(cls, customColors);
                  const isCurrent = activeClassMember.className === cls;

                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        handleUpdateMember(activeClassMember.id, { className: cls });
                        setActiveClassSelectId(null);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                        isCurrent ? 'ring-2 ring-slate-900 dark:ring-white shadow-sm' : ''
                      }`}
                      style={{
                        backgroundColor: meta.bgColor,
                        color: meta.textColor,
                      }}
                    >
                      <span>{cls}</span>
                      <span className="text-[10px] opacity-80">{meta.role}</span>
                    </button>
                  );
                })}
              </div>

              {onOpenColorCustomizer && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveClassSelectId(null);
                    onOpenColorCustomizer();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-xl border border-purple-200 dark:border-purple-800"
                >
                  <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Tùy chỉnh đổi màu môn phái</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Mobile-Friendly Row Action Sheet (Triggered when tapping STT on Mobile) */}
      {mobileActionMemberId &&
        activeMobileMember &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-html2canvas-ignore="true"
            className="sm:hidden fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3 z-[100] animate-in fade-in"
            onClick={() => setMobileActionMemberId(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Hành động cho hàng:</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    STT {activeMobileMember.stt} • {activeMobileMember.ingame || 'Chưa đặt tên'} ({activeMobileMember.className})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileActionMemberId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions List */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleMoveRow(activeMobileIndex, 'up');
                      setMobileActionMemberId(null);
                    }}
                    disabled={activeMobileIndex === 0}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl disabled:opacity-40 min-h-[44px]"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>Di chuyển lên</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleMoveRow(activeMobileIndex, 'down');
                      setMobileActionMemberId(null);
                    }}
                    disabled={activeMobileIndex === members.length - 1}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl disabled:opacity-40 min-h-[44px]"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>Di chuyển xuống</span>
                  </button>
                </div>

                {/* Quick Party Switcher */}
                {parties.length > 1 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                      Chuyển sang nhóm:
                    </div>
                    <div className="flex gap-2">
                      {parties.map((p) => {
                        const isCurrent = (activeMobileMember.party || 1) === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              handleQuickSwitchParty(activeMobileMember.id, p.id);
                              setMobileActionMemberId(null);
                            }}
                            className={`flex-1 py-2.5 text-xs font-black rounded-xl border min-h-[42px] transition-all flex items-center justify-center gap-1.5 ${
                              isCurrent
                                ? p.id === 1
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                  : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span>{p.name}</span>
                            {isCurrent && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Change Class */}
                <button
                  type="button"
                  onClick={() => {
                    const targetId = activeMobileMember.id;
                    setMobileActionMemberId(null);
                    setActiveClassSelectId(targetId);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl min-h-[44px]"
                >
                  <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Đổi môn phái ({activeMobileMember.className})</span>
                </button>

                {/* Quick Fill Ingame to Logged By */}
                {activeMobileMember.ingame && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyIngameToLoggedBy(activeMobileMember.id);
                      setMobileActionMemberId(null);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[44px]"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Điền Logged by = Ingame</span>
                  </button>
                )}

                {/* Delete Member */}
                <button
                  type="button"
                  onClick={() => handleDeleteRow(activeMobileMember.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl min-h-[44px] transition-colors border border-red-200 dark:border-red-900/60"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xoá vị trí STT {activeMobileMember.stt}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
