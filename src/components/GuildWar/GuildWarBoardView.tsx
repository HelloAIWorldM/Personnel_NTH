import React, { useState } from 'react';
import {
  GuildWarBoard,
  GuildMember,
  GuildTeam,
  CustomClassColors,
  PersonnelMember,
  RaidMember,
} from '../../types';
import { GuildRosterTab } from './GuildRosterTab';
import { GuildTeamsTab } from './GuildTeamsTab';
import { GuildAttendanceTab } from './GuildAttendanceTab';
import {
  Swords,
  Users,
  Shield,
  ClipboardCheck,
  Calendar,
  Edit2,
  Trash2,
  Copy,
  Plus,
  ArrowLeft,
  Check,
  Share2,
} from 'lucide-react';
import { generateGuildWarShareLink } from '../../utils/storageBackup';

interface GuildWarBoardViewProps {
  board: GuildWarBoard;
  customColors?: CustomClassColors;
  personnelPool?: PersonnelMember[];
  raidMembers?: RaidMember[];
  onUpdateBoard: (updatedBoard: GuildWarBoard) => void;
  onDeleteBoard: (boardId: string) => void;
  onDuplicateBoard: (board: GuildWarBoard) => void;
  onSwitchToRaidMode: () => void;
}

export type GuildWarActiveTab = 'roster' | 'teams' | 'attendance';

export const GuildWarBoardView: React.FC<GuildWarBoardViewProps> = ({
  board,
  customColors,
  personnelPool = [],
  raidMembers = [],
  onUpdateBoard,
  onDeleteBoard,
  onDuplicateBoard,
  onSwitchToRaidMode,
}) => {
  const [activeTab, setActiveTab] = useState<GuildWarActiveTab>('roster');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tempTitle, setTempTitle] = useState(board.title);
  const [tempSchedule, setTempSchedule] = useState(board.scheduleTime);
  const [tempTarget, setTempTarget] = useState(board.targetName);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const handleCopyGuildWarShareLink = async () => {
    try {
      const shareUrl = generateGuildWarShareLink(board);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveHeader = () => {
    onUpdateBoard({
      ...board,
      title: tempTitle.trim() || board.title,
      scheduleTime: tempSchedule.trim() || board.scheduleTime,
      targetName: tempTarget.trim() || board.targetName,
    });
    setIsEditingHeader(false);
  };

  // Member CRUD
  const handleUpdateMember = (id: string, updates: Partial<GuildMember>) => {
    const updatedMembers = board.members.map((m) => {
      if (m.id !== id) return m;
      const updated: GuildMember = { ...m, ...updates, updatedAt: new Date().toISOString() };
      if (updates.party === undefined && 'party' in updates) delete updated.party;
      if (updates.slot === undefined && 'slot' in updates) delete updated.slot;
      if (updates.discord === undefined && 'discord' in updates) delete updated.discord;
      return updated;
    });
    onUpdateBoard({ ...board, members: updatedMembers });
  };

  const handleAddMember = (newMemData: Omit<GuildMember, 'id'>) => {
    const timestamp = Date.now();
    const newMember: GuildMember = {
      ...newMemData,
      id: `gw_m_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      stt: board.members.length + 1,
    };
    onUpdateBoard({ ...board, members: [...board.members, newMember] });
  };

  const handleDeleteMember = (id: string) => {
    const updatedMembers = board.members
      .filter((m) => m.id !== id)
      .map((m, idx) => ({ ...m, stt: idx + 1 }));
    onUpdateBoard({ ...board, members: updatedMembers });
  };

  // Move member to team
  const handleMoveToTeam = (id: string, team: GuildTeam) => {
    handleUpdateMember(id, { team });
  };

  // Import from Raid personnel
  const handleImportFromPersonnel = () => {
    const existingNames = new Set(board.members.map((m) => m.ingame.toLowerCase().trim()));
    const newMembersToAdd: GuildMember[] = [];
    const timestamp = Date.now();

    personnelPool.forEach((p) => {
      if (p.ingame && !existingNames.has(p.ingame.toLowerCase().trim())) {
        existingNames.add(p.ingame.toLowerCase().trim());
        newMembersToAdd.push({
          id: `gw_m_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
          stt: board.members.length + newMembersToAdd.length + 1,
          ingame: p.ingame,
          className: p.className,
          guildRole: 'Thành Viên',
          participation: 'Cả hai',
          team: 'Chưa xếp',
          attendance: {},
        });
      }
    });

    if (newMembersToAdd.length > 0) {
      onUpdateBoard({
        ...board,
        members: [...board.members, ...newMembersToAdd],
      });
    }
  };

  // Session CRUD for Attendance
  const handleAddSession = (label: string) => {
    const sessionId = `s_${Date.now()}`;
    const newSession = { id: sessionId, label };
    onUpdateBoard({
      ...board,
      sessions: [...board.sessions, newSession],
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = board.sessions.filter((s) => s.id !== sessionId);
    onUpdateBoard({
      ...board,
      sessions: updatedSessions,
    });
  };

  const handleUpdateSession = (sessionId: string, newLabel: string) => {
    const updatedSessions = board.sessions.map((s) =>
      s.id === sessionId ? { ...s, label: newLabel } : s
    );
    onUpdateBoard({
      ...board,
      sessions: updatedSessions,
    });
  };

  const handleUpdateBoardSettings = (updates: {
    minAttendanceRequired?: number;
    reportDate?: string;
  }) => {
    onUpdateBoard({
      ...board,
      ...updates,
    });
  };

  // Quick stats
  const midCount = board.members.filter((m) => m.team === 'Mid').length;
  const coDongCount = board.members.filter((m) => m.team === 'Cơ động').length;
  const dayTruCount = board.members.filter((m) => m.team === 'Đẩy trụ').length;
  const unassignedCount = board.members.filter(
    (m) => !m.team || m.team === 'Chưa xếp' || m.team === 'Top' || m.team === 'Bot'
  ).length;

  return (
    <div className="space-y-4">
      {/* Board Header Card */}
      <section className="bg-[#101A24] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Info */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shrink-0">
              <Swords className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              {isEditingHeader ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="px-2.5 py-1 text-base font-black border border-[#1F3347] focus:border-amber-500 rounded-lg bg-[#0B1219] text-white"
                    placeholder="Tên bảng..."
                  />
                  <input
                    type="text"
                    value={tempSchedule}
                    onChange={(e) => setTempSchedule(e.target.value)}
                    className="px-2 py-1 text-xs font-bold border border-[#1F3347] focus:border-amber-500 rounded-lg bg-[#0B1219] text-white"
                    placeholder="Lịch chiến..."
                  />
                  <input
                    type="text"
                    value={tempTarget}
                    onChange={(e) => setTempTarget(e.target.value)}
                    className="px-2 py-1 text-xs font-bold border border-[#1F3347] focus:border-amber-500 rounded-lg bg-[#0B1219] text-white"
                    placeholder="Mục tiêu..."
                  />
                  <button
                    type="button"
                    onClick={handleSaveHeader}
                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                      {board.title}
                    </h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950/80 text-rose-300 border border-rose-800/80">
                      BANG CHIẾN
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingHeader(true)}
                      className="text-[#8CA4B8] hover:text-white p-1 transition-colors"
                      title="Sửa tên bảng và thông tin"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#CADEEA] mt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-bold text-red-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {board.scheduleTime}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-300">Mục tiêu: {board.targetName}</span>
                    <span>•</span>
                    <span className="font-bold text-[#88DCFA]">
                      Quân số: {board.members.length} người
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Team Counts & Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold bg-[#0B1219] px-3 py-1.5 rounded-xl border border-[#1F3347] shadow-xs flex-wrap">
              <span className="text-rose-400">{midCount} Mid</span>
              <span className="text-slate-600">•</span>
              <span className="text-sky-400">{coDongCount} Cơ động</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">{dayTruCount} Đẩy trụ</span>
              {unassignedCount > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-[#8CA4B8]">{unassignedCount} Dự bị</span>
                </>
              )}
            </div>

            {/* Share Guild War Link Button */}
            <button
              type="button"
              onClick={handleCopyGuildWarShareLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Sao chép link chia sẻ bảng Bang Chiến này cho các thành viên"
            >
              {copiedShareLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedShareLink ? 'Đã copy link!' : 'Chia sẻ link'}</span>
            </button>

            <button
              type="button"
              onClick={() => onDuplicateBoard(board)}
              className="p-2 bg-[#162230] hover:bg-[#1F3347] border border-[#1F3347] rounded-xl text-slate-300 hover:text-white transition-colors shadow-2xs cursor-pointer"
              title="Nhân bản bảng Bang Chiến này"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 bg-[#162230] hover:bg-rose-950/40 border border-[#1F3347] hover:border-rose-900/50 text-rose-400 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Xóa bảng Bang Chiến này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Main Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#1F3347] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeTab === 'roster'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-102'
                : 'bg-[#162230] text-slate-300 hover:text-white hover:bg-[#1F3347] border border-[#1F3347]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Bảng Nhân Sự ({board.members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeTab === 'teams'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-102'
                : 'bg-[#162230] text-slate-300 hover:text-white hover:bg-[#1F3347] border border-[#1F3347]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>2. Sơ Đồ Chia Team Bang Chiến</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-102'
                : 'bg-[#162230] text-slate-300 hover:text-white hover:bg-[#1F3347] border border-[#1F3347]'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>3. Bảng Điểm Danh & Báo Cáo</span>
          </button>
        </div>
      </section>

      {/* Tab Contents */}
      {activeTab === 'roster' && (
        <GuildRosterTab
          members={board.members}
          customColors={customColors}
          personnelPool={personnelPool}
          onUpdateMember={handleUpdateMember}
          onAddMember={handleAddMember}
          onDeleteMember={handleDeleteMember}
          onImportFromPersonnel={handleImportFromPersonnel}
          onMoveToTeam={handleMoveToTeam}
        />
      )}

      {activeTab === 'teams' && (
        <GuildTeamsTab
          members={board.members}
          customColors={customColors}
          onUpdateMember={handleUpdateMember}
        />
      )}

      {activeTab === 'attendance' && (
        <GuildAttendanceTab
          members={board.members}
          sessions={board.sessions}
          minAttendanceRequired={board.minAttendanceRequired}
          reportDate={board.reportDate}
          customColors={customColors}
          onUpdateMember={handleUpdateMember}
          onAddSession={handleAddSession}
          onDeleteSession={handleDeleteSession}
          onUpdateSession={handleUpdateSession}
          onUpdateBoardSettings={handleUpdateBoardSettings}
        />
      )}

      {/* Delete Guild War Board Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Xóa Bảng Bang Chiến?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Bạn có chắc chắn muốn xóa bảng <strong className="text-slate-900 dark:text-white font-black">"{board.title}"</strong>? Thao tác này không thể hoàn tác.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteBoard(board.id);
                }}
                className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
