import React, { useState, useRef, useMemo } from 'react';
import {
  GuildMember,
  GuildWarSession,
  CustomClassColors,
  RaidClass,
} from '../../types';
import { getEffectiveClassMeta } from '../../constants/classes';
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
  X,
  AlertTriangle,
  ArrowUpDown,
  UserCheck,
  Users,
  Layers,
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import {
  findGuildWarDuplicates,
  GuildWarDuplicateGroup,
  normalizeName,
} from '../../utils/duplicates';

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

export interface LoggedByGroup {
  key: string;
  loggedByName: string;
  members: GuildMember[];
  primaryClass: RaidClass;
  attendance: Record<string, boolean>;
  attendedMembersBySession: Record<string, GuildMember[]>;
  attendanceCount: number;
  isPassed: boolean;
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
  const [attendanceMode, setAttendanceMode] = useState<'loggedBy' | 'ingame'>('loggedBy');
  const [newSessionName, setNewSessionName] = useState('');
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionLabel, setEditSessionLabel] = useState('');
  const [sortField, setSortField] = useState<'stt' | 'className' | 'name'>('stt');
  const [sortAsc, setSortAsc] = useState(true);

  // Toggle single member attendance for a session
  const handleToggleAttendance = (member: GuildMember, sessionId: string) => {
    const current = !!member.attendance?.[sessionId];
    const newAttendance = {
      ...(member.attendance || {}),
      [sessionId]: !current,
    };
    onUpdateMember(member.id, { attendance: newAttendance });
  };

  // Toggle attendance for a LoggedBy group
  const handleToggleGroupAttendance = (group: LoggedByGroup, sessionId: string) => {
    const isCurrentlyChecked = !!group.attendance[sessionId];
    if (isCurrentlyChecked) {
      // Uncheck all accounts piloted by this person for this session
      group.members.forEach((m) => {
        if (m.attendance?.[sessionId]) {
          onUpdateMember(m.id, {
            attendance: {
              ...(m.attendance || {}),
              [sessionId]: false,
            },
          });
        }
      });
    } else {
      // Check the first/primary account for this person
      const targetMember = group.members[0];
      if (targetMember) {
        onUpdateMember(targetMember.id, {
          attendance: {
            ...(targetMember.attendance || {}),
            [sessionId]: true,
          },
        });
      }
    }
  };

  // Switch which specific character attended for a LoggedBy group in a given session
  const handleCycleGroupCharacterAttendance = (
    e: React.MouseEvent,
    group: LoggedByGroup,
    sessionId: string,
    targetMemberId: string
  ) => {
    e.stopPropagation();
    group.members.forEach((m) => {
      const shouldCheck = m.id === targetMemberId;
      onUpdateMember(m.id, {
        attendance: {
          ...(m.attendance || {}),
          [sessionId]: shouldCheck,
        },
      });
    });
  };

  // Toggle all for a session (in active mode)
  const handleToggleAllForSession = (sessionId: string) => {
    if (attendanceMode === 'loggedBy') {
      const allChecked = loggedByGroups.every((g) => !!g.attendance[sessionId]);
      loggedByGroups.forEach((g) => {
        if (allChecked) {
          // Uncheck all
          g.members.forEach((m) => {
            if (m.attendance?.[sessionId]) {
              onUpdateMember(m.id, {
                attendance: { ...(m.attendance || {}), [sessionId]: false },
              });
            }
          });
        } else {
          // Check primary member
          const first = g.members[0];
          if (first && !g.attendance[sessionId]) {
            onUpdateMember(first.id, {
              attendance: { ...(first.attendance || {}), [sessionId]: true },
            });
          }
        }
      });
    } else {
      const allChecked = members.every((m) => !!m.attendance?.[sessionId]);
      members.forEach((m) => {
        const newAttendance = {
          ...(m.attendance || {}),
          [sessionId]: !allChecked,
        };
        onUpdateMember(m.id, { attendance: newAttendance });
      });
    }
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
      const modeSuffix = attendanceMode === 'loggedBy' ? 'Theo_Nguoi_Log' : 'Theo_Ingame';
      link.download = `Bao_Cao_Diem_Danh_Bang_Chien_${modeSuffix}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export image error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate attendance count for a single member
  const getMemberAttendanceCount = (member: GuildMember) => {
    let count = 0;
    sessions.forEach((s) => {
      if (member.attendance?.[s.id]) count++;
    });
    return count;
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

  // Build LoggedBy Groups (Gom nhóm theo người điều khiển thực tế)
  const loggedByGroups = useMemo<LoggedByGroup[]>(() => {
    const map = new Map<string, { loggedByName: string; members: GuildMember[] }>();

    members.forEach((m) => {
      const rawLogged = (m.loggedBy && m.loggedBy.trim()) || m.ingame.trim();
      const key = normalizeName(rawLogged);
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.members.push(m);
      } else {
        map.set(key, { loggedByName: rawLogged, members: [m] });
      }
    });

    const groups: LoggedByGroup[] = [];
    map.forEach(({ loggedByName, members: gMembers }, key) => {
      const attendance: Record<string, boolean> = {};
      const attendedMembersBySession: Record<string, GuildMember[]> = {};
      let count = 0;

      sessions.forEach((s) => {
        const attending = gMembers.filter((m) => !!m.attendance?.[s.id]);
        if (attending.length > 0) {
          attendance[s.id] = true;
          attendedMembersBySession[s.id] = attending;
          count++;
        } else {
          attendance[s.id] = false;
          attendedMembersBySession[s.id] = [];
        }
      });

      // Ưu tiên lấy phái của chính acc trùng tên người lái (nếu có), nếu không mới fallback về acc đầu tiên
      const matchedSelf = gMembers.find(
        (m) => normalizeName(m.ingame) === normalizeName(loggedByName)
      );
      const primaryClass = matchedSelf?.className || gMembers[0]?.className || 'Toái Mộng';

      groups.push({
        key,
        loggedByName,
        members: gMembers,
        primaryClass,
        attendance,
        attendedMembersBySession,
        attendanceCount: count,
        isPassed: count >= minAttendanceRequired,
      });
    });

    return groups;
  }, [members, sessions, minAttendanceRequired]);

  // Sort loggedBy groups
  const sortedLoggedByGroups = useMemo(() => {
    const sorted = [...loggedByGroups];
    sorted.sort((a, b) => {
      let diff = 0;
      if (sortField === 'className') {
        diff = getClassOrderIndex(a.primaryClass) - getClassOrderIndex(b.primaryClass);
        if (diff === 0) diff = a.loggedByName.localeCompare(b.loggedByName, 'vi');
      } else if (sortField === 'name') {
        diff = a.loggedByName.localeCompare(b.loggedByName, 'vi');
      } else {
        diff = b.attendanceCount - a.attendanceCount || a.loggedByName.localeCompare(b.loggedByName, 'vi');
      }
      return sortAsc ? diff : -diff;
    });
    return sorted;
  }, [loggedByGroups, sortField, sortAsc]);

  // Sort raw members for Ingame view
  const sortedMembers = useMemo(() => {
    const sorted = [...members];
    sorted.sort((a, b) => {
      let diff = 0;
      if (sortField === 'className') {
        diff = getClassOrderIndex(a.className) - getClassOrderIndex(b.className);
        if (diff === 0) diff = a.ingame.localeCompare(b.ingame, 'vi');
      } else if (sortField === 'name') {
        diff = a.ingame.localeCompare(b.ingame, 'vi');
      } else {
        diff = (a.stt || 0) - (b.stt || 0);
      }
      return sortAsc ? diff : -diff;
    });
    return sorted;
  }, [members, sortField, sortAsc]);

  const toggleSort = (field: 'stt' | 'className' | 'name') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Summary stats based on active mode
  const totalPassed =
    attendanceMode === 'loggedBy'
      ? loggedByGroups.filter((g) => g.isPassed).length
      : members.filter((m) => getMemberAttendanceCount(m) >= minAttendanceRequired).length;

  const totalCount = attendanceMode === 'loggedBy' ? loggedByGroups.length : members.length;
  const passRate = totalCount > 0 ? Math.round((totalPassed / totalCount) * 100) : 0;

  // Duplicate member detection for attendance list
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

  return (
    <div className="space-y-4">
      {/* View Mode Switcher: Logged By vs Ingame */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setAttendanceMode('loggedBy')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              attendanceMode === 'loggedBy'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Gom theo Người Log (Logged by)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black uppercase">
              Đề xuất
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAttendanceMode('ingame')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              attendanceMode === 'ingame'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Theo Tên Nhân Vật (Ingame)</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            {attendanceMode === 'loggedBy'
              ? 'Tự động cộng dồn số buổi khi 1 người chơi đổi nhiều acc/class linh hoạt'
              : 'Hiển thị và tích điểm riêng biệt cho từng tài khoản nhân vật'}
          </span>
        </div>
      </div>

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
              {totalPassed} / {totalCount} Đạt ({passRate}%)
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

      {/* Cảnh Báo Trùng Nhân Sự Điểm Danh (chỉ khi xem theo Ingame) */}
      {attendanceMode === 'ingame' && duplicateGroups.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-3 sm:p-4 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-black text-rose-700 dark:text-rose-400 text-xs sm:text-sm mb-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse shrink-0" />
            <span>
              CẢNH BÁO TRÙNG NHÂN SỰ ĐIỂM DANH ({duplicateGroups.length} tên nhân sự bị trùng lặp)
            </span>
          </div>
          <p className="text-[11px] text-rose-800 dark:text-rose-300 mb-2">
            Các nhân sự sau đây đang xuất hiện nhiều lần trong danh sách điểm danh và báo cáo:
          </p>
          <div className="flex flex-wrap gap-2">
            {duplicateGroups.map((group) => (
              <span
                key={group.key}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-slate-800 dark:text-slate-200 text-xs font-bold"
              >
                <span>{group.originalName}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                  Trùng {group.count} dòng
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* The Printable / Exportable Attendance Table */}
      <div
        ref={tableRef}
        className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-md text-slate-900 dark:text-slate-100"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 dark:bg-slate-950 text-white border-b-2 border-slate-700 text-[11px] font-black uppercase tracking-wider select-none">
                <th
                  onClick={() => toggleSort('stt')}
                  className="py-2.5 px-2 text-center border-r border-slate-600 dark:border-slate-800 w-12 cursor-pointer hover:bg-slate-700/60 transition-colors"
                  title="Nhấp để sắp xếp theo STT"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>STT</span>
                    {sortField === 'stt' && <ArrowUpDown className="w-3 h-3 text-amber-400" />}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('name')}
                  className="py-2.5 px-3 border-r border-slate-600 dark:border-slate-800 min-w-[180px] cursor-pointer hover:bg-slate-700/60 transition-colors"
                  title={attendanceMode === 'loggedBy' ? 'Nhấp để sắp xếp theo Người Log' : 'Nhấp để sắp xếp theo Tên Thành Viên'}
                >
                  <div className="flex items-center gap-1">
                    <span>{attendanceMode === 'loggedBy' ? 'Người Log (Cầm Acc)' : 'Tên Thành Viên'}</span>
                    {sortField === 'name' && <ArrowUpDown className="w-3 h-3 text-amber-400" />}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('className')}
                  className="py-2.5 px-3 border-r border-slate-600 dark:border-slate-800 min-w-[120px] text-center cursor-pointer hover:bg-slate-700/60 transition-colors"
                  title="Nhấp để gom theo Môn phái"
                >
                  <div className="inline-flex items-center justify-center gap-1 text-emerald-400 font-black">
                    <span>Lưu Phái</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </th>

                {/* Session Checkbox Columns */}
                {sessions.map((session) => (
                  <th
                    key={session.id}
                    className="py-2.5 px-2 border-r border-slate-600 dark:border-slate-800 text-center min-w-[75px] relative group"
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
                          className="text-emerald-400 hover:text-emerald-200 inline-flex items-center"
                          title="Lưu"
                        >
                          <Check className="w-3.5 h-3.5" />
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
              {/* CHẾ ĐỘ 1: GOM THEO NGƯỜI LOG (LOGGED BY) */}
              {attendanceMode === 'loggedBy' ? (
                sortedLoggedByGroups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5 + sessions.length}
                      className="py-8 text-center text-slate-400 font-bold"
                    >
                      Chưa có dữ liệu người chơi. Hãy thêm nhân sự ở tab Bảng Nhân Sự!
                    </td>
                  </tr>
                ) : (
                  sortedLoggedByGroups.map((group, idx) => {
                    const classMeta = getEffectiveClassMeta(group.primaryClass, customColors);
                    const isMultiAcc = group.members.length > 1;

                    return (
                      <tr
                        key={group.key}
                        className={`border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          idx % 2 === 1
                            ? 'bg-slate-50/70 dark:bg-slate-800/40'
                            : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        {/* STT */}
                        <td className="py-2 px-2 text-center font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                          {idx + 1}
                        </td>

                        {/* Tên Người Log + Badges các Acc Ingame */}
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white">
                              <span>{group.loggedByName}</span>
                              {isMultiAcc && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  <Layers className="w-2.5 h-2.5" />
                                  <span>{group.members.length} acc</span>
                                </span>
                              )}
                            </div>

                            {/* Danh sách acc thuộc về người này */}
                            <div className="flex flex-wrap gap-1">
                              {group.members.map((m) => {
                                const mMeta = getEffectiveClassMeta(m.className, customColors);
                                return (
                                  <span
                                    key={m.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: mMeta.bgColor }}
                                    />
                                    <span>{m.ingame}</span>
                                    <span className="text-[9px] text-slate-400">({m.className})</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </td>

                        {/* Lưu Phái đại diện */}
                        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="inline-block px-2.5 py-0.5 rounded text-[11px] font-black shadow-2xs"
                              style={{
                                backgroundColor: classMeta.bgColor,
                                color: classMeta.textColor,
                              }}
                            >
                              {group.primaryClass}
                            </span>
                            {isMultiAcc && (
                              <span className="text-[10px] text-slate-400">
                                +{group.members.length - 1} acc khác
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Sessions Checkboxes */}
                        {sessions.map((session) => {
                          const isChecked = !!group.attendance[session.id];
                          const attendingMembers = group.attendedMembersBySession[session.id] || [];

                          return (
                            <td
                              key={session.id}
                              onClick={() => handleToggleGroupAttendance(group, session.id)}
                              className="py-2 px-1 text-center border-r border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 relative group/cell"
                            >
                              <div className="flex flex-col items-center justify-center gap-1">
                                {isChecked ? (
                                  <div className="w-4 h-4 rounded bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                )}

                                {/* Nếu người này đi acc cụ thể, hiển thị badge tên acc đó */}
                                {isChecked && attendingMembers.length > 0 && (
                                  <div className="flex flex-col gap-0.5 max-w-[85px]">
                                    {attendingMembers.map((am) => (
                                      <span
                                        key={am.id}
                                        className="truncate px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                        title={`Đã đi bằng acc: ${am.ingame} (${am.className})`}
                                      >
                                        {am.ingame}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Số Buổi Đi */}
                        <td className="py-2 px-2 text-center font-black text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                          {group.attendanceCount}
                        </td>

                        {/* Trạng Thái (Đạt / Không Đạt) */}
                        <td className="py-2 px-3 text-center font-black">
                          {group.isPassed ? (
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
                )
              ) : (
                /* CHẾ ĐỘ 2: THEO NHÂN VẬT INGAME */
                sortedMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5 + sessions.length}
                      className="py-8 text-center text-slate-400 font-bold"
                    >
                      Chưa có thành viên nào trong danh sách. Hãy thêm nhân sự ở tab Bảng Nhân Sự!
                    </td>
                  </tr>
                ) : (
                  sortedMembers.map((member, idx) => {
                    const classMeta = getEffectiveClassMeta(member.className, customColors);
                    const attendanceCount = getMemberAttendanceCount(member);
                    const isPassed = attendanceCount >= minAttendanceRequired;
                    const isDuplicate = duplicateMemberIdSet.has(member.id);
                    const dupGroup = duplicateInfoMap.get(member.id);
                    const effectiveLogged = (member.loggedBy && member.loggedBy.trim()) || '';
                    const hasDiffLoggedBy = effectiveLogged && effectiveLogged !== member.ingame;

                    return (
                      <tr
                        key={member.id}
                        className={`border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          isDuplicate
                            ? 'bg-rose-50/80 dark:bg-rose-950/40'
                            : idx % 2 === 1
                            ? 'bg-slate-50/70 dark:bg-slate-800/40'
                            : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        {/* STT */}
                        <td className="py-2 px-2 text-center font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                          {idx + 1}
                        </td>

                        {/* Tên Thành Viên + Sub-badge Logged By */}
                        <td
                          className={`py-2 px-3 font-black border-r border-slate-200 dark:border-slate-800 ${
                            isDuplicate
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <span>{member.ingame}</span>
                              {isDuplicate && (
                                <span
                                  title={`CẢNH BÁO: Nhân sự này bị trùng lặp ${dupGroup?.count} dòng trong danh sách điểm danh!`}
                                  className="text-rose-500 animate-pulse cursor-help shrink-0"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            {hasDiffLoggedBy && (
                              <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400">
                                Log: <strong>{effectiveLogged}</strong>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Lưu Phái */}
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
                )
              )}
            </tbody>

            {/* Table Footer with Summary and Date */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-black text-slate-800 dark:text-slate-200">
                <td colSpan={3} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-right">
                  Tổng lượt tham gia:
                </td>
                {sessions.map((session) => {
                  const countForSession =
                    attendanceMode === 'loggedBy'
                      ? loggedByGroups.filter((g) => !!g.attendance[session.id]).length
                      : members.filter((m) => !!m.attendance?.[session.id]).length;
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
                  {attendanceMode === 'loggedBy'
                    ? loggedByGroups.reduce((acc, g) => acc + g.attendanceCount, 0)
                    : members.reduce((acc, m) => acc + getMemberAttendanceCount(m), 0)}
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
