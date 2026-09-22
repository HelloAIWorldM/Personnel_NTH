import React, { useState } from 'react';
import { RaidMember, RaidParty, CustomClassColors } from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
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

    const memberToMove = { ...members[memberIndex], party: targetPartyId };
    const remaining = members.filter((m) => m.id !== memberId);

    if (typeof targetIndexInParty === 'number' && targetIndexInParty >= 0) {
      const targetPartyMembers = remaining.filter((m) => (m.party || 1) === targetPartyId);
      let globalInsertIndex = remaining.length;

      if (targetIndexInParty < targetPartyMembers.length) {
        const referenceMember = targetPartyMembers[targetIndexInParty];
        globalInsertIndex = remaining.findIndex((m) => m.id === referenceMember.id);
      }

      remaining.splice(globalInsertIndex, 0, memberToMove);
    } else {
      const lastIndexOfParty = remaining.reduce(
        (lastIdx, m, idx) => ((m.party || 1) === targetPartyId ? idx : lastIdx),
        -1
      );
      if (lastIndexOfParty !== -1) {
        remaining.splice(lastIndexOfParty + 1, 0, memberToMove);
      } else {
        remaining.push(memberToMove);
      }
    }

    const reindexed = remaining.map((m, idx) => ({ ...m, stt: idx + 1 }));
    onUpdateMembers(reindexed);
  };

  // Move member up/down inside the same party (Mobile friendly)
  const handleMoveMemberInsideParty = (memberId: string, direction: 'up' | 'down') => {
    const currentMember = members.find((m) => m.id === memberId);
    if (!currentMember) return;
    const currentPartyId = currentMember.party || 1;
    const partyMembers = getPartyMembers(currentPartyId);
    const indexInParty = partyMembers.findIndex((m) => m.id === memberId);
    if (indexInParty === -1) return;

    const targetIndexInParty = direction === 'up' ? indexInParty - 1 : indexInParty + 1;
    if (targetIndexInParty < 0 || targetIndexInParty >= partyMembers.length) return;

    handleMoveMemberToParty(memberId, currentPartyId, targetIndexInParty);
  };

  // Auto split 2 parties (6 / 6)
  const handleAutoSplitTwoParties = () => {
    let pList = [...parties];
    if (pList.length < 2) {
      pList = [
        { id: 1, name: 'PT 1' },
        { id: 2, name: 'PT 2' },
      ];
      onUpdateParties(pList);
    }

    const half = Math.ceil(members.length / 2);
    const updated = members.map((m, idx) => ({
      ...m,
      party: idx < half ? pList[0].id : pList[1].id,
      stt: idx + 1,
    }));
    onUpdateMembers(updated);
  };

  // Auto balance roles across parties (Tanks & Healers evenly split)
  const handleAutoBalanceRoles = () => {
    if (parties.length < 2) return;

    const tanks: RaidMember[] = [];
    const healers: RaidMember[] = [];
    const dpsList: RaidMember[] = [];

    members.forEach((m) => {
      const meta = getEffectiveClassMeta(m.className, customColors);
      if (meta.role === 'Tank') tanks.push(m);
      else if (meta.role === 'Healer') healers.push(m);
      else dpsList.push(m);
    });

    const partyBuckets: RaidMember[][] = parties.map(() => []);

    // Round-robin distribute Tanks
    tanks.forEach((tank, idx) => {
      const targetPartyIndex = idx % parties.length;
      partyBuckets[targetPartyIndex].push({
        ...tank,
        party: parties[targetPartyIndex].id,
      });
    });

    // Round-robin distribute Healers
    healers.forEach((healer, idx) => {
      const targetPartyIndex = idx % parties.length;
      partyBuckets[targetPartyIndex].push({
        ...healer,
        party: parties[targetPartyIndex].id,
      });
    });

    // Distribute DPS to keep party sizes as equal as possible
    dpsList.forEach((dps) => {
      let minPartyIndex = 0;
      let minCount = partyBuckets[0].length;
      for (let i = 1; i < partyBuckets.length; i++) {
        if (partyBuckets[i].length < minCount) {
          minCount = partyBuckets[i].length;
          minPartyIndex = i;
        }
      }
      partyBuckets[minPartyIndex].push({
        ...dps,
        party: parties[minPartyIndex].id,
      });
    });

    const flat = partyBuckets.flat();
    const reindexed = flat.map((m, idx) => ({ ...m, stt: idx + 1 }));
    onUpdateMembers(reindexed);
  };

  // Drag handlers
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Phân Bổ Nhóm Đội Hình ({parties.length} nhóm PT)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Kéo thả hoặc dùng nút mũi tên / menu chọn để đổi nhóm và cân bằng vai trò
          </p>
        </div>

        {/* Action Buttons: Responsive Grid on Mobile */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button
            type="button"
            id="btn-split-two-parties"
            onClick={handleAutoSplitTwoParties}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl shadow-2xs transition-colors min-h-[40px]"
            title="Tự động chia đôi danh sách thành 2 nhóm 6/6"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Chia đều 2 PT</span>
          </button>

          <button
            type="button"
            id="btn-balance-roles"
            onClick={handleAutoBalanceRoles}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl shadow-2xs transition-colors min-h-[40px]"
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
              className={`flex flex-col bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-xs ${
                isDragOver
                  ? 'border-indigo-500 ring-4 ring-indigo-100 bg-indigo-50/20'
                  : 'border-slate-300'
              }`}
            >
              {/* Party Header */}
              <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
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
              <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1" title="Số lượng Tank">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>{tankCount} Tank</span>
                  </span>
                  <span className="flex items-center gap-1" title="Số lượng Healer">
                    <Heart className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{healCount} Heal</span>
                  </span>
                  <span className="flex items-center gap-1" title="Số lượng DPS">
                    <Swords className="w-3.5 h-3.5 text-blue-600" />
                    <span>{dpsCount} DPS</span>
                  </span>
                </div>

                {healCount === 0 && partyMembers.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>Thiếu Healer</span>
                  </span>
                )}
              </div>

              {/* Members List (Droppable Target) */}
              <div className="p-2 flex-1 min-h-[200px] sm:min-h-[260px] space-y-2">
                {partyMembers.length === 0 ? (
                  <div className="h-full min-h-[160px] sm:min-h-[220px] flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                    <Users className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300 mb-2" />
                    <span className="text-xs font-semibold text-slate-500">
                      Chưa có thành viên nào
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Kéo thả hoặc chuyển người chơi từ nhóm khác vào đây
                    </span>
                  </div>
                ) : (
                  partyMembers.map((member, idxInParty) => {
                    const classMeta = getEffectiveClassMeta(member.className, customColors);
                    const isBeingDragged = draggedMemberId === member.id;
                    const isDragOverThis = dragOverMemberId === member.id;

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
                        className={`group relative flex items-center justify-between p-2 rounded-xl border bg-white transition-all ${
                          isBeingDragged
                            ? 'opacity-40 border-indigo-400 shadow-md scale-95'
                            : isDragOverThis
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-md scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          {/* Desktop Drag Handle */}
                          <div className="text-slate-300 group-hover:text-slate-600 transition-colors cursor-grab hidden sm:block">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Mobile Reorder Arrows (▲ / ▼) */}
                          <div className="flex flex-col sm:hidden shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveMemberInsideParty(member.id, 'up')}
                              disabled={idxInParty === 0}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                              title="Lên trên"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveMemberInsideParty(member.id, 'down')}
                              disabled={idxInParty === partyMembers.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                              title="Xuống dưới"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* STT badge */}
                          <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                            {member.stt}
                          </span>

                          {/* Ingame & Logged by */}
                          <div className="min-w-0 pr-1">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {member.ingame || 'Chưa đặt tên'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {member.loggedBy ? `by: ${member.loggedBy}` : 'Tự log'}
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
                              className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg px-2 py-1 cursor-pointer focus:outline-none min-h-[36px]"
                            >
                              {parties.map((p) => (
                                <option key={p.id} value={p.id}>
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
              <div className="p-2 border-t border-slate-100 text-center text-[10px] text-slate-400 bg-slate-50/50">
                Thả hoặc chọn chuyển người chơi vào {party.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
