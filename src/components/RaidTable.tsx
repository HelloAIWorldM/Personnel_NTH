import React, { useState, useEffect } from 'react';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, RaidClass, RaidMember, RaidParty } from '../types';
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
  X,
  ArrowUpDown,
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
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempPrefix, setTempPrefix] = useState(titlePrefix);
  const [tempSchedule, setTempSchedule] = useState(scheduleTime);
  const [tempBoss, setTempBoss] = useState(bossName);
  const [activeClassSelectId, setActiveClassSelectId] = useState<string | null>(null);

  // Toggle showing party section dividers inside the table
  const [showPartyDividers, setShowPartyDividers] = useState(false);

  // Drag and drop state for table rows
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [dragOverMemberId, setDragOverMemberId] = useState<string | null>(null);

  // Mobile row actions modal state
  const [mobileActionMemberId, setMobileActionMemberId] = useState<string | null>(null);

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
    e.dataTransfer.effectAllowed = 'move';
    setDraggedMemberId(id);
  };

  const handleRowDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverMemberId !== id) {
      setDragOverMemberId(id);
    }
  };

  const handleRowDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedMemberId;
    if (!sourceId || sourceId === targetId) {
      setDraggedMemberId(null);
      setDragOverMemberId(null);
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

    setDraggedMemberId(null);
    setDragOverMemberId(null);
  };

  const handleQuickSwitchParty = (memberId: string, partyId: number) => {
    handleUpdateMember(memberId, { party: partyId });
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
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors border border-slate-300"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Tiêu đề</span>
          </button>

          <button
            type="button"
            id="btn-fill-all-loggedby"
            onClick={handleCopyAllIngameToLoggedBy}
            title="Tự động điền Logged by = Ingame cho các ô còn trống"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors border border-slate-300"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Điền nhanh Logged by</span>
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
                ? 'bg-indigo-600 text-white border-indigo-700'
                : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showPartyDividers ? 'Ẩn chia PT' : 'Hiện chia PT'}</span>
          </button>

          {onOpenColorCustomizer && (
            <button
              type="button"
              id="btn-open-color-customizer-table"
              onClick={onOpenColorCustomizer}
              title="Đổi màu cho môn phái bất kỳ"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 font-semibold rounded-lg transition-colors border border-purple-200"
            >
              <Palette className="w-3.5 h-3.5 text-purple-600" />
              <span>Đổi màu</span>
            </button>
          )}
        </div>

        <span className="text-slate-500 font-medium hidden sm:inline text-[11px]">
          Kéo thả hàng để đổi vị trí • Chạm ô để sửa
        </span>
      </div>

      {/* Title Edit Form Popover/Banner */}
      {editingTitle && (
        <div
          id="title-edit-panel"
          className="w-full max-w-[620px] bg-amber-50/90 border border-amber-300 rounded-xl p-3 sm:p-3.5 mb-4 shadow-sm"
        >
          <div className="font-bold text-amber-900 text-xs uppercase mb-2">
            Chỉnh sửa tiêu đề Raid
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tên Raid (ví dụ: RAID 1)
              </label>
              <input
                type="text"
                value={tempPrefix}
                onChange={(e) => setTempPrefix(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="RAID 1"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-red-600 mb-1">
                Lịch Raid (màu đỏ)
              </label>
              <input
                type="text"
                value={tempSchedule}
                onChange={(e) => setTempSchedule(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-bold text-red-600 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="MON 20:30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tên Boss / Ải Raid
              </label>
              <input
                type="text"
                value={tempBoss}
                onChange={(e) => setTempBoss(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="NIÊN DU"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={() => setEditingTitle(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg min-h-[36px]"
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

      {/* Responsive Horizontal Scroll Wrapper for Table */}
      <div className="w-full max-w-[620px] overflow-x-auto pb-1">
        {/* The Visual Raid Table (Replicating Image) */}
        <div
          ref={tableRef}
          id="raid-capture-canvas"
          className="w-full min-w-[320px] max-w-[620px] bg-white border-[2px] border-black select-none shadow-md relative"
          style={{ fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
        >
          {/* Banner Title */}
          <div
            id="raid-table-title"
            className="w-full border-b-[2px] border-black py-2 sm:py-2.5 px-2 sm:px-3 text-center bg-white"
          >
            <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-slate-950 uppercase leading-snug">
              {titlePrefix || 'RAID 1'} -{' '}
              <span className="text-[#e50000] font-black">
                {scheduleTime || 'MON 20:30'}
              </span>{' '}
              {bossName || 'NIÊN DU'}
            </h2>
          </div>

          {/* Table Content */}
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b-[2px] border-black bg-white">
                <th className="w-[14%] sm:w-[14%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-black text-slate-900 border-r-[2px] border-black uppercase text-xs sm:text-sm md:text-base">
                  STT
                </th>
                <th className="w-[31%] sm:w-[32%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-black text-slate-900 border-r-[2px] border-black text-xs sm:text-sm md:text-base">
                  Ingame
                </th>
                <th className="w-[27%] sm:w-[27%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-black text-slate-900 border-r-[2px] border-black text-xs sm:text-sm md:text-base">
                  Class
                </th>
                <th className="w-[28%] sm:w-[27%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-black text-slate-900 text-xs sm:text-sm md:text-base">
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
                      <tr className="bg-slate-100 border-b-[2px] border-black">
                        <td
                          colSpan={4}
                          className="py-1 px-2 sm:px-3 text-left font-black text-[11px] sm:text-xs uppercase tracking-wider text-slate-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-indigo-900 font-black">
                              <span>🛡️ {partyObj.name}</span>
                              <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                                ({membersInThisParty.length})
                              </span>
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 sm:gap-2">
                              <span className="flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600" />
                                {pTanks}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                                {pHealers}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Swords className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600" />
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
                      style={{ zIndex: isClassPickerOpen ? 40 : 1 }}
                      className={`border-b-[1.5px] border-black transition-colors group relative cursor-default ${
                        idx === members.length - 1 ? 'border-b-0' : ''
                      } ${isFilteredOut ? 'opacity-30' : 'hover:bg-slate-50'} ${
                        isDragging ? 'opacity-30 bg-indigo-50' : ''
                      } ${isDragOver ? 'border-t-2 border-t-indigo-600 bg-indigo-50/50' : ''}`}
                    >
                      {/* STT Column */}
                      <td
                        className="py-1.5 sm:py-2 px-1 text-center font-black text-slate-900 border-r-[2px] border-black text-xs sm:text-base relative cursor-pointer sm:cursor-default"
                        onClick={() => {
                          // Tap STT opens mobile row action sheet on touch devices
                          setMobileActionMemberId(member.id);
                        }}
                        title="Chạm để mở menu hành động cho thành viên này"
                      >
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          {/* Desktop Drag Handle */}
                          <span
                            className="cursor-grab text-slate-300 group-hover:text-slate-500 hidden sm:inline"
                            title="Kéo thả hàng để đổi vị trí"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>

                          <span>{member.stt}</span>

                          {/* Mobile quick actions trigger indicator */}
                          <span className="sm:hidden text-slate-400">
                            <MoreVertical className="w-3 h-3" />
                          </span>

                          {/* Desktop PT badge when not in divider mode */}
                          {!showPartyDividers && parties.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextPartyId =
                                  ((member.party || 1) % parties.length) + 1;
                                handleQuickSwitchParty(member.id, nextPartyId);
                              }}
                              title={`Thuộc ${partyObj.name} - Click để đổi nhóm`}
                              className="hidden sm:inline-block text-[9px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-1 rounded ml-0.5 print:hidden"
                            >
                              P{member.party || 1}
                            </button>
                          )}
                        </div>

                        {/* Desktop Hover Row Actions */}
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center gap-0.5 bg-white/95 rounded border border-slate-300 shadow-sm p-0.5 z-10 print:hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveRow(idx, 'up');
                            }}
                            disabled={idx === 0}
                            title="Di chuyển lên"
                            className="p-0.5 text-slate-600 hover:text-black disabled:opacity-20"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveRow(idx, 'down');
                            }}
                            disabled={idx === members.length - 1}
                            title="Di chuyển xuống"
                            className="p-0.5 text-slate-600 hover:text-black disabled:opacity-20"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRow(member.id);
                            }}
                            title="Xoá thành viên này"
                            className="p-0.5 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Ingame Column */}
                      <td className="py-1 sm:py-2 px-1 text-center border-r-[2px] border-black text-slate-900 font-semibold text-xs sm:text-[15px]">
                        <input
                          type="text"
                          value={member.ingame}
                          onChange={(e) =>
                            handleUpdateMember(member.id, { ingame: e.target.value })
                          }
                          placeholder="Ingame..."
                          className="w-full text-center bg-transparent focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-0.5 sm:px-1 py-1 sm:py-0.5 font-semibold text-slate-900 text-xs sm:text-[15px]"
                        />
                      </td>

                      {/* Class Badge Cell with exact background color */}
                      <td
                        className={`py-0.5 sm:py-1 px-0.5 sm:px-1 text-center border-r-[2px] border-black relative cursor-pointer active:opacity-90 ${
                          isClassPickerOpen ? 'z-40' : ''
                        }`}
                        style={{
                          backgroundColor: classMeta.bgColor,
                          color: classMeta.textColor,
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
                            } w-56 bg-white rounded-xl shadow-2xl border border-slate-300 p-2 z-50 text-left`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1 pb-1.5 border-b border-slate-100 mb-1">
                              <span>Chọn môn phái:</span>
                              {onOpenColorCustomizer && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveClassSelectId(null);
                                    onOpenColorCustomizer();
                                  }}
                                  className="text-purple-600 hover:text-purple-800 text-[10px] font-bold flex items-center gap-0.5"
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
                                        ? 'ring-2 ring-slate-900 shadow-xs'
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
                      <td className="py-1 sm:py-2 px-1 text-center text-slate-900 font-semibold text-xs sm:text-[15px] relative group/log">
                        <div className="flex items-center justify-center relative">
                          <input
                            type="text"
                            value={member.loggedBy}
                            onChange={(e) =>
                              handleUpdateMember(member.id, {
                                loggedBy: e.target.value,
                              })
                            }
                            placeholder={member.ingame || 'Log by...'}
                            className="w-full text-center bg-transparent focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-0.5 sm:px-1 py-1 sm:py-0.5 font-semibold text-slate-900 text-xs sm:text-[15px]"
                          />

                          {/* Quick copy button from Ingame */}
                          {!member.loggedBy && member.ingame && (
                            <button
                              type="button"
                              onClick={() => handleCopyIngameToLoggedBy(member.id)}
                              title="Lấy tên Ingame làm Logged by"
                              className="absolute right-0 hidden sm:group-hover/log:flex p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-bold border border-slate-300"
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
      </div>

      {/* Table Footer Controls */}
      <div className="w-full max-w-[620px] flex flex-wrap items-center justify-between gap-2 mt-3 sm:mt-4 px-1">
        <button
          type="button"
          id="btn-add-raid-slot"
          onClick={handleAddRow}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm vị trí ({members.length + 1})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm('Bạn có muốn khôi phục về danh sách mẫu 12 người như trong ảnh không?')) {
              import('../constants/classes').then((mod) => {
                onUpdateMembers(mod.INITIAL_MEMBERS_FROM_IMAGE);
                onUpdateTitle('RAID 1', 'MON 20:30', 'NIÊN DU');
              });
            }
          }}
          className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 min-h-[42px]"
        >
          Mẫu như ảnh gốc
        </button>
      </div>

      {/* Mobile-Friendly Class Picker Bottom Sheet / Modal (Screen < 640px) */}
      {activeClassSelectId && activeClassMember && (
        <div
          id="class-picker-modal"
          data-html2canvas-ignore="true"
          className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 z-50 animate-in fade-in"
          onClick={() => setActiveClassSelectId(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chọn môn phái cho {activeClassMember.ingame || `STT ${activeClassMember.stt}`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Hiện tại: <strong>{activeClassMember.className}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveClassSelectId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
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
                      isCurrent ? 'ring-2 ring-slate-900 shadow-sm' : ''
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
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200"
              >
                <Palette className="w-4 h-4 text-purple-600" />
                <span>Tùy chỉnh đổi màu môn phái</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile-Friendly Row Action Sheet (Triggered when tapping STT on Mobile) */}
      {mobileActionMemberId && activeMobileMember && (
        <div
          data-html2canvas-ignore="true"
          className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3 z-50 animate-in fade-in"
          onClick={() => setMobileActionMemberId(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-500">Hành động cho hàng:</span>
                <h4 className="text-sm font-black text-slate-900">
                  STT {activeMobileMember.stt} • {activeMobileMember.ingame || 'Chưa đặt tên'} ({activeMobileMember.className})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setMobileActionMemberId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
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
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl disabled:opacity-40 min-h-[44px]"
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
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl disabled:opacity-40 min-h-[44px]"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Di chuyển xuống</span>
                </button>
              </div>

              {/* Quick Party Switcher */}
              {parties.length > 1 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Chuyển sang nhóm:
                  </div>
                  <div className="flex gap-2">
                    {parties.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          handleQuickSwitchParty(activeMobileMember.id, p.id);
                          setMobileActionMemberId(null);
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border min-h-[42px] transition-all ${
                          (activeMobileMember.party || 1) === p.id
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
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
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[44px]"
              >
                <Palette className="w-4 h-4 text-purple-600" />
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
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  <Copy className="w-4 h-4" />
                  <span>Điền Logged by = Ingame</span>
                </button>
              )}

              {/* Delete Member */}
              <button
                type="button"
                onClick={() => handleDeleteRow(activeMobileMember.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl min-h-[44px] transition-colors border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xoá vị trí STT {activeMobileMember.stt}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
