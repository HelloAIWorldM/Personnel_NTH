import React, { useState, useMemo } from 'react';
import { RaidMember, RaidParty, CustomClassColors } from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
import { DuplicateWarningBanner } from './DuplicateWarningBanner';
import { getDuplicateIngameMap, getDuplicateLoggedByMap } from '../utils/duplicates';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  GripVertical,
  Shield,
  Heart,
  Swords,
  ArrowRightLeft,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface PartyManagerProps {
  members: RaidMember[];
  parties: RaidParty[];
  customColors?: CustomClassColors;
  onUpdateMembers: (newMembers: RaidMember[]) => void;
  onUpdateParties: (newParties: RaidParty[]) => void;
}

export const PartyManager: React.FC<PartyManagerProps> = ({
  members,
  parties,
  customColors,
  onUpdateMembers,
  onUpdateParties,
}) => {
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [dragOverPartyId, setDragOverPartyId] = useState<number | null>(null);
  const [dragOverMemberId, setDragOverMemberId] = useState<string | null>(null);
  const [editingPartyId, setEditingPartyId] = useState<number | null>(null);
  const [tempPartyName, setTempPartyName] = useState<string>('');

  // Duplicate Ingame and LoggedBy lookup maps
  const duplicateIngameMap = useMemo(() => getDuplicateIngameMap(members), [members]);
  const duplicateLoggedByMap = useMemo(() => getDuplicateLoggedByMap(members), [members]);

  // Get members belonging to a party
  const getPartyMembers = (partyId: number) => {
    return members.filter((m) => {
      const p = m.party || 1;
      return p === partyId;
    });
  };

  // Add a new party
  const handleAddParty = () => {
    const nextId = parties.length > 0 ? Math.max(...parties.map((p) => p.id)) + 1 : 1;
    const newParty: RaidParty = {
      id: nextId,
      name: `PT ${parties.length + 1}`,
    };
    onUpdateParties([...parties, newParty]);
  };

  // Remove a party
  const handleRemoveParty = (partyId: number) => {
    if (parties.length <= 1) return;
    const remainingParties = parties.filter((p) => p.id !== partyId);
    const fallbackPartyId = remainingParties[0].id;

    // Move all members of removed party to first remaining party
    const updatedMembers = members.map((m) => {
      if ((m.party || 1) === partyId) {
        return { ...m, party: fallbackPartyId };
      }
      return m;
    });

    onUpdateParties(remainingParties);
    onUpdateMembers(updatedMembers);
  };

  // Start editing party name
  const handleStartRename = (party: RaidParty) => {
    setEditingPartyId(party.id);
    setTempPartyName(party.name);
  };

  // Save party name
  const handleSaveRename = (partyId: number) => {
    if (!tempPartyName.trim()) {
      setEditingPartyId(null);
      return;
    }
    const updated = parties.map((p) =>
      p.id === partyId ? { ...p, name: tempPartyName.trim() } : p
    );
    onUpdateParties(updated);
    setEditingPartyId(null);
  };

  // Move member to target party
  const handleMoveMemberToParty = (
    memberId: string,
    targetPartyId: number,
    targetIndexInParty?: number
  ) => {
    const memberIndex = members.findIndex((m) => m.id === memberId);
    if (memberIndex === -1) return;

    const currentMember = members[memberIndex];
    if (currentMember.party === targetPartyId && targetIndexInParty === undefined) {
      return;
    }

    const updatedMember = { ...currentMember, party: targetPartyId };

    const remainingMembers = members.filter((m) => m.id !== memberId);

    if (targetIndexInParty !== undefined) {
      const targetPartyMembers = remainingMembers.filter(
        (m) => (m.party || 1) === targetPartyId
      );
      const referenceMember = targetPartyMembers[targetIndexInParty];

      if (referenceMember) {
        const insertGlobalIndex = remainingMembers.findIndex(
          (m) => m.id === referenceMember.id
        );
        remainingMembers.splice(insertGlobalIndex, 0, updatedMember);
      } else {
        remainingMembers.push(updatedMember);
      }
    } else {
      const lastMemberOfParty = [...remainingMembers]
        .reverse()
        .find((m) => (m.party || 1) === targetPartyId);

      if (lastMemberOfParty) {
        const lastIndex = remainingMembers.findIndex(
          (m) => m.id === lastMemberOfParty.id
        );
        remainingMembers.splice(lastIndex + 1, 0, updatedMember);
      } else {
        remainingMembers.push(updatedMember);
      }
    }

    // Recalculate STT
    const reindexed = remainingMembers.map((m, idx) => ({ ...m, stt: idx + 1 }));
    onUpdateMembers(reindexed);
  };

  // Reorder member inside party (up / down) - mobile friendly
  const handleMoveMemberInsideParty = (memberId: string, direction: 'up' | 'down') => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const partyId = member.party || 1;
    const partyMembers = getPartyMembers(partyId);
    const indexInParty = partyMembers.findIndex((m) => m.id === memberId);

    const targetIndexInParty = direction === 'up' ? indexInParty - 1 : indexInParty + 1;
    if (targetIndexInParty < 0 || targetIndexInParty >= partyMembers.length) return;

    handleMoveMemberToParty(memberId, partyId, targetIndexInParty);
  };

  // Auto split into 2 parties (6 vs 6)
  const handleAutoSplitTwoParties = () => {
    let currentParties = [...parties];
    if (currentParties.length < 2) {
      currentParties = [
        { id: 1, name: 'PT 1' },
        { id: 2, name: 'PT 2' },
      ];
      onUpdateParties(currentParties);
    }

    const half = Math.ceil(members.length / 2);
    const updated = members.map((m, idx) => ({
      ...m,
      party: idx < half ? currentParties[0].id : currentParties[1].id,
    }));
    onUpdateMembers(updated);
  };

  // Smart Role Balancing between parties
  const handleAutoBalanceRoles = () => {
    let currentParties = [...parties];
    if (currentParties.length < 2) {
      currentParties = [
        { id: 1, name: 'PT 1' },
        { id: 2, name: 'PT 2' },
      ];
      onUpdateParties(currentParties);
    }

    const tanks: RaidMember[] = [];
    const healers: RaidMember[] = [];
    const dps: RaidMember[] = [];

    members.forEach((m) => {
      const meta = getEffectiveClassMeta(m.className, customColors);
      if (meta.role === 'Tank') tanks.push(m);
      else if (meta.role === 'Healer') healers.push(m);
      else dps.push(m);
    });

    const partyBuckets: Record<number, RaidMember[]> = {};
    currentParties.forEach((p) => {
      partyBuckets[p.id] = [];
    });

    // Distribute Tanks round-robin
    tanks.forEach((tank, idx) => {
      const targetParty = currentParties[idx % currentParties.length].id;
      partyBuckets[targetParty].push({ ...tank, party: targetParty });
    });

    // Distribute Healers round-robin
    healers.forEach((healer, idx) => {
      const targetParty =
        currentParties[(idx + tanks.length) % currentParties.length].id;
      partyBuckets[targetParty].push({ ...healer, party: targetParty });
    });

    // Distribute DPS to balance size
    dps.forEach((d) => {
      let minPartyId = currentParties[0].id;
      let minCount = partyBuckets[minPartyId].length;

      currentParties.forEach((p) => {
        if (partyBuckets[p.id].length < minCount) {
          minPartyId = p.id;
          minCount = partyBuckets[p.id].length;
        }
      });

      partyBuckets[minPartyId].push({ ...d, party: minPartyId });
    });

    // Flatten and re-index
    const balanced: RaidMember[] = [];
    currentParties.forEach((p) => {
      balanced.push(...partyBuckets[p.id]);
    });

    const reindexed = balanced.map((m, idx) => ({ ...m, stt: idx + 1 }));
    onUpdateMembers(reindexed);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.setData('text/plain', memberId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedMemberId(memberId);
  };

  const handleDragEnd = () => {
    setDraggedMemberId(null);
    setDragOverPartyId(null);
    setDragOverMemberId(null);
  };

  const handlePartyDragOver = (e: React.DragEvent, partyId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPartyId !== partyId) {
      setDragOverPartyId(partyId);
    }
  };

  const handlePartyDrop = (e: React.DragEvent, targetPartyId: number) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('text/plain') || draggedMemberId;
    if (memberId) {
      handleMoveMemberToParty(memberId, targetPartyId);
    }
    setDraggedMemberId(null);
    setDragOverPartyId(null);
    setDragOverMemberId(null);
  };

  const handleMemberDrop = (
    e: React.DragEvent,
    targetMemberId: string,
    targetPartyId: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const memberId = e.dataTransfer.getData('text/plain') || draggedMemberId;
    if (!memberId || memberId === targetMemberId) {
      setDraggedMemberId(null);
      setDragOverPartyId(null);
      setDragOverMemberId(null);
      return;
    }

    const partyMembers = getPartyMembers(targetPartyId);
    const targetIndexInParty = partyMembers.findIndex((m) => m.id === targetMemberId);

    handleMoveMemberToParty(memberId, targetPartyId, targetIndexInParty);

    setDraggedMemberId(null);
    setDragOverPartyId(null);
    setDragOverMemberId(null);
  };

  const handleQuickChangeParty = (memberId: string, targetPartyId: number) => {
    handleMoveMemberToParty(memberId, targetPartyId);
  };

  return (
    <div className="w-full">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Phân Bổ Nhóm Đội Hình ({parties.length} nhóm PT)</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Kéo thả hoặc dùng nút mũi tên / menu chọn để đổi nhóm và cân bằng vai trò
          </p>
        </div>

        {/* Action Buttons: Responsive Grid on Mobile */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button
            type="button"
            id="btn-split-two-parties"
            onClick={handleAutoSplitTwoParties}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xs transition-colors min-h-[40px]"
            title="Tự động chia đôi danh sách thành 2 nhóm 6/6"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Chia đều 2 PT</span>
          </button>

          <button
            type="button"
            id="btn-balance-roles"
            onClick={handleAutoBalanceRoles}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xs transition-colors min-h-[40px]"
            title="Tự động cân bằng Tank và Healer giữa các nhóm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Cân bằng Tank/Heal</span>
          </button>

          <button
            type="button"
            id="btn-add-party"
            onClick={handleAddParty}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-xs transition-colors min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm nhóm PT</span>
          </button>
        </div>
      </div>

      {/* Duplicate Warning Banner */}
      <DuplicateWarningBanner members={members} />

      {/* Grid of Party Columns */}
      <div
        className={`grid grid-cols-1 ${
          parties.length === 2 ? 'md:grid-cols-2' : parties.length >= 3 ? 'md:grid-cols-3' : ''
        } gap-4`}
      >
        {parties.map((party, pIndex) => {
          const partyMembers = getPartyMembers(party.id);
          const isDragOver = dragOverPartyId === party.id;

          let tankCount = 0;
          let healCount = 0;
          let dpsCount = 0;

          partyMembers.forEach((m) => {
            const meta = getEffectiveClassMeta(m.className, customColors);
            if (meta.role === 'Tank') tankCount++;
            else if (meta.role === 'Healer') healCount++;
            else dpsCount++;
          });

          return (
            <div
              key={party.id}
              onDragOver={(e) => handlePartyDragOver(e, party.id)}
              onDragLeave={() => setDragOverPartyId(null)}
              onDrop={(e) => handlePartyDrop(e, party.id)}
              className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-xs ${
                isDragOver
                  ? 'border-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/30'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {/* Party Header */}
              <div className="p-3 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {pIndex + 1}
                  </span>

                  {editingPartyId === party.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={tempPartyName}
                        onChange={(e) => setTempPartyName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(party.id);
                          if (e.key === 'Escape') setEditingPartyId(null);
                        }}
                        autoFocus
                        className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-indigo-400 focus:outline-none w-28"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(party.id)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 min-h-[32px] min-w-[32px] flex items-center justify-center"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPartyId(null)}
                        className="p-1 text-slate-400 hover:text-slate-200 min-h-[32px] min-w-[32px] flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <h4 className="font-black text-sm text-white truncate">
                        {party.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleStartRename(party)}
                        title="Đổi tên nhóm"
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-xs font-bold">
                    {partyMembers.length} người
                  </span>

                  {parties.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParty(party.id)}
                      title="Xoá nhóm này"
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Role Balance Summary Bar */}
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1" title="Số lượng Tank">
                    <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{tankCount} Tank</span>
                  </span>
                  <span className="flex items-center gap-1" title="Số lượng Healer">
                    <Heart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{healCount} Heal</span>
                  </span>
                  <span className="flex items-center gap-1" title="Số lượng DPS">
                    <Swords className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{dpsCount} DPS</span>
                  </span>
                </div>

                {healCount === 0 && partyMembers.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/80">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>Thiếu Healer</span>
                  </span>
                )}
              </div>

              {/* Members List (Droppable Target) */}
              <div className="p-2 flex-1 min-h-[200px] sm:min-h-[260px] space-y-2">
                {partyMembers.length === 0 ? (
                  <div className="h-full min-h-[160px] sm:min-h-[220px] flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700/80 rounded-xl text-center text-slate-400 dark:text-slate-500">
                    <Users className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Chưa có thành viên nào
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Kéo thả hoặc chuyển người chơi từ nhóm khác vào đây
                    </span>
                  </div>
                ) : (
                  partyMembers.map((member, idxInParty) => {
                    const classMeta = getEffectiveClassMeta(member.className, customColors);
                    const isBeingDragged = draggedMemberId === member.id;
                    const isDragOverThis = dragOverMemberId === member.id;

                    const isIngameDup = duplicateIngameMap.has(member.id);
                    const ingameDupInfo = duplicateIngameMap.get(member.id);
                    const isLoggedByDup = duplicateLoggedByMap.has(member.id);
                    const loggedByDupInfo = duplicateLoggedByMap.get(member.id);

                    return (
                      <div
                        key={member.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, member.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverMemberId !== member.id) {
                            setDragOverMemberId(member.id);
                          }
                        }}
                        onDragLeave={() => setDragOverMemberId(null)}
                        onDrop={(e) => handleMemberDrop(e, member.id, party.id)}
                        className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isBeingDragged
                            ? 'opacity-40 border-indigo-400 shadow-md scale-95'
                            : isDragOverThis
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-md scale-[1.02]'
                            : isIngameDup || isLoggedByDup
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 hover:shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          {/* Desktop Drag Handle */}
                          <div className="text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors cursor-grab hidden sm:block">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Mobile Reorder Arrows (▲ / ▼) */}
                          <div className="flex flex-col sm:hidden shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveMemberInsideParty(member.id, 'up')}
                              disabled={idxInParty === 0}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20"
                              title="Lên trên"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveMemberInsideParty(member.id, 'down')}
                              disabled={idxInParty === partyMembers.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20"
                              title="Xuống dưới"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* STT badge */}
                          <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0">
                            {member.stt}
                          </span>

                          {/* Ingame & Logged by */}
                          <div className="min-w-0 pr-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[140px]">
                                {member.ingame || 'Chưa đặt tên'}
                              </span>
                              {isIngameDup && (
                                <span
                                  title={`Cảnh báo: Trùng tên Ingame với ${ingameDupInfo?.stts
                                    .filter((s) => s !== member.stt)
                                    .map((s) => `STT #${s}`)
                                    .join(', ')}`}
                                  className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-black bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>Trùng Ingame</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate max-w-[110px]">
                                {member.loggedBy ? `by: ${member.loggedBy}` : 'Tự log'}
                              </span>
                              {isLoggedByDup && (
                                <span
                                  title={`Cảnh báo: Trùng người log "${loggedByDupInfo?.originalName}" đang log ${loggedByDupInfo?.count} acc (STT: ${loggedByDupInfo?.stts
                                    .map((s) => `#${s}`)
                                    .join(', ')})`}
                                  className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60"
                                >
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  <span>Log {loggedByDupInfo?.count} acc</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Class Badge & Quick Party Move Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-bold shadow-2xs truncate max-w-[80px]"
                            style={{
                              backgroundColor: classMeta.bgColor,
                              color: classMeta.textColor,
                            }}
                          >
                            {member.className}
                          </span>

                          {/* Quick Change Party Dropdown / Selector */}
                          {parties.length > 1 && (
                            <select
                              value={party.id}
                              onChange={(e) =>
                                handleQuickChangeParty(
                                  member.id,
                                  parseInt(e.target.value, 10)
                                )
                              }
                              title="Chuyển sang nhóm khác"
                              className="text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 cursor-pointer focus:outline-none min-h-[36px]"
                            >
                              {parties.map((p) => (
                                <option key={p.id} value={p.id} className="dark:bg-slate-800 dark:text-slate-100">
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Drop Zone Hint */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                Thả hoặc chọn chuyển người chơi vào {party.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
