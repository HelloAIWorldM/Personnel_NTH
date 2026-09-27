import React, { useState } from 'react';
import {
  GuildMember,
  GuildTeam,
  CustomClassColors,
  RaidClass,
} from '../../types';
import { getEffectiveClassMeta, CLASS_LIST } from '../../constants/classes';
import {
  Copy,
  Check,
  ChevronDown,
  X,
  Users,
  Sparkles,
  GripVertical,
} from 'lucide-react';

interface GuildTeamsTabProps {
  members: GuildMember[];
  customColors?: CustomClassColors;
  onUpdateMember: (id: string, updates: Partial<GuildMember>) => void;
}

interface TeamConfig {
  id: GuildTeam;
  displayTitle: string;
  subTitle: string;
}

const EXCEL_TEAMS: TeamConfig[] = [
  {
    id: 'Cơ động',
    displayTitle: 'TEAM FLEX',
    subTitle: 'Đột kích cánh, săn pháo & cơ động phản ứng nhanh',
  },
  {
    id: 'Mid',
    displayTitle: 'TEAM MID',
    subTitle: 'Trục giao tranh trung tâm & khống chế diện rộng',
  },
  {
    id: 'Đẩy trụ',
    displayTitle: 'TEAM ĐẨY TRỤ',
    subTitle: 'Công thủ cứ điểm & phá hủy tháp canh',
  },
];

interface DragPayload {
  memberId: string;
  sourceTeam?: GuildTeam;
  sourceParty?: number;
  sourceSlot?: number;
}

export const GuildTeamsTab: React.FC<GuildTeamsTabProps> = ({
  members,
  customColors,
  onUpdateMember,
}) => {
  const [copied, setCopied] = useState(false);
  const [draggedPayload, setDraggedPayload] = useState<DragPayload | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  // Normalize string helper
  const normalize = (str: string) => str.trim().toLowerCase();

  // Helper to map members of a team into a 3 Parties x 6 Slots grid
  const getTeamSlots = (teamId: GuildTeam) => {
    const teamMems = members.filter((m) => m.team === teamId);
    const grid: Record<number, Record<number, GuildMember | null>> = {
      1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    };

    const unplaced: GuildMember[] = [];

    teamMems.forEach((m) => {
      if (
        m.party &&
        m.slot &&
        m.party >= 1 &&
        m.party <= 3 &&
        m.slot >= 1 &&
        m.slot <= 6 &&
        grid[m.party][m.slot] === null
      ) {
        grid[m.party][m.slot] = m;
      } else {
        unplaced.push(m);
      }
    });

    // Place remaining members in next available slots sequentially
    let currentParty = 1;
    let currentSlot = 1;
    unplaced.forEach((m) => {
      while (currentParty <= 3) {
        if (grid[currentParty][currentSlot] === null) {
          grid[currentParty][currentSlot] = m;
          currentSlot++;
          if (currentSlot > 6) {
            currentSlot = 1;
            currentParty++;
          }
          break;
        }
        currentSlot++;
        if (currentSlot > 6) {
          currentSlot = 1;
          currentParty++;
        }
      }
    });

    return grid;
  };

  // Drag handlers
  const handleDragStart = (
    e: React.DragEvent,
    memberId: string,
    sourceTeam?: GuildTeam,
    sourceParty?: number,
    sourceSlot?: number
  ) => {
    const payload: DragPayload = { memberId, sourceTeam, sourceParty, sourceSlot };
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    setDraggedPayload(payload);
  };

  const handleDragOver = (e: React.DragEvent, slotKey?: string) => {
    e.preventDefault();
    if (slotKey && hoveredSlot !== slotKey) {
      setHoveredSlot(slotKey);
    }
  };

  const handleDragLeave = () => {
    setHoveredSlot(null);
  };

  // Drop onto a specific slot
  const handleDropToSlot = (
    e: React.DragEvent,
    targetTeam: GuildTeam,
    targetParty: number,
    targetSlot: number,
    currentOccupant: GuildMember | null
  ) => {
    e.preventDefault();
    setHoveredSlot(null);

    let payload: DragPayload | null = draggedPayload;
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        payload = JSON.parse(dataStr);
      }
    } catch {
      // fallback to draggedPayload in state
    }

    if (!payload || !payload.memberId) return;

    const sourceMember = members.find((m) => m.id === payload?.memberId);
    if (!sourceMember) return;

    // Same slot, no-op
    if (
      payload.sourceTeam === targetTeam &&
      payload.sourceParty === targetParty &&
      payload.sourceSlot === targetSlot
    ) {
      setDraggedPayload(null);
      return;
    }

    // If target slot is occupied, swap them!
    if (currentOccupant && currentOccupant.id !== sourceMember.id) {
      if (payload.sourceTeam && payload.sourceParty && payload.sourceSlot) {
        // Swap: existing occupant takes source's position
        onUpdateMember(currentOccupant.id, {
          team: payload.sourceTeam,
          party: payload.sourceParty,
          slot: payload.sourceSlot,
        });
      } else {
        // Source came from bench -> occupant moves to bench
        onUpdateMember(currentOccupant.id, {
          team: 'Chưa xếp',
          party: undefined,
          slot: undefined,
        });
      }
    }

    // Move dragged member to target slot
    onUpdateMember(sourceMember.id, {
      team: targetTeam,
      party: targetParty,
      slot: targetSlot,
    });

    setDraggedPayload(null);
  };

  // Drop onto Bench / Unassigned pool
  const handleDropToBench = (e: React.DragEvent) => {
    e.preventDefault();
    setHoveredSlot(null);

    let payload: DragPayload | null = draggedPayload;
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        payload = JSON.parse(dataStr);
      }
    } catch {}

    if (!payload || !payload.memberId) return;

    onUpdateMember(payload.memberId, {
      team: 'Chưa xếp',
      party: undefined,
      slot: undefined,
    });

    setDraggedPayload(null);
  };

  // Unassign member directly via button click
  const handleUnassignMember = (memberId: string) => {
    onUpdateMember(memberId, {
      team: 'Chưa xếp',
      party: undefined,
      slot: undefined,
    });
  };

  // Copy Discord format
  const handleCopyDiscordFormat = () => {
    let text = `⚔️ **SƠ ĐỒ PHÂN TEAM BANG CHIẾN** ⚔️\n\n`;

    EXCEL_TEAMS.forEach((team) => {
      const grid = getTeamSlots(team.id);
      const teamMems = members.filter((m) => m.team === team.id);
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `**${team.displayTitle} (${teamMems.length} người)**\n`;

      for (let p = 1; p <= 3; p++) {
        const ptMems: string[] = [];
        for (let s = 1; s <= 6; s++) {
          const m = grid[p][s];
          if (m && m.ingame) {
            ptMems.push(`**${m.ingame}** [${m.className}]`);
          }
        }
        text += `• **PT-${p}**: ${ptMems.length > 0 ? ptMems.join(', ') : '*(Trống)*'}\n`;
      }
      text += `\n`;
    });

    const unassigned = members.filter(
      (m) => !m.team || m.team === 'Chưa xếp' || !['Mid', 'Cơ động', 'Đẩy trụ'].includes(m.team)
    );
    if (unassigned.length > 0) {
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `**DỰ BỊ / CHƯA XẾP (${unassigned.length} người)**:\n`;
      text += unassigned.map((m) => `${m.ingame} [${m.className}]`).join(', ') + '\n';
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Unassigned pool members
  const unassignedMembers = members.filter(
    (m) =>
      !m.team ||
      m.team === 'Chưa xếp' ||
      !['Mid', 'Cơ động', 'Đẩy trụ'].includes(m.team)
  );

  const filteredBenchMembers = unassignedMembers.filter((m) => {
    if (!filterQuery.trim()) return true;
    const q = normalize(filterQuery);
    return (
      normalize(m.ingame).includes(q) ||
      normalize(m.className).includes(q) ||
      (m.discord && normalize(m.discord).includes(q))
    );
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Sơ Đồ Phân Team Bang Chiến (Mẫu Bảng Excel)</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Kéo thả trực tiếp nhân sự giữa các ô hoặc từ hàng ghế dự bị bên dưới để sắp xếp đội hình
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleCopyDiscordFormat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy danh sách Discord</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Excel-style Table Container */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-slate-500 rounded-xl overflow-x-auto shadow-md">
        {/* Top Header: BANG CHIẾN */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-sm sm:text-base tracking-widest text-center py-2 uppercase border-b-2 border-slate-800 dark:border-slate-500 select-none">
          BANG CHIẾN
        </div>

        {/* Table layout matching the user's Excel screenshot */}
        <table className="w-full border-collapse text-xs select-none">
          <tbody>
            {EXCEL_TEAMS.map((team, teamIdx) => {
              const grid = getTeamSlots(team.id);

              return (
                <React.Fragment key={team.id}>
                  {/* PT Header Row for this Team */}
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-400 dark:border-slate-600">
                    {/* Empty cell above Team name column */}
                    <th className="w-[120px] sm:w-[140px] border-r-2 border-slate-800 dark:border-slate-500 p-1.5"></th>

                    {/* PT-1 Header */}
                    <th
                      colSpan={2}
                      className="border-r border-slate-400 dark:border-slate-600 text-center py-1.5 font-bold tracking-wider text-xs"
                    >
                      PT-1
                    </th>

                    {/* PT-2 Header */}
                    <th
                      colSpan={2}
                      className="border-r border-slate-400 dark:border-slate-600 text-center py-1.5 font-bold tracking-wider text-xs"
                    >
                      PT-2
                    </th>

                    {/* PT-3 Header */}
                    <th
                      colSpan={2}
                      className="text-center py-1.5 font-bold tracking-wider text-xs"
                    >
                      PT-3
                    </th>
                  </tr>

                  {/* 6 Slot Rows (Slot 1 to 6) */}
                  {[1, 2, 3, 4, 5, 6].map((slotNum, slotIdx) => (
                    <tr
                      key={slotNum}
                      className="border-b border-slate-300 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Left Cell: Team Name (Merged vertically across all 6 slot rows) */}
                      {slotIdx === 0 && (
                        <td
                          rowSpan={6}
                          className="border-r-2 border-slate-800 dark:border-slate-500 bg-white dark:bg-slate-900 text-center p-2 align-middle font-black text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider"
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span>{team.displayTitle}</span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                              ({members.filter((m) => m.team === team.id).length}/18)
                            </span>
                          </div>
                        </td>
                      )}

                      {/* 3 Parties (PT-1, PT-2, PT-3) */}
                      {[1, 2, 3].map((partyNum) => {
                        const member = grid[partyNum][slotNum];
                        const slotKey = `${team.id}-${partyNum}-${slotNum}`;
                        const isHovered = hoveredSlot === slotKey;
                        const classMeta = member
                          ? getEffectiveClassMeta(member.className, customColors)
                          : null;

                        return (
                          <React.Fragment key={partyNum}>
                            {/* Subcolumn 1: Member Name Cell */}
                            <td
                              onDragOver={(e) => handleDragOver(e, slotKey)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) =>
                                handleDropToSlot(e, team.id, partyNum, slotNum, member)
                              }
                              className={`w-[130px] sm:w-[160px] p-1.5 border-r border-slate-300 dark:border-slate-700 transition-all ${
                                isHovered
                                  ? 'bg-indigo-100/70 dark:bg-indigo-950/70 ring-2 ring-indigo-500 z-10'
                                  : member
                                  ? 'bg-white dark:bg-slate-900'
                                  : 'bg-slate-50/40 dark:bg-slate-850/40'
                              }`}
                            >
                              {member ? (
                                <div
                                  draggable
                                  onDragStart={(e) =>
                                    handleDragStart(
                                      e,
                                      member.id,
                                      team.id,
                                      partyNum,
                                      slotNum
                                    )
                                  }
                                  className="group flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title={`Kéo để di chuyển hoặc đổi chỗ (STT #${member.stt || slotNum})`}
                                >
                                  <div className="flex items-center gap-1 min-w-0 flex-1">
                                    <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
                                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                      {member.ingame}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignMember(member.id)}
                                    title="Gỡ khỏi slot (về hàng dự bị)"
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center text-[11px] text-slate-300 dark:text-slate-600 italic py-0.5">
                                  {isHovered ? 'Thả vào đây' : '(Trống)'}
                                </div>
                              )}
                            </td>

                            {/* Subcolumn 2: Class Pill Dropdown Cell */}
                            <td
                              className={`w-[130px] sm:w-[150px] p-1.5 text-center ${
                                partyNum < 3
                                  ? 'border-r-2 border-slate-400 dark:border-slate-600'
                                  : ''
                              }`}
                            >
                              {member && classMeta ? (
                                <div className="relative inline-flex items-center justify-center">
                                  <select
                                    value={member.className}
                                    onChange={(e) =>
                                      onUpdateMember(member.id, {
                                        className: e.target.value as RaidClass,
                                      })
                                    }
                                    title="Nhấp để đổi môn phái"
                                    className="appearance-none cursor-pointer text-xs font-semibold py-1 pl-3.5 pr-6 rounded-full border shadow-2xs transition-transform active:scale-95 focus:outline-none focus:ring-1 focus:ring-black/20"
                                    style={{
                                      backgroundColor: classMeta.bgColor,
                                      color: classMeta.textColor,
                                      borderColor: 'rgba(0,0,0,0.18)',
                                    }}
                                  >
                                    {CLASS_LIST.map((cls) => (
                                      <option
                                        key={cls}
                                        value={cls}
                                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                                      >
                                        {cls}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown
                                    className="w-3.5 h-3.5 absolute right-2 pointer-events-none"
                                    style={{ color: classMeta.textColor, opacity: 0.75 }}
                                  />
                                </div>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Spacer row between teams matching the Excel blank row */}
                  {teamIdx < EXCEL_TEAMS.length - 1 && (
                    <tr className="h-3 bg-slate-200/70 dark:bg-slate-800/80 border-t-2 border-b-2 border-slate-800 dark:border-slate-500">
                      <td colSpan={7}></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unassigned / Bench Pool Below Table */}
      <div
        onDragOver={(e) => handleDragOver(e, 'bench')}
        onDragLeave={handleDragLeave}
        onDrop={handleDropToBench}
        className={`bg-white dark:bg-slate-900 border-2 border-dashed rounded-2xl p-4 sm:p-5 shadow-xs transition-colors ${
          hoveredSlot === 'bench'
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
            : 'border-amber-300 dark:border-amber-700/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">
                Hàng Ghế Dự Bị / Nhân Sự Chưa Xếp ({unassignedMembers.length} người)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Kéo thành viên từ đây và thả trực tiếp vào bất kỳ ô nào trong bảng trên
            </p>
          </div>

          {unassignedMembers.length > 5 && (
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Lọc tên nhân sự..."
              className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
            />
          )}
        </div>

        {unassignedMembers.length === 0 ? (
          <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs italic">
            Tất cả nhân sự đã được xếp vào các Team Bang Chiến!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredBenchMembers.map((member) => {
              const meta = getEffectiveClassMeta(member.className, customColors);
              return (
                <div
                  key={member.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.id)}
                  className="group bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl px-2.5 py-1.5 shadow-2xs flex items-center gap-2 cursor-grab active:cursor-grabbing transition-all hover:scale-105"
                  title="Kéo và thả vào một vị trí trong bảng"
                >
                  <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {member.ingame}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs"
                    style={{
                      backgroundColor: meta.bgColor,
                      color: meta.textColor,
                    }}
                  >
                    {member.className}
                  </span>
                  {member.guildRole && (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      ({member.guildRole})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
