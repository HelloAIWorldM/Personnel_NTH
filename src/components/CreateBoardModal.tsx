import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RaidBoard, RaidMember, RaidClass } from '../types';
import { INITIAL_MEMBERS_FROM_IMAGE } from '../constants/classes';
import {
  X,
  Plus,
  Sparkles,
  Copy,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextBoardNumber: number;
  currentBoardTitle: string;
  currentBoardMembers: RaidMember[];
  onCreateBoard: (board: RaidBoard) => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  nextBoardNumber,
  currentBoardTitle,
  currentBoardMembers,
  onCreateBoard,
}) => {
  const [titlePrefix, setTitlePrefix] = useState(`RAID ${nextBoardNumber}`);
  const [scheduleTime, setScheduleTime] = useState(
    nextBoardNumber % 2 === 0 ? 'THU 20:30' : 'MON 20:30'
  );
  const [bossName, setBossName] = useState('NIÊN DU');
  const [templateType, setTemplateType] = useState<'empty' | 'clone' | 'sample'>('empty');

  // Reset form whenever modal opens with new nextBoardNumber
  useEffect(() => {
    if (isOpen) {
      setTitlePrefix(`RAID ${nextBoardNumber}`);
      setScheduleTime(nextBoardNumber % 2 === 0 ? 'THU 20:30' : 'MON 20:30');
      setBossName('NIÊN DU');
      setTemplateType('empty');
    }
  }, [isOpen, nextBoardNumber]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = titlePrefix.trim() || `RAID ${nextBoardNumber}`;
    const timestamp = Date.now();
    const uniqueId = `board_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    let members: RaidMember[] = [];

    if (templateType === 'empty') {
      // 12 empty slots ready to be assigned
      const defaultClasses: RaidClass[] = [
        'Thiết Y',
        'Huyết Hà',
        'Toái Mộng',
        'Thần Tương',
        'Long Ngâm',
        'Tố Vấn',
        'Thiết Y',
        'Cửu Linh',
        'Thần Tương',
        'Long Ngâm',
        'Tố Vấn',
        'Tố Vấn',
      ];
      members = Array.from({ length: 12 }, (_, i) => ({
        id: `m_${timestamp}_${i + 1}`,
        stt: i + 1,
        ingame: '',
        className: defaultClasses[i % defaultClasses.length] || 'Toái Mộng',
        loggedBy: '',
        party: i < 6 ? 1 : 2,
      }));
    } else if (templateType === 'clone') {
      // Clone current board roster
      members = currentBoardMembers.map((m, idx) => ({
        ...m,
        id: `m_${timestamp}_${idx + 1}`,
        stt: idx + 1,
      }));
    } else {
      // Sample roster from original image
      members = INITIAL_MEMBERS_FROM_IMAGE.map((m, idx) => ({
        ...m,
        id: `m_${timestamp}_${idx + 1}`,
        stt: idx + 1,
      }));
    }

    const newBoard: RaidBoard = {
      id: uniqueId,
      titlePrefix: finalTitle,
      scheduleTime: scheduleTime.trim() || 'MON 20:30',
      bossName: bossName.trim() || 'NIÊN DU',
      parties: [
        { id: 1, name: 'PT 1' },
        { id: 2, name: 'PT 2' },
      ],
      members,
      createdAt: timestamp,
    };

    onCreateBoard(newBoard);
    onClose();
  };

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          id="create-board-modal-backdrop"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[100] animate-in fade-in"
          onClick={onClose}
        >
          <div
            id="create-board-modal-card"
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Tạo Bảng Raid Mới
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tạo thêm bảng RAID {nextBoardNumber} để quản lý các đội hình khác nhau
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Board Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên bảng Raid
                </label>
                <input
                  type="text"
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value)}
                  placeholder={`Ví dụ: RAID ${nextBoardNumber}`}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Schedule and Boss Name in 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Lịch Raid</span>
                  </label>
                  <input
                    type="text"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    placeholder="Ví dụ: THU 20:30"
                    className="w-full px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ải / Tên Boss
                  </label>
                  <input
                    type="text"
                    value={bossName}
                    onChange={(e) => setBossName(e.target.value)}
                    placeholder="Ví dụ: NIÊN DU"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Roster Template Options */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kiểu khởi tạo danh sách thành viên:
                </label>

                <div className="grid grid-cols-1 gap-2">
                  {/* Option 1: Empty Board */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      templateType === 'empty'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="templateType"
                      value="empty"
                      checked={templateType === 'empty'}
                      onChange={() => setTemplateType('empty')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white">
                        <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Bảng trống 12 vị trí (Khuyên dùng)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tạo sẵn 12 ô phân đều P1 (1-6) và P2 (7-12) để bạn tự do kéo thả thành viên từ Kho Nhân Sự.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Clone Current Board */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      templateType === 'clone'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="templateType"
                      value="clone"
                      checked={templateType === 'clone'}
                      onChange={() => setTemplateType('clone')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white">
                        <Copy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Sao chép từ bảng hiện tại ({currentBoardTitle})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Giữ nguyên toàn bộ danh sách ingame, môn phái và người log để dễ dàng tinh chỉnh.
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Sample Board */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      templateType === 'sample'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="templateType"
                      value="sample"
                      checked={templateType === 'sample'}
                      onChange={() => setTemplateType('sample')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Bảng mẫu chuẩn 12 người (như ảnh gốc)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Khởi tạo với 12 nhân sự mẫu như ảnh chụp ban đầu.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tạo Bảng {titlePrefix || `RAID ${nextBoardNumber}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;
};
