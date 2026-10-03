import React, { useState, useRef, useMemo } from 'react';
import {
  GuildMember,
  GuildWarSession,
  CustomClassColors,
} from '../../types';
import { CLASS_LIST, getEffectiveClassMeta } from '../../constants/classes';
import {
  Check,
  Plus,
  Trash2,
  Calendar,
  Share2,
  CheckSquare,
  Square,
  Sparkles,
  Download,
  Search,
  X,
  Filter,
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';

interface GuildAttendanceTabProps {
  members: GuildMember[];
  sessions: GuildWarSession[];
  minAttendanceRequired: number;
  reportDate?: string;
  customColors?: CustomClassColors;
  onUpdateMember: (id: string, updates: Partial<GuildMember>) => void;
  onAddSession: (label: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateSession: (sessionId: string, newLabel: string) => void;
  onUpdateBoardSettings: (updates: { minAttendanceRequired?: number; reportDate?: string }) => void;
}

export const GuildAttendanceTab: React.FC<GuildAttendanceTabProps> = ({
  members,
  sessions,
  minAttendanceRequired,
  reportDate = '30/08/2026',
  customColors,
  onUpdateMember,
  onAddSession,
  onDeleteSession,
  onUpdateSession,
  onUpdateBoardSettings,
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionLabel, setEditSessionLabel] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Toggle single member attendance for a session
  const handleToggleAttendance = (member: GuildMember, sessionId: string) => {
    const current = !!member.attendance?.[sessionId];
    const newAttendance = {
      ...(member.attendance || {}),
      [sessionId]: !current,
    };
    onUpdateMember(member.id, { attendance: newAttendance });
  };

  // Toggle all members for a session
  const handleToggleAllForSession = (sessionId: string) => {
    const allChecked = members.every((m) => !!m.attendance?.[sessionId]);
    members.forEach((m) => {
      const newAttendance = {
        ...(m.attendance || {}),
        [sessionId]: !allChecked,
      };
      onUpdateMember(m.id, { attendance: newAttendance });
    });
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    onAddSession(newSessionName.trim());
    setNewSessionName('');
    setIsAddingSession(false);
  };

  const handleStartEditSession = (s: GuildWarSession) => {
    setEditingSessionId(s.id);
    setEditSessionLabel(s.label);
  };

  const handleSaveEditSession = (sessionId: string) => {
    if (editSessionLabel.trim()) {
      onUpdateSession(sessionId, editSessionLabel.trim());
    }
    setEditingSessionId(null);
  };

  // Export report as image
  const handleExportImage = async () => {
    if (!tableRef.current) return;
    try {
      setIsExporting(true);
      const isDark = document.documentElement.classList.contains('dark');
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Bao_Cao_Diem_Danh_Bang_Chien_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export image error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate attendance count for a member
  const getMemberAttendanceCount = (member: GuildMember) => {
    let count = 0;
    sessions.forEach((s) => {
      if (member.attendance?.[s.id]) count++;
    });
    return count;
  };

  // Count members per class
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      if (m.className) {
        counts[m.className] = (counts[m.className] || 0) + 1;
      }
    });
    return counts;
  }, [members]);

  // Filter members by Class name or search query
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // 1. Dropdown / chip filter by class
      if (classFilter !== 'ALL' && member.className !== classFilter) {
        return false;
      }
      // 2. Search query (matches class name or ingame name)
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase().trim();
        const matchesClass = (member.className || '').toLowerCase().includes(q);
        const matchesIngame = (member.ingame || '').toLowerCase().includes(q);
        if (!matchesClass && !matchesIngame) {
          return false;
        }
      }
      return true;
    });
  }, [members, classFilter, searchKeyword]);

  // Summary stats (overall and filtered)
  const totalPassed = members.filter(
    (m) => getMemberAttendanceCount(m) >= minAttendanceRequired
  ).length;

  const filteredPassed = useMemo(() => {
    return filteredMembers.filter(
      (m) => getMemberAttendanceCount(m) >= minAttendanceRequired
    ).length;
  }, [filteredMembers, minAttendanceRequired]);

  return (
    <div className="space-y-4">
      {/* Settings & Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Summary and Threshold Config */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span>Chỉ tiêu Đạt:</span>
            <input
              type="number"
              min={1}
              max={sessions.length || 10}
              value={minAttendanceRequired}
              onChange={(e) =>
                onUpdateBoardSettings({
                  minAttendanceRequired: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className="w-14 px-2 py-1 text-center font-black border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
            />
            <span>buổi</span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          {/* Passed ratio */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Kết quả:</span>
            <span className="px-2 py-0.5 rounded-md font-black bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {totalPassed} / {members.length} Đạt ({members.length > 0 ? Math.round((totalPassed / members.length) * 100) : 0}%)
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          {/* Report Date editor */}
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ngày báo cáo:</span>
            <input
              type="text"
              value={reportDate}
              onChange={(e) => onUpdateBoardSettings({ reportDate: e.target.value })}
              className="w-24 px-1.5 py-0.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddingSession(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Thêm buổi chiến</span>
          </button>

          <button
            type="button"
            onClick={handleExportImage}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Đang xuất...' : 'Xuất ảnh báo cáo'}</span>
          </button>
        </div>
      </div>

      {/* Add Session Modal / Banner */}
      {isAddingSession && (
        <form
          onSubmit={handleCreateSession}
          className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 rounded-2xl p-3 flex items-center gap-2 animate-in fade-in"
        >
          <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
            Tên buổi chiến:
          </span>
          <input
            type="text"
            required
            autoFocus
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="Ví dụ: Tuần 4/T2 hoặc Trận Chung Kết"
            className="flex-1 max-w-xs px-3 py-1.5 text-xs font-bold border border-indigo-300 rounded-xl bg-white dark:bg-slate-800"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs"
          >
            Thêm cột
          </button>
          <button
            type="button"
            onClick={() => setIsAddingSession(false)}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl"
          >
            Hủy
          </button>
        </form>
      )}

      {/* Class Search & Filter Bar for Attendance & Report */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Input by Class Name or Ingame */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="🔍 Tìm kiếm theo tên môn phái (Thiết Y, Tố Vấn...) hoặc Ingame..."
              className="w-full pl-9 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Class Dropdown Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Lọc Môn Phái:</span>
            </span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
            >
              <option value="ALL">Tất cả môn phái ({members.length})</option>
              {CLASS_LIST.map((cls) => {
                const count = classCounts[cls] || 0;
                return (
                  <option key={cls} value={cls}>
                    {cls} ({count})
                  </option>
                );
              })}
            </select>

            {(classFilter !== 'ALL' || searchKeyword) && (
              <button
                type="button"
                onClick={() => {
                  setClassFilter('ALL');
                  setSearchKeyword('');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                ✕ Bỏ lọc
              </button>
            )}
          </div>
        </div>

        {/* Quick Clickable Class Chips with Native Badge Colors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setClassFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all shrink-0 cursor-pointer ${
              classFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả ({members.length})
          </button>

          {CLASS_LIST.filter((cls) => (classCounts[cls] || 0) > 0).map((cls) => {
            const isSelected = classFilter === cls;
            const count = classCounts[cls] || 0;
            const meta = getEffectiveClassMeta(cls, customColors);

            return (
              <button
                key={cls}
                type="button"
                onClick={() => setClassFilter(isSelected ? 'ALL' : cls)}
                style={{
                  backgroundColor: isSelected ? meta.bgColor : undefined,
                  color: isSelected ? meta.textColor : undefined,
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs ${
                  isSelected
                    ? 'ring-2 ring-amber-500/80 shadow-xs scale-105'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{cls}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-black/20 text-current' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter status summary banner */}
        {(classFilter !== 'ALL' || searchKeyword) && (
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1 pt-1">
            <span>
              Đang lọc theo môn phái: <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{classFilter !== 'ALL' ? classFilter : searchKeyword}</strong>
              {' '}— Tìm thấy <strong>{filteredMembers.length}</strong> / {members.length} thành viên
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Đạt chỉ tiêu: {filteredPassed} / {filteredMembers.length} ({filteredMembers.length > 0 ? Math.round((filteredPassed / filteredMembers.length) * 100) : 0}%)
            </span>
          </div>
        )}
      </div>

      {/* The Printable / Exportable Attendance Table (Identical format to Image 2) */}
      <div
        ref={tableRef}
        className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-md text-slate-900 dark:text-slate-100"
      >
        {/* Filtered Header Banner inside printable report */}
        {(classFilter !== 'ALL' || searchKeyword) && (
          <div className="bg-slate-800 dark:bg-slate-950 text-amber-400 py-2 px-3 text-xs font-black flex items-center justify-between border-b border-slate-700">
            <span className="flex items-center gap-1.5">
              <span>📋</span>
              <span>BÁO CÁO ĐIỂM DANH MÔN PHÁI:</span>
              <span className="text-white uppercase px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                {classFilter !== 'ALL' ? classFilter : searchKeyword}
              </span>
            </span>
            <span className="text-slate-300 text-[11px] font-bold">
              {filteredMembers.length} thành viên ({filteredPassed} Đạt chỉ tiêu)
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 dark:bg-slate-950 text-white border-b-2 border-slate-700 text-[11px] font-black uppercase tracking-wider">
                <th className="py-2.5 px-2 text-center border-r border-slate-600 dark:border-slate-800 w-10">
                  STT
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600 dark:border-slate-800 min-w-[150px]">
                  Tên Thành Viên
                </th>
                <th className="py-2.5 px-3 border-r border-slate-600 dark:border-slate-800 min-w-[120px] text-center">
                  Lưu Phái
                </th>

                {/* Session Checkbox Columns */}
                {sessions.map((session) => (
                  <th
                    key={session.id}
                    className="py-2.5 px-2 border-r border-slate-600 dark:border-slate-800 text-center min-w-[70px] relative group"
                  >
                    {editingSessionId === session.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editSessionLabel}
                          onChange={(e) => setEditSessionLabel(e.target.value)}
                          className="w-16 px-1 py-0.5 text-[10px] text-black dark:text-white dark:bg-slate-800 rounded border border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditSession(session.id)}
                          className="text-emerald-400 hover:text-emerald-200"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => handleStartEditSession(session)}
                          title="Click để đổi tên buổi"
                        >
                          {session.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleAllForSession(session.id)}
                          title="Bật/Tắt tất cả thành viên trong buổi này"
                          className="text-[9px] text-slate-300 hover:text-white underline font-normal"
                        >
                          Tất cả
                        </button>
                      </div>
                    )}

                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        title="Xóa cột này"
                        className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-200 p-0.5"
                      >
                        ×
                      </button>
                    )}
                  </th>
                ))}

                <th className="py-2.5 px-2 border-r border-slate-600 dark:border-slate-800 text-center min-w-[75px] font-black">
                  Số Buổi Đi
                </th>
                <th className="py-2.5 px-3 text-center min-w-[90px] font-black">
                  Trạng Thái
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + sessions.length}
                    className="py-8 text-center text-slate-400 font-bold"
                  >
                    {members.length === 0
                      ? 'Chưa có thành viên nào trong danh sách. Hãy thêm nhân sự ở tab Bảng Nhân Sự!'
                      : 'Không tìm thấy thành viên nào phù hợp với bộ lọc môn phái.'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, idx) => {
                  const classMeta = getEffectiveClassMeta(member.className, customColors);
                  const attendanceCount = getMemberAttendanceCount(member);
                  const isPassed = attendanceCount >= minAttendanceRequired;

                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-2 px-2 text-center font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        {idx + 1}
                      </td>

                      {/* Tên Thành Viên */}
                      <td className="py-2 px-3 font-black text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                        {member.ingame}
                      </td>

                      {/* Lưu Phái (Màu badge y như hình 2) */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded text-[11px] font-black shadow-2xs"
                          style={{
                            backgroundColor: classMeta.bgColor,
                            color: classMeta.textColor,
                          }}
                        >
                          {member.className}
                        </span>
                      </td>

                      {/* Attendance checkboxes for each session */}
                      {sessions.map((session) => {
                        const checked = !!member.attendance?.[session.id];
                        return (
                          <td
                            key={session.id}
                            onClick={() => handleToggleAttendance(member, session.id)}
                            className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40"
                          >
                            <div className="flex items-center justify-center">
                              {checked ? (
                                <div className="w-4 h-4 rounded bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Số Buổi Đi */}
                      <td className="py-2 px-2 text-center font-black text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                        {attendanceCount}
                      </td>

                      {/* Trạng Thái (Đạt / Không Đạt) */}
                      <td className="py-2 px-3 text-center font-black">
                        {isPassed ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">
                            Đạt
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            Không Đạt
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Summary and Date */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-black text-slate-800 dark:text-slate-200">
                <td colSpan={3} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-right">
                  Tổng lượt tham gia:
                </td>
                {sessions.map((session) => {
                  const countForSession = members.filter(
                    (m) => !!m.attendance?.[session.id]
                  ).length;
                  return (
                    <td
                      key={session.id}
                      className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {countForSession}
                    </td>
                  );
                })}
                <td className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  {members.reduce(
                    (acc, m) => acc + getMemberAttendanceCount(m),
                    0
                  )}
                </td>
                <td className="py-2.5 px-3 text-center text-red-600 dark:text-red-400 font-black">
                  {reportDate}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
