import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GuildWarBoard, PersonnelMember, RaidMember } from '../../types';
import {
  DEFAULT_GUILD_SESSIONS,
  createEmptyGuildWarBoard,
} from '../../constants/guildWarDefaults';
import { X, Swords, Users, ShieldAlert, Sparkles, Plus } from 'lucide-react';

interface CreateGuildWarModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextBoardNumber: number;
  personnelPool?: PersonnelMember[];
  raidMembers?: RaidMember[];
  onCreateBoard: (board: GuildWarBoard) => void;
}

export const CreateGuildWarModal: React.FC<CreateGuildWarModalProps> = ({
  isOpen,
  onClose,
  nextBoardNumber,
  personnelPool = [],
  raidMembers = [],
  onCreateBoard,
}) => {
  const [title, setTitle] = useState(`BANG CHIẾN TUẦN ${nextBoardNumber}`);
  const [scheduleTime, setScheduleTime] = useState('T7 20:00 & CN 20:00');
  const [targetName, setTargetName] = useState('Chiếm Lãnh Địa / Đẩy Trụ');
  const [templateType, setTemplateType] = useState<'from_personnel' | 'empty'>('empty');
  const [minAttendance, setMinAttendance] = useState<number>(4);

  useEffect(() => {
    if (isOpen) {
      setTitle(`BANG CHIẾN TUẦN ${nextBoardNumber}`);
      setScheduleTime('T7 20:00 & CN 20:00');
      setTargetName('Chiếm Lãnh Địa / Đẩy Trụ');
      setTemplateType('empty');
      setMinAttendance(4);
    }
  }, [isOpen, nextBoardNumber]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || `BANG CHIẾN TUẦN ${nextBoardNumber}`;
    const timestamp = Date.now();
    const uniqueId = `gw_board_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    if (templateType === 'from_personnel') {
      // Gather unique personnel from personnelPool and raidMembers
      const seenNames = new Set<string>();
      const combinedMembers: Array<{ ingame: string; className: any }> = [];

      personnelPool.forEach((p) => {
        if (p.ingame && !seenNames.has(p.ingame.toLowerCase())) {
          seenNames.add(p.ingame.toLowerCase());
          combinedMembers.push({ ingame: p.ingame, className: p.className });
        }
      });

      raidMembers.forEach((r) => {
        if (r.ingame && !seenNames.has(r.ingame.toLowerCase())) {
          seenNames.add(r.ingame.toLowerCase());
          combinedMembers.push({ ingame: r.ingame, className: r.className });
        }
      });

      const newBoard: GuildWarBoard = {
        id: uniqueId,
        title: finalTitle,
        scheduleTime,
        targetName,
        sessions: DEFAULT_GUILD_SESSIONS.map((s) => ({ ...s })),
        members: combinedMembers.map((m, idx) => ({
          id: `gw_m_${timestamp}_${idx + 1}`,
          stt: idx + 1,
          ingame: m.ingame,
          className: m.className,
          guildRole: 'Thành Viên',
          participation: 'Cả hai',
          team: 'Chưa xếp',
          attendance: {},
        })),
        minAttendanceRequired: minAttendance,
        reportDate: new Date().toLocaleDateString('vi-VN'),
        createdAt: timestamp,
      };

      onCreateBoard(newBoard);
      onClose();
      return;
    }

    // Empty
    const emptyBoard = createEmptyGuildWarBoard(
      nextBoardNumber,
      finalTitle,
      scheduleTime,
      targetName
    );
    emptyBoard.id = uniqueId;
    emptyBoard.minAttendanceRequired = minAttendance;
    onCreateBoard(emptyBoard);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-xs">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black leading-tight text-slate-900 dark:text-white">
                Tạo Bảng Bang Chiến Mới
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Gồm Bảng nhân sự, Bảng chia 5 team (Top, Mid, Bot, Cơ Động, Đẩy Trụ) & Bảng điểm danh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên Bảng Bang Chiến
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`BANG CHIẾN TUẦN ${nextBoardNumber}`}
              className="w-full px-3 py-2 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lịch Chiến (Thứ / Giờ)
              </label>
              <input
                type="text"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                placeholder="T7 20:00 & CN 20:00"
                className="w-full px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mục Tiêu / Đối Thủ
              </label>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Chiếm Lãnh Địa / Đẩy Trụ"
                className="w-full px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Điều kiện Trạng Thái Đạt (Số buổi tham gia tối thiểu)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={12}
                value={minAttendance}
                onChange={(e) => setMinAttendance(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                buổi (Đi từ {minAttendance} buổi trở lên sẽ báo "Đạt")
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Dữ liệu khởi tạo ban đầu:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('empty')}
                className={`p-3 text-left rounded-xl border transition-all ${
                  templateType === 'empty'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Bảng trống (Khuyến nghị)</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Tạo bảng sạch để tự phân công hoặc thêm thành viên mới
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('from_personnel')}
                className={`p-3 text-left rounded-xl border transition-all ${
                  templateType === 'from_personnel'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Nạp từ Kho Raid</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Lấy danh sách nhân sự hiện có trong kho Raid sang Bang Chiến
                </p>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Tạo Bảng Bang Chiến</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
