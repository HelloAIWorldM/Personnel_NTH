import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas-pro';
import {
  GuildMember,
  GuildTeam,
  CustomClassColors,
  RaidClass,
} from '../../types';
import { getEffectiveClassMeta, CLASS_LIST } from '../../constants/classes';
import { drawGuildTeamsToCanvas } from '../../utils/canvasRaidRenderer';
import {
  Copy,
  Check,
  ChevronDown,
  X,
  Users,
  Sparkles,
  GripVertical,
  Image as ImageIcon,
  Download,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  MessageSquare,
} from 'lucide-react';
import { PixelNoteBubble } from '../PixelNoteBubble';
import {
  findGuildWarDuplicates,
  GuildWarDuplicateGroup,
} from '../../utils/duplicates';
import { PersonnelMember } from '../../types';

interface GuildTeamsTabProps {
  members: GuildMember[];
  partyNotes?: Record<string, string>;
  customColors?: CustomClassColors;
  personnelPool?: PersonnelMember[];
  onUpdatePersonnelPool?: (pool: PersonnelMember[]) => void;
  onUpdateMember: (id: string, updates: Partial<GuildMember>) => void;
  onUpdateMembers?: (updatedMembers: GuildMember[]) => void;
  onUpdatePartyNotes?: (notes: Record<string, string>) => void;
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
  partyNotes = {},
  customColors,
  personnelPool = [],
  onUpdatePersonnelPool,
  onUpdateMember,
  onUpdateMembers,
  onUpdatePartyNotes,
}) => {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [draggedPayload, setDraggedPayload] = useState<DragPayload | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [benchSortByClass, setBenchSortByClass] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pixel Note Bubble hover & click states cho các PT (PT-1 .. PT-4)
  const [activePartyNoteTarget, setActivePartyNoteTarget] = useState<{
    team: TeamConfig;
    partyNum: number;
  } | null>(null);
  const [partyNoteAnchorRect, setPartyNoteAnchorRect] = useState<DOMRect | null>(null);
  const partyNoteCloseTimeoutRef = useRef<any>(null);
  const partyNoteOpenTimeoutRef = useRef<any>(null);

  const handleOpenPartyNote = (team: TeamConfig, partyNum: number, rect: DOMRect) => {
    clearTimeout(partyNoteCloseTimeoutRef.current);
    clearTimeout(partyNoteOpenTimeoutRef.current);
    setActivePartyNoteTarget({ team, partyNum });
    setPartyNoteAnchorRect(rect);
  };

  const handlePartyMouseEnter = (team: TeamConfig, partyNum: number, e: React.MouseEvent<HTMLElement>) => {
    clearTimeout(partyNoteCloseTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    clearTimeout(partyNoteOpenTimeoutRef.current);
    partyNoteOpenTimeoutRef.current = setTimeout(() => {
      setActivePartyNoteTarget({ team, partyNum });
      setPartyNoteAnchorRect(rect);
    }, 180);
  };

  const handlePartyMouseLeave = () => {
    clearTimeout(partyNoteOpenTimeoutRef.current);
    partyNoteCloseTimeoutRef.current = setTimeout(() => {
      setActivePartyNoteTarget(null);
      setPartyNoteAnchorRect(null);
    }, 280);
  };

  const handleSavePartyNote = (key: string, noteText: string) => {
    const updatedNotes = {
      ...(partyNotes || {}),
      [key]: noteText.trim(),
    };
    if (!noteText.trim()) {
      delete updatedNotes[key];
    }
    if (onUpdatePartyNotes) {
      onUpdatePartyNotes(updatedNotes);
    }
  };

  // Normalize string helper
  const normalize = (str: string) => str.trim().toLowerCase();

  // Priority order for sorting members by sect/class (Tank -> Healer -> DPS -> A-Z ingame)
  const CLASS_PRIORITY_ORDER: RaidClass[] = [
    'Thiết Y',
    'Thương Lan',
    'Tố Vấn',
    'Thiên Vấn',
    'Toái Mộng',
    'Thần Tương',
    'Huyết Hà',
    'Cửu Linh',
    'Long Ngâm',
    'Triều Quang',
    'Huyền Cơ',
    'Hồng Âm',
  ];

  const getClassOrderIndex = (className: RaidClass): number => {
    const idx = CLASS_PRIORITY_ORDER.indexOf(className);
    return idx === -1 ? 999 : idx;
  };

  const sortMemberListByClass = (mems: GuildMember[]) => {
    return [...mems].sort((a, b) => {
      const idxA = getClassOrderIndex(a.className);
      const idxB = getClassOrderIndex(b.className);
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      return a.ingame.localeCompare(b.ingame, 'vi');
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // Helper to map members of teams into 4 Parties x 6 Slots grids
  const teamGrids = useMemo(() => {
    const result: Record<GuildTeam, Record<number, Record<number, GuildMember | null>>> = {
      'Cơ động': {
        1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      },
      'Mid': {
        1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      },
      'Đẩy trụ': {
        1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      },
      'Chưa xếp': {
        1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      },
      'Top': {
        1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      },
      'Bot': {
        1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      },
    };

    members.forEach((m) => {
      if (
        (m.team === 'Cơ động' || m.team === 'Mid' || m.team === 'Đẩy trụ') &&
        m.party &&
        m.slot &&
        m.party >= 1 &&
        m.party <= 4 &&
        m.slot >= 1 &&
        m.slot <= 6 &&
        result[m.team][m.party][m.slot] === null
      ) {
        result[m.team][m.party][m.slot] = m;
      }
    });

    return result;
  }, [members]);

  const getTeamSlots = (teamId: GuildTeam) => {
    return (
      teamGrids[teamId] || {
        1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      }
    );
  };

  // Set of member IDs currently placed in any slot in the 3 teams
  const placedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    EXCEL_TEAMS.forEach((team) => {
      const grid = teamGrids[team.id];
      if (grid) {
        for (let p = 1; p <= 4; p++) {
          for (let s = 1; s <= 6; s++) {
            const mem = grid[p][s];
            if (mem) ids.add(mem.id);
          }
        }
      }
    });
    return ids;
  }, [teamGrids]);

  // Unassigned pool members: anyone not occupying a valid grid slot
  const unassignedMembers = useMemo(() => {
    return members.filter((m) => !placedMemberIds.has(m.id));
  }, [members, placedMemberIds]);

  // Duplicate member detection across teams, parties, and bench
  const duplicateGroups = useMemo(() => findGuildWarDuplicates(members), [members]);

  const duplicateMemberIdSet = useMemo(() => {
    const set = new Set<string>();
    duplicateGroups.forEach((g) => {
      g.members.forEach((m) => set.add(m.id));
    });
    return set;
  }, [duplicateGroups]);

  const duplicateInfoMap = useMemo(() => {
    const map = new Map<string, GuildWarDuplicateGroup>();
    duplicateGroups.forEach((g) => {
      g.members.forEach((m) => {
        map.set(m.id, g);
      });
    });
    return map;
  }, [duplicateGroups]);

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

    const now = new Date().toISOString();

    if (onUpdateMembers) {
      const updatedMembers = members.map((m) => {
        // Dragged member moves to target slot
        if (m.id === sourceMember.id) {
          return {
            ...m,
            team: targetTeam,
            party: targetParty,
            slot: targetSlot,
            updatedAt: now,
          };
        }

        // Target slot occupant
        if (currentOccupant && m.id === currentOccupant.id) {
          if (payload!.sourceTeam && payload!.sourceParty && payload!.sourceSlot) {
            // Swap: occupant takes source's previous position
            return {
              ...m,
              team: payload!.sourceTeam,
              party: payload!.sourceParty,
              slot: payload!.sourceSlot,
              updatedAt: now,
            };
          } else {
            // Source came from bench -> occupant moves to bench
            const cleared: GuildMember = {
              ...m,
              team: 'Chưa xếp',
              updatedAt: now,
            };
            delete cleared.party;
            delete cleared.slot;
            return cleared;
          }
        }

        // Heal any duplicate occupant that might have had the target slot
        if (
          m.team === targetTeam &&
          m.party === targetParty &&
          m.slot === targetSlot
        ) {
          const cleared: GuildMember = {
            ...m,
            team: 'Chưa xếp',
            updatedAt: now,
          };
          delete cleared.party;
          delete cleared.slot;
          return cleared;
        }

        return m;
      });

      onUpdateMembers(updatedMembers);
    } else {
      // Fallback
      if (currentOccupant && currentOccupant.id !== sourceMember.id) {
        if (payload.sourceTeam && payload.sourceParty && payload.sourceSlot) {
          onUpdateMember(currentOccupant.id, {
            team: payload.sourceTeam,
            party: payload.sourceParty,
            slot: payload.sourceSlot,
          });
        } else {
          onUpdateMember(currentOccupant.id, {
            team: 'Chưa xếp',
            party: undefined,
            slot: undefined,
          });
        }
      }
      onUpdateMember(sourceMember.id, {
        team: targetTeam,
        party: targetParty,
        slot: targetSlot,
      });
    }

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

    if (onUpdateMembers) {
      const now = new Date().toISOString();
      const updatedMembers = members.map((m) => {
        if (m.id !== payload!.memberId) return m;
        const cleared: GuildMember = {
          ...m,
          team: 'Chưa xếp',
          updatedAt: now,
        };
        delete cleared.party;
        delete cleared.slot;
        return cleared;
      });
      onUpdateMembers(updatedMembers);
    } else {
      onUpdateMember(payload.memberId, {
        team: 'Chưa xếp',
        party: undefined,
        slot: undefined,
      });
    }

    setDraggedPayload(null);
  };

  // Unassign member directly via button click
  const handleUnassignMember = (
    memberId: string,
    team?: GuildTeam,
    party?: number,
    slot?: number
  ) => {
    const now = new Date().toISOString();
    if (onUpdateMembers) {
      const updatedMembers = members.map((m) => {
        if (
          m.id === memberId ||
          (team && party && slot && m.team === team && m.party === party && m.slot === slot)
        ) {
          const cleared: GuildMember = {
            ...m,
            team: 'Chưa xếp',
            updatedAt: now,
          };
          delete cleared.party;
          delete cleared.slot;
          return cleared;
        }
        return m;
      });
      onUpdateMembers(updatedMembers);
    } else {
      onUpdateMember(memberId, {
        team: 'Chưa xếp',
        party: undefined,
        slot: undefined,
      });
    }
  };

  // Copy Discord format
  const handleCopyDiscordFormat = () => {
    let text = `⚔️ **SƠ ĐỒ PHÂN TEAM BANG CHIẾN** ⚔️\n\n`;

    EXCEL_TEAMS.forEach((team) => {
      const grid = getTeamSlots(team.id);
      let placedCount = 0;
      for (let p = 1; p <= 4; p++) {
        for (let s = 1; s <= 6; s++) {
          if (grid[p][s]) placedCount++;
        }
      }
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `**${team.displayTitle} (${placedCount}/24 người)**\n`;

      for (let p = 1; p <= 4; p++) {
        const ptMems: string[] = [];
        for (let s = 1; s <= 6; s++) {
          const m = grid[p][s];
          if (m && m.ingame) {
            ptMems.push(`**${m.ingame}** [${m.className}]`);
          }
        }
        text += `• **PT-${p}**: ${ptMems.length > 0 ? ptMems.join(', ') : '*(Trống)*'}\n`;
        const noteKey = `${team.id}-${p}`;
        const pNote = partyNotes?.[noteKey]?.trim();
        if (pNote) {
          text += `  ↳ 📝 *Ghi chú: ${pNote.replace(/\n+/g, ' ')}*\n`;
        }
      }
      text += `\n`;
    });

    if (unassignedMembers.length > 0) {
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `**DỰ BỊ / CHƯA XẾP (${unassignedMembers.length} người)**:\n`;
      text += unassignedMembers.map((m) => `${m.ingame} [${m.className}]`).join(', ') + '\n';
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate canvas using html2canvas with pure canvas fallback
  const generateGuildTeamsCanvas = async (): Promise<HTMLCanvasElement> => {
    const isDark = document.documentElement.classList.contains('dark');

    const getPureFallbackCanvas = () => {
      return drawGuildTeamsToCanvas({
        members,
        customColors,
        isDark,
      });
    };

    if (!tableRef.current || tableRef.current.offsetWidth === 0) {
      return getPureFallbackCanvas();
    }

    try {
      const originalTable = tableRef.current;
      const bgColor = isDark ? '#0b1329' : '#ffffff';

      const canvas = await html2canvas(originalTable, {
        scale: 2,
        useCORS: true,
        backgroundColor: bgColor,
        logging: false,
        onclone: (clonedDoc: Document) => {
          const table = clonedDoc.getElementById('guild-teams-table-capture');
          if (!table) return;

          // Expand to full width to ensure no columns are clipped
          table.style.width = '1380px';
          table.style.maxWidth = 'none';
          table.style.overflow = 'visible';

          // 1. Remove ignore elements (drag grips, delete buttons)
          const ignored = table.querySelectorAll('[data-html2canvas-ignore="true"]');
          ignored.forEach((el) => el.remove());

          // 2. Replace all <select> elements with beautifully styled static badges
          const selects = table.querySelectorAll('select');
          selects.forEach((sel) => {
            const val = sel.value;
            const parent = sel.parentElement;
            if (!parent) return;

            const bg = sel.style.backgroundColor || '#64748b';
            const color = sel.style.color || '#ffffff';

            const badge = clonedDoc.createElement('div');
            badge.textContent = val;
            badge.setAttribute(
              'style',
              `display: inline-flex !important; align-items: center !important; justify-content: center !important; padding: 4px 14px !important; border-radius: 9999px !important; font-size: 12px !important; font-weight: 700 !important; font-family: 'Be Vietnam Pro', system-ui, sans-serif !important; background-color: ${bg} !important; color: ${color} !important; border: 1px solid rgba(0,0,0,0.18) !important; white-space: nowrap !important; line-height: 1.25 !important; box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important;`
            );

            parent.innerHTML = '';
            parent.appendChild(badge);
          });
        },
      });

      if (!canvas || canvas.width < 100 || canvas.height < 100) {
        return getPureFallbackCanvas();
      }

      return canvas;
    } catch (err) {
      console.warn('html2canvas failed on guild teams table, falling back to pure canvas:', err);
      return getPureFallbackCanvas();
    }
  };

  const handleCopyTableImage = async () => {
    setCopyingImage(true);
    try {
      const canvas = await generateGuildTeamsCanvas();
      const isDark = document.documentElement.classList.contains('dark');
      let dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl === 'data:,' || !dataUrl.startsWith('data:image/png;base64,')) {
        const pure = drawGuildTeamsToCanvas({ members, customColors, isDark });
        dataUrl = pure.toDataURL('image/png');
      }

      let blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob || blob.size === 0) {
        const pure = drawGuildTeamsToCanvas({ members, customColors, isDark });
        blob = await new Promise<Blob | null>((resolve) => {
          pure.toBlob((b) => resolve(b), 'image/png');
        });
      }

      let writeSuccess = false;
      if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          writeSuccess = true;
        } catch (e1) {
          try {
            const item = new ClipboardItem({ 'image/png': Promise.resolve(blob) });
            await navigator.clipboard.write([item]);
            writeSuccess = true;
          } catch (e2) {
            console.warn('Direct clipboard.write failed (likely iframe restriction):', e2);
          }
        }
      }

      if (writeSuccess) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        setPreviewModalUrl(dataUrl);
      }
    } catch (err) {
      console.error('Error copying table image:', err);
      try {
        const pure = drawGuildTeamsToCanvas({
          members,
          customColors,
          isDark: document.documentElement.classList.contains('dark'),
        });
        setPreviewModalUrl(pure.toDataURL('image/png'));
      } catch (e) {
        console.error('Pure canvas fallback failed:', e);
      }
    } finally {
      setCopyingImage(false);
    }
  };

  const handleDownloadTableImage = async () => {
    setDownloadingImage(true);
    try {
      const canvas = await generateGuildTeamsCanvas();
      let dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl === 'data:,' || !dataUrl.startsWith('data:image/png;base64,')) {
        const pure = drawGuildTeamsToCanvas({
          members,
          customColors,
          isDark: document.documentElement.classList.contains('dark'),
        });
        dataUrl = pure.toDataURL('image/png');
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Bang_Chien_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading table image:', err);
    } finally {
      setDownloadingImage(false);
    }
  };



  let filteredBenchMembers = unassignedMembers.filter((m) => {
    if (!filterQuery.trim()) return true;
    const q = normalize(filterQuery);
    return (
      normalize(m.ingame).includes(q) ||
      normalize(m.className).includes(q) ||
      (m.discord && normalize(m.discord).includes(q))
    );
  });

  if (benchSortByClass) {
    filteredBenchMembers = sortMemberListByClass(filteredBenchMembers);
  }

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
            onClick={handleCopyTableImage}
            disabled={copyingImage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer min-h-[34px]"
            title="Chụp và copy ảnh bảng Bang Chiến vào bộ nhớ tạm để dán (Ctrl+V) ngay"
          >
            {copiedImage ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Đã copy ảnh!</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{copyingImage ? 'Đang chụp...' : 'Chụp & Copy ảnh'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadTableImage}
            disabled={downloadingImage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer min-h-[34px]"
            title="Lưu file ảnh PNG của bảng Bang Chiến về máy"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{downloadingImage ? 'Đang tải...' : 'Tải ảnh PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyDiscordFormat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer min-h-[34px]"
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

      {/* Cảnh Báo Trùng Nhân Sự Bang Chiến */}
      {duplicateGroups.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-3 sm:p-4 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-black text-rose-700 dark:text-rose-400 text-xs sm:text-sm mb-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse shrink-0" />
            <span>
              🚨 CẢNH BÁO TRÙNG NHÂN SỰ BANG CHIẾN ({duplicateGroups.length} trường hợp bị xếp trùng)
            </span>
          </div>
          <p className="text-[11px] text-rose-800 dark:text-rose-300 mb-2">
            Các nhân sự sau đây đang xuất hiện nhiều lần (trong nhiều đội hình hoặc vừa ở đội hình vừa ở hàng dự bị):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {duplicateGroups.map((group) => (
              <div
                key={group.normalizedIngame}
                className="bg-white/90 dark:bg-slate-900/90 border border-rose-200 dark:border-rose-800/80 rounded-xl p-2.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-black text-slate-900 dark:text-white truncate">
                    {group.originalName}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                    Trùng {group.count} lần
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                  {group.members.map((m, i) => (
                    <div key={m.id || i} className="flex items-center gap-1">
                      <span className="text-slate-400">•</span>
                      <span>
                        {m.isBench
                          ? 'Ghế dự bị'
                          : `${m.team || 'Chưa xếp'} PT-${m.party || 1} Slot ${m.slot || 1}`}
                      </span>
                      <span className="text-slate-400 text-[10px]">({m.className})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Excel-style Table Container */}
      <div
        ref={tableRef}
        id="guild-teams-table-capture"
        className="bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-slate-500 rounded-xl overflow-x-auto shadow-md"
      >
        {/* Top Header: BANG CHIẾN */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-sm sm:text-base tracking-widest text-center py-2 uppercase border-b-2 border-slate-800 dark:border-slate-500 select-none">
          BANG CHIẾN
        </div>

        {/* Table layout matching the user's Excel screenshot */}
        <table className="w-full border-collapse text-xs select-none">
          <tbody>
            {EXCEL_TEAMS.map((team, teamIdx) => {
              const grid = getTeamSlots(team.id);
              const placedCount = [1, 2, 3, 4].reduce((acc, p) => {
                return acc + [1, 2, 3, 4, 5, 6].filter((s) => grid[p][s] !== null).length;
              }, 0);

              return (
                <React.Fragment key={team.id}>
                  {/* PT Header Row for this Team */}
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-400 dark:border-slate-600">
                    {/* Empty cell above Team name column */}
                    <th className="w-[120px] sm:w-[140px] border-r-2 border-slate-800 dark:border-slate-500 p-1.5"></th>

                    {[1, 2, 3, 4].map((partyNum) => {
                      const noteKey = `${team.id}-${partyNum}`;
                      const pNote = partyNotes?.[noteKey]?.trim();
                      const hasNote = Boolean(pNote);

                      return (
                        <th
                          key={partyNum}
                          colSpan={2}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPartyNote(team, partyNum, e.currentTarget.getBoundingClientRect());
                          }}
                          onMouseEnter={(e) => handlePartyMouseEnter(team, partyNum, e)}
                          onMouseLeave={handlePartyMouseLeave}
                          className={`text-center py-1.5 px-2 font-black tracking-wider text-xs cursor-pointer select-none transition-all group relative hover:bg-amber-100/80 dark:hover:bg-amber-950/50 active:scale-[0.99] ${
                            partyNum < 4
                              ? 'border-r border-slate-400 dark:border-slate-600'
                              : ''
                          } ${
                            hasNote
                              ? 'bg-amber-50/70 dark:bg-amber-950/30'
                              : ''
                          }`}
                          title={
                            hasNote
                              ? `Ghi chú PT-${partyNum}: ${pNote}\n(Lia chuột hoặc nhấp để xem & sửa)`
                              : `Lia chuột hoặc nhấp vào PT-${partyNum} để ghi chú chiến thuật`
                          }
                        >
                          <div className="flex items-center justify-center gap-1.5 min-w-0">
                            <span
                              className={`transition-colors text-xs font-black ${
                                hasNote
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-300'
                              }`}
                            >
                              PT-{partyNum}
                            </span>

                            {hasNote ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-black bg-amber-200/90 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-400/80 dark:border-amber-700/80 shadow-2xs max-w-[110px] truncate"
                                title={`Ghi chú: ${pNote}`}
                              >
                                <span className="text-[10px]">📝</span>
                                <span className="truncate">{pNote}</span>
                              </span>
                            ) : (
                              <span
                                data-html2canvas-ignore="true"
                                className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-400 hover:text-amber-500 transition-opacity p-0.5"
                                title="Thêm ghi chú chiến thuật"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
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
                              ({placedCount}/24)
                            </span>
                          </div>
                        </td>
                      )}

                      {/* 4 Parties (PT-1, PT-2, PT-3, PT-4) */}
                      {[1, 2, 3, 4].map((partyNum) => {
                        const member = grid[partyNum][slotNum];
                        const slotKey = `${team.id}-${partyNum}-${slotNum}`;
                        const isHovered = hoveredSlot === slotKey;
                        const isDuplicate = member ? duplicateMemberIdSet.has(member.id) : false;
                        const dupGroup = member ? duplicateInfoMap.get(member.id) : null;
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
                                  : isDuplicate
                                  ? 'bg-rose-50/90 dark:bg-rose-950/50 ring-1 ring-rose-400'
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
                                    <GripVertical
                                      data-html2canvas-ignore="true"
                                      className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0"
                                    />
                                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                      {member.ingame}
                                    </span>
                                    {isDuplicate && (
                                      <span
                                        data-html2canvas-ignore="true"
                                        title={`🚨 TRÙNG NHÂN SỰ: "${member.ingame}" xuất hiện ${dupGroup?.count} lần trong danh sách Bang Chiến!`}
                                        className="text-rose-500 hover:text-rose-600 animate-pulse shrink-0 cursor-help"
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                      </span>
                                    )}
                                  </div>

                                  {/* Unassign from slot */}
                                  <button
                                    type="button"
                                    data-html2canvas-ignore="true"
                                    onClick={() => handleUnassignMember(member.id, team.id, partyNum, slotNum)}
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
                                partyNum < 4
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const next = !benchSortByClass;
                setBenchSortByClass(next);
                showToast(
                  next
                    ? 'Đã bật gom môn phái ở Hàng ghế dự bị!'
                    : 'Đã tắt gom môn phái ở Hàng ghế dự bị'
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                benchSortByClass
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
              title="Bật/tắt gom theo môn phái ở hàng ghế dự bị"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{benchSortByClass ? 'Đang gom theo phái' : 'Gom theo môn phái'}</span>
            </button>

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
        </div>

        {unassignedMembers.length === 0 ? (
          <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs italic">
            Tất cả nhân sự đã được xếp vào các Team Bang Chiến!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredBenchMembers.map((member) => {
              const meta = getEffectiveClassMeta(member.className, customColors);
              const isDuplicate = duplicateMemberIdSet.has(member.id);
              const dupGroup = duplicateInfoMap.get(member.id);

              return (
                <div
                  key={member.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.id)}
                  className={`group border rounded-xl px-2.5 py-1.5 shadow-2xs flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-all hover:scale-105 relative ${
                    isDuplicate
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-1 ring-rose-400'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                  }`}
                  title={
                    isDuplicate
                      ? `🚨 TRÙNG NHÂN SỰ: "${member.ingame}" xuất hiện ${dupGroup?.count} lần trong danh sách Bang Chiến!`
                      : 'Kéo và thả vào một vị trí trong bảng'
                  }
                >
                  <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {member.ingame}
                  </span>
                  {isDuplicate && (
                    <span
                      data-html2canvas-ignore="true"
                      className="text-rose-500 animate-pulse"
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}
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

      {/* Preview Fallback Modal (When clipboard auto-write is restricted) */}
      {previewModalUrl &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      Ảnh Bảng Bang Chiến
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Chuột phải sao chép hoặc tải file ảnh PNG về máy
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Ảnh đã được tạo thành công!</strong> Do bảo mật trình duyệt hạn chế tự động lưu vào bộ nhớ tạm, bạn có thể:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                    <li>Chuột phải vào ảnh &gt; Chọn <em>Sao chép hình ảnh (Copy image)</em></li>
                    <li>Hoặc bấm nút <em>Tải file ảnh PNG</em> bên dưới</li>
                  </ul>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-950 p-2 flex items-center justify-center">
                <img
                  src={previewModalUrl}
                  alt="Bang Chien Preview"
                  className="w-full h-auto object-contain cursor-pointer rounded"
                  title="Chuột phải -> Sao chép hình ảnh"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewModalUrl;
                    link.download = `Bang_Chien_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file ảnh PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Floating Pixel Note Bubble Modal / Tooltip cho PT (PT-1 .. PT-4) */}
      {activePartyNoteTarget && partyNoteAnchorRect && (() => {
        const partyKey = `${activePartyNoteTarget.team.id}-${activePartyNoteTarget.partyNum}`;
        const currentPartyNote = partyNotes[partyKey] || '';

        return (
          <PixelNoteBubble
            targetId={partyKey}
            title={`${activePartyNoteTarget.team.displayTitle} • PT-${activePartyNoteTarget.partyNum}`}
            badgeText={`PT-${activePartyNoteTarget.partyNum}`}
            badgeBgColor="#6366f1"
            badgeTextColor="#ffffff"
            initialNote={currentPartyNote}
            placeholder="Nhập chiến thuật / phân công nhiệm vụ cho PT này (ví dụ: bọc sườn, bắt xe pháo, quấy rối sau lưng...)"
            anchorRect={partyNoteAnchorRect}
            onSaveNote={(_id, text) => handleSavePartyNote(partyKey, text)}
            onClose={() => {
              setActivePartyNoteTarget(null);
              setPartyNoteAnchorRect(null);
            }}
            onMouseEnter={() => {
              clearTimeout(partyNoteCloseTimeoutRef.current);
            }}
            onMouseLeave={() => {
              partyNoteCloseTimeoutRef.current = setTimeout(() => {
                setActivePartyNoteTarget(null);
                setPartyNoteAnchorRect(null);
              }, 280);
            }}
            customColors={customColors}
          />
        );
      })()}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-emerald-950 text-white border border-emerald-500/50 rounded-xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
