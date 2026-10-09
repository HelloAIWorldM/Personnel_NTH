import React, { useState, useMemo, useRef } from 'react';
import {
  GuildMember,
  RaidClass,
  GuildRole,
  GuildParticipation,
  GuildTeam,
  CustomClassColors,
  PersonnelMember,
} from '../../types';
import { RAID_CLASSES, getEffectiveClassMeta } from '../../constants/classes';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  Download,
  Users,
  Check,
  X,
  FileSpreadsheet,
  ArrowRight,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { normalizeName } from '../../utils/duplicates';

import { ImportFromMasterModal } from './ImportFromMasterModal';

interface GuildRosterTabProps {
  members: GuildMember[];
  customColors?: CustomClassColors;
  personnelPool?: PersonnelMember[];
  masterPersonnelPool?: PersonnelMember[];
  onUpdatePersonnelPool?: (pool: PersonnelMember[]) => void;
  onUpdateMember: (id: string, updates: Partial<GuildMember>) => void;
  onAddMember: (member: Omit<GuildMember, 'id'>) => void;
  onDeleteMember: (id: string) => void;
  onImportFromPersonnel?: () => void;
  onImportSelectedMembers: (selectedMembers: PersonnelMember[]) => void;
  onMoveToTeam: (id: string, team: GuildTeam) => void;
}

const ALL_ROLES: GuildRole[] = [
  'Lead Tổng',
  'Lead Team',
  'Thành Viên',
];

const ALL_PARTICIPATION: GuildParticipation[] = [
  'Cả hai',
  'Bang chiến',
  'Raid',
  'Dự bị',
];

const ALL_TEAMS: GuildTeam[] = ['Mid', 'Cơ động', 'Đẩy trụ', 'Chưa xếp'];

export const GuildRosterTab: React.FC<GuildRosterTabProps> = ({
  members,
  customColors,
  personnelPool = [],
  masterPersonnelPool = [],
  onUpdatePersonnelPool,
  onUpdateMember,
  onAddMember,
  onDeleteMember,
  onImportFromPersonnel,
  onImportSelectedMembers,
  onMoveToTeam,
}) => {
  const [isImportFromMasterOpen, setIsImportFromMasterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterParticipation, setFilterParticipation] = useState<string>('ALL');
  const [filterTeam, setFilterTeam] = useState<string>('ALL');

  // Quick Add State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newIngame, setNewIngame] = useState('');
  const [newClass, setNewClass] = useState<RaidClass>('Toái Mộng');
  const [newRole, setNewRole] = useState<GuildRole>('Thành Viên');
  const [newParticipation, setNewParticipation] = useState<GuildParticipation>('Cả hai');
  const [newLoggedBy, setNewLoggedBy] = useState('');
  const [newTeam, setNewTeam] = useState<GuildTeam>('Chưa xếp');

  // Batch Paste State
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');

  // Edit Inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIngame, setEditIngame] = useState('');
  const [editClass, setEditClass] = useState<RaidClass>('Toái Mộng');
  const [editRole, setEditRole] = useState<GuildRole>('Thành Viên');
  const [editParticipation, setEditParticipation] = useState<GuildParticipation>('Cả hai');
  const [editLoggedBy, setEditLoggedBy] = useState('');
  const [editTeam, setEditTeam] = useState<GuildTeam>('Chưa xếp');

  // Sorting state
  const [sortField, setSortField] = useState<'stt' | 'className' | 'ingame' | 'guildRole' | 'team'>('stt');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (field: 'stt' | 'className' | 'ingame' | 'guildRole' | 'team') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

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

  const filteredMembers = useMemo(() => {
    const list = members.filter((m) => {
      const matchQuery =
        !searchQuery.trim() ||
        m.ingame.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.loggedBy && m.loggedBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.discord && m.discord.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchClass = filterClass === 'ALL' || m.className === filterClass;
      const matchRole = filterRole === 'ALL' || m.guildRole === filterRole;
      const matchPart =
        filterParticipation === 'ALL' || m.participation === filterParticipation;
      const matchTeam = filterTeam === 'ALL' || m.team === filterTeam;

      return matchQuery && matchClass && matchRole && matchPart && matchTeam;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      let diff = 0;
      if (sortField === 'className') {
        diff = getClassOrderIndex(a.className) - getClassOrderIndex(b.className);
        if (diff === 0) diff = a.ingame.localeCompare(b.ingame, 'vi');
      } else if (sortField === 'ingame') {
        diff = a.ingame.localeCompare(b.ingame, 'vi');
      } else if (sortField === 'team') {
        diff = (a.team || '').localeCompare(b.team || '', 'vi');
      } else if (sortField === 'guildRole') {
        diff = (a.guildRole || '').localeCompare(b.guildRole || '', 'vi');
      } else {
        diff = (a.stt || 0) - (b.stt || 0);
      }
      return sortAsc ? diff : -diff;
    });

    return sorted;
  }, [members, searchQuery, filterClass, filterRole, filterParticipation, filterTeam, sortField, sortAsc]);

  const handleStartEdit = (m: GuildMember) => {
    setEditingId(m.id);
    setEditIngame(m.ingame);
    setEditClass(m.className);
    setEditRole(m.guildRole);
    setEditParticipation(m.participation);
    setEditLoggedBy(m.loggedBy || m.discord || m.ingame);
    setEditTeam(m.team);
  };

  const handleSaveEdit = (id: string) => {
    if (!editIngame.trim()) return;
    const currentMember = members.find((m) => m.id === id);
    const teamChanged = currentMember && currentMember.team !== editTeam;
    const cleanLoggedBy = editLoggedBy.trim() || editIngame.trim();
    onUpdateMember(id, {
      ingame: editIngame.trim(),
      className: editClass,
      guildRole: editRole,
      participation: editParticipation,
      loggedBy: cleanLoggedBy,
      discord: cleanLoggedBy,
      team: editTeam,
      ...(teamChanged ? { party: undefined, slot: undefined } : {}),
    });
    setEditingId(null);
  };

  const handleSyncToGuildWarPool = () => {
    if (!onUpdatePersonnelPool) return;
    const existingSet = new Set(
      personnelPool.map((p) => normalizeName(p.ingame)).filter(Boolean)
    );
    const newPersonnel: PersonnelMember[] = [];
    const now = Date.now();
    members.forEach((m, idx) => {
      const norm = normalizeName(m.ingame);
      if (norm && !existingSet.has(norm)) {
        existingSet.add(norm);
        newPersonnel.push({
          id: `p_gw_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          ingame: m.ingame.trim(),
          className: m.className || 'Cửu Linh',
          loggedBy: (m.loggedBy || m.discord || m.ingame).trim(),
          note: m.note || '',
          createdAt: now,
        });
      }
    });

    if (newPersonnel.length > 0) {
      const updated = [...newPersonnel, ...personnelPool];
      onUpdatePersonnelPool(updated);
      alert(`Đã đồng bộ ${newPersonnel.length} nhân sự từ Bảng Bang Chiến vào Kho BC thành công!`);
    } else {
      alert('Tất cả nhân sự trong Bảng Bang Chiến đã có đầy đủ trong Kho BC!');
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngame.trim()) return;
    const cleanLoggedBy = newLoggedBy.trim() || newIngame.trim();
    onAddMember({
      stt: members.length + 1,
      ingame: newIngame.trim(),
      className: newClass,
      guildRole: newRole,
      participation: newParticipation,
      loggedBy: cleanLoggedBy,
      discord: cleanLoggedBy,
      team: newTeam,
      attendance: {},
    });

    if (onUpdatePersonnelPool) {
      const norm = normalizeName(newIngame.trim());
      const existsInPool = personnelPool.some((p) => normalizeName(p.ingame) === norm);
      if (!existsInPool) {
        const now = Date.now();
        onUpdatePersonnelPool([
          {
            id: `p_gw_${now}_${Math.random().toString(36).substring(2, 6)}`,
            ingame: newIngame.trim(),
            className: newClass,
            loggedBy: cleanLoggedBy,
            note: '',
            createdAt: now,
          },
          ...personnelPool,
        ]);
      }
    }

    setNewIngame('');
    setNewLoggedBy('');
    setIsAddOpen(false);
  };

  const handleProcessBatch = () => {
    if (!batchText.trim()) return;
    const lines = batchText.split('\n');
    let added = 0;
    const newPoolEntries: PersonnelMember[] = [];
    const poolNormSet = new Set(
      personnelPool.map((p) => normalizeName(p.ingame)).filter(Boolean)
    );
    const now = Date.now();

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Patterns: "Ingame - Class - LoggedBy" or "Ingame, Class" or tabs
      const parts = trimmed.split(/[\t,-]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        const ingame = parts[0];
        let matchedClass: RaidClass = 'Toái Mộng';
        if (parts.length > 1) {
          const rawClass = parts[1];
          const found = (Object.keys(RAID_CLASSES) as RaidClass[]).find(
            (c) => c.toLowerCase() === rawClass.toLowerCase()
          );
          if (found) matchedClass = found;
        }
        const loggedBy = parts[2] ? parts[2].trim() : ingame.trim();
        onAddMember({
          stt: members.length + added + 1,
          ingame,
          className: matchedClass,
          guildRole: 'Thành Viên',
          participation: 'Cả hai',
          loggedBy,
          discord: loggedBy,
          team: 'Chưa xếp',
          attendance: {},
        });

        const norm = normalizeName(ingame);
        if (norm && !poolNormSet.has(norm)) {
          poolNormSet.add(norm);
          newPoolEntries.push({
            id: `p_gw_${now}_${added}_${Math.random().toString(36).substring(2, 6)}`,
            ingame,
            className: matchedClass,
            loggedBy,
            note: '',
            createdAt: now,
          });
        }

        added++;
      }
    });

    if (onUpdatePersonnelPool && newPoolEntries.length > 0) {
      onUpdatePersonnelPool([...newPoolEntries, ...personnelPool]);
    }

    setBatchText('');
    setIsBatchOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm Ingame, Logged by..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Filter Class */}
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none"
            >
              <option value="ALL">Môn phái (Tất cả)</option>
              {(Object.keys(RAID_CLASSES) as RaidClass[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Filter Role */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none"
            >
              <option value="ALL">Chức vụ (Tất cả)</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Filter Participation */}
            <select
              value={filterParticipation}
              onChange={(e) => setFilterParticipation(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none"
            >
              <option value="ALL">Tham gia (Tất cả)</option>
              {ALL_PARTICIPATION.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Filter Team */}
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none"
            >
              <option value="ALL">Team (Tất cả)</option>
              {ALL_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => toggleSort('className')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                sortField === 'className'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
              title="Gom và sắp xếp toàn bộ danh sách theo môn phái"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Gom theo môn phái</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm nhân sự</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBatchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all"
              title="Dán danh sách nhiều thành viên cùng lúc"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dán danh sách</span>
            </button>

            {onUpdatePersonnelPool && (
              <button
                type="button"
                onClick={handleSyncToGuildWarPool}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Đồng bộ toàn bộ danh sách thành viên trong Bảng Bang Chiến vào Kho BC"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Đồng bộ Kho BC</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsImportFromMasterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Nhập thêm nhân sự từ Tổng kho nhân sự hoặc Kho BC vào bảng Bang Chiến"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Nhập từ Kho nhân sự</span>
              <span className="md:hidden">Nhập từ Kho</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Form Modal / Drawer */}
      {isAddOpen && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-600" />
              Thêm Nhân Sự Bang Chiến Mới
            </h3>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="p-1 text-slate-400 hover:text-black dark:hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateNew} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                placeholder="Ví dụ: Nhập tên ingame..."
                className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Môn Phái *
              </label>
              <select
                value={newClass}
                onChange={(e) => setNewClass(e.target.value as RaidClass)}
                className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none"
              >
                {(Object.keys(RAID_CLASSES) as RaidClass[]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chức Vụ
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as GuildRole)}
                className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tham Gia
              </label>
              <select
                value={newParticipation}
                onChange={(e) => setNewParticipation(e.target.value as GuildParticipation)}
                className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none"
              >
                {ALL_PARTICIPATION.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Team
              </label>
              <select
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value as GuildTeam)}
                className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none"
              >
                {ALL_TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Logged by (Người log)
                </label>
                {newIngame && (
                  <button
                    type="button"
                    onClick={() => setNewLoggedBy(newIngame)}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Lấy theo Ingame
                  </button>
                )}
              </div>
              <input
                type="text"
                value={newLoggedBy}
                onChange={(e) => setNewLoggedBy(e.target.value)}
                placeholder="VD: Tên người log hoặc Ingame"
                className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-xs"
              >
                Lưu nhân sự
              </button>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl"
              >
                Đóng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Paste Dialog */}
      {isBatchOpen && (
        <div className="bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Dán Nhanh Danh Sách Nhân Sự (Mỗi dòng 1 người)
            </h3>
            <button
              type="button"
              onClick={() => setIsBatchOpen(false)}
              className="p-1 text-slate-400 hover:text-black dark:hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Hỗ trợ định dạng: <code>Tên_Ingame - Môn_Phái - Logged_By</code> hoặc copy từ Excel/Google Sheets.
          </p>
          <textarea
            rows={5}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={`Ingame1 - Cửu Linh - NgườiLog1\nIngame2 - Huyết Hà\nIngame3 - Long Ngâm - NgườiLog3\nIngame4 - Thần Tướng`}
            className="w-full p-3 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBatchOpen(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleProcessBatch}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs"
            >
              Nạp danh sách
            </button>
          </div>
        </div>
      )}

      {/* Main Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider select-none">
                <th
                  onClick={() => toggleSort('stt')}
                  className="py-2.5 px-3 text-center w-12 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/60"
                  title="Nhấp để sắp xếp theo STT"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>STT</span>
                    {sortField === 'stt' && <ArrowUpDown className="w-3 h-3 text-amber-500" />}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('ingame')}
                  className="py-2.5 px-3 min-w-[160px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/60"
                  title="Nhấp để sắp xếp theo Tên Ingame (A-Z)"
                >
                  <div className="flex items-center gap-1">
                    <span>Tên Ingame</span>
                    {sortField === 'ingame' && <ArrowUpDown className="w-3 h-3 text-amber-500" />}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('className')}
                  className="py-2.5 px-3 min-w-[130px] text-center cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  title="Nhấp để gom theo Môn phái"
                >
                  <div className="inline-flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 font-black">
                    <span>Lưu Phái</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('guildRole')}
                  className="py-2.5 px-3 min-w-[110px] text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/60"
                  title="Nhấp để sắp xếp theo Chức vụ"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Chức Vụ</span>
                    {sortField === 'guildRole' && <ArrowUpDown className="w-3 h-3 text-amber-500" />}
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[110px] text-center">Tham Gia</th>
                <th
                  onClick={() => toggleSort('team')}
                  className="py-2.5 px-3 min-w-[110px] text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/60"
                  title="Nhấp để sắp xếp theo Team Bang Chiến"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Team Bang Chiến</span>
                    {sortField === 'team' && <ArrowUpDown className="w-3 h-3 text-amber-500" />}
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[140px]">Logged by</th>
                <th className="py-2.5 px-3 text-center w-28">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Không tìm thấy nhân sự phù hợp.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => {
                  const classMeta = getEffectiveClassMeta(member.className, customColors);
                  const isEditing = editingId === member.id;

                  if (isEditing) {
                    return (
                      <tr key={member.id} className="bg-amber-50/50 dark:bg-amber-950/20">
                        <td className="py-2 px-3 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editIngame}
                            onChange={(e) => setEditIngame(e.target.value)}
                            className="w-full px-2 py-1 text-xs font-bold border border-amber-400 rounded-lg bg-white dark:bg-slate-800"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={editClass}
                            onChange={(e) => setEditClass(e.target.value as RaidClass)}
                            className="px-2 py-1 text-xs font-bold border border-amber-400 rounded-lg bg-white dark:bg-slate-800"
                          >
                            {(Object.keys(RAID_CLASSES) as RaidClass[]).map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as GuildRole)}
                            className="px-2 py-1 text-xs font-bold border border-amber-400 rounded-lg bg-white dark:bg-slate-800"
                          >
                            {ALL_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={editParticipation}
                            onChange={(e) =>
                              setEditParticipation(e.target.value as GuildParticipation)
                            }
                            className="px-2 py-1 text-xs font-bold border border-amber-400 rounded-lg bg-white dark:bg-slate-800"
                          >
                            {ALL_PARTICIPATION.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={editTeam}
                            onChange={(e) => setEditTeam(e.target.value as GuildTeam)}
                            className="px-2 py-1 text-xs font-bold border border-amber-400 rounded-lg bg-white dark:bg-slate-800"
                          >
                            {ALL_TEAMS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editLoggedBy}
                            onChange={(e) => setEditLoggedBy(e.target.value)}
                            placeholder="Người log"
                            className="w-full px-2 py-1 text-xs font-bold border border-amber-400 rounded-lg bg-white dark:bg-slate-800"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(member.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg"
                              title="Lưu"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-black text-slate-900 dark:text-white">
                          {member.ingame}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className="inline-block px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs"
                          style={{
                            backgroundColor: classMeta.bgColor,
                            color: classMeta.textColor,
                          }}
                        >
                          {member.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            member.guildRole === 'Bang Chủ'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200'
                              : member.guildRole === 'Phó Bang'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-200'
                              : member.guildRole === 'Trưởng Lão'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-200'
                              : member.guildRole === 'Đường Chủ'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200'
                              : member.guildRole === 'Tinh Anh'
                              ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {member.guildRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            member.participation === 'Cả hai'
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300'
                              : member.participation === 'Bang chiến'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                              : member.participation === 'Raid'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {member.participation}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={['Mid', 'Cơ động', 'Đẩy trụ'].includes(member.team) ? member.team : 'Chưa xếp'}
                          onChange={(e) => {
                            const newTeam = e.target.value as GuildTeam;
                            onUpdateMember(member.id, {
                              team: newTeam,
                              ...(member.team !== newTeam ? { party: undefined, slot: undefined } : {}),
                            });
                          }}
                          title="Chọn Team trực tiếp cho nhân sự này"
                          className={`text-xs font-black px-2.5 py-1 rounded-xl border cursor-pointer transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                            member.team === 'Mid'
                              ? 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700'
                              : member.team === 'Cơ động'
                              ? 'bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-700'
                              : member.team === 'Đẩy trụ'
                              ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700'
                              : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          <option value="Chưa xếp">Chưa xếp</option>
                          <option value="Mid">Mid</option>
                          <option value="Cơ động">Cơ động</option>
                          <option value="Đẩy trụ">Đẩy trụ</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                          {member.loggedBy || member.discord || member.ingame || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(member)}
                            className="p-1 text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMember(member.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-semibold">
          <span>
            Hiển thị <strong>{filteredMembers.length}</strong> / <strong>{members.length}</strong> nhân sự bang chiến
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <span>Mid: <strong>{members.filter((m) => m.team === 'Mid').length}</strong></span>
            <span>Cơ động: <strong>{members.filter((m) => m.team === 'Cơ động').length}</strong></span>
            <span>Đẩy trụ: <strong>{members.filter((m) => m.team === 'Đẩy trụ').length}</strong></span>
            <span>Chưa xếp: <strong>{members.filter((m) => !m.team || m.team === 'Chưa xếp' || m.team === 'Top' || m.team === 'Bot').length}</strong></span>
          </div>
        </div>
      </div>

      {/* Modal Chọn Nhân Sự Từ Tổng Kho / Kho BC */}
      <ImportFromMasterModal
        isOpen={isImportFromMasterOpen}
        onClose={() => setIsImportFromMasterOpen(false)}
        masterPersonnelPool={masterPersonnelPool}
        guildWarPersonnelPool={personnelPool}
        currentBoardMembers={members}
        customColors={customColors}
        onImportSelected={onImportSelectedMembers}
      />
    </div>
  );
};
