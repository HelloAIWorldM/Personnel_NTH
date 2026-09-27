import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RaidBoard, RaidMember, RaidClass, PersonnelMember } from '../types';
import { normalizeName } from '../utils/duplicates';
import {
  X,
  Plus,
  Copy,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextBoardNumber: number;
  currentBoardTitle: string;
  currentBoardMembers: RaidMember[];
  raid1Members?: RaidMember[];
  personnelPool?: PersonnelMember[];
  allBoards?: RaidBoard[];
  onCreateBoard: (board: RaidBoard) => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  nextBoardNumber,
  currentBoardTitle,
  currentBoardMembers,
  raid1Members,
  personnelPool = [],
  allBoards = [],
  onCreateBoard,
}) => {
  const [titlePrefix, setTitlePrefix] = useState(`RAID ${nextBoardNumber}`);
  const [scheduleTime, setScheduleTime] = useState(
    nextBoardNumber % 2 === 0 ? 'THU 20:30' : 'MON 20:30'
  );
  const [bossName, setBossName] = useState('NIÊN DU');
  const [templateType, setTemplateType] = useState<'empty' | 'from_personnel' | 'clone'>('empty');

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
    const template =
      raid1Members && raid1Members.length > 0 ? raid1Members : currentBoardMembers;

    if (templateType === 'empty') {
      // 12 empty slots preserving the exact class and party format of Raid 1
      members = template.map((m, idx) => ({
        id: `m_${timestamp}_${idx + 1}`,
        stt: m.stt || idx + 1,
        ingame: '',
        className: m.className,
        loggedBy: '',
        party: m.party || (idx < 6 ? 1 : 2),
      }));
    } else if (templateType === 'from_personnel') {
      // Keep exact class and party format of Raid 1, fill matching personnel from Kho Nhân Sự
      // SMART ASSIGNMENT: Prioritize unassigned personnel who have not yet been placed into any raid board
      const assignedAcrossBoards = new Set<string>();
      (allBoards || []).forEach((b) => {
        (b.members || []).forEach((mem) => {
          const norm = normalizeName(mem.ingame);
          if (norm) assignedAcrossBoards.add(norm);
        });
      });

      const usedPersonnelIds = new Set<string>();

      members = template.map((m, idx) => {
        // Priority 1: Unassigned person in personnelPool (not yet in any raid board)
        let matchedPerson = personnelPool.find(
          (p) =>
            !usedPersonnelIds.has(p.id) &&
            p.className === m.className &&
            !assignedAcrossBoards.has(normalizeName(p.ingame))
        );

        // Priority 2: Any matching class person in pool not yet used in this board
        if (!matchedPerson) {
          matchedPerson = personnelPool.find(
            (p) => !usedPersonnelIds.has(p.id) && p.className === m.className
          );
        }

        if (matchedPerson) {
          usedPersonnelIds.add(matchedPerson.id);
          return {
            id: `m_${timestamp}_${idx + 1}`,
            stt: m.stt || idx + 1,
            ingame: matchedPerson.ingame,
            className: m.className, // Strictly maintain Raid 1 format
            loggedBy: matchedPerson.loggedBy || matchedPerson.ingame,
            party: m.party || (idx < 6 ? 1 : 2),
          };
        }

        return {
          id: `m_${timestamp}_${idx + 1}`,
          stt: m.stt || idx + 1,
          ingame: '',
          className: m.className,
          loggedBy: '',
          party: m.party || (idx < 6 ? 1 : 2),
        };
      });
    } else {
      // Clone current board roster
      members = currentBoardMembers.map((m, idx) => ({
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
                        <span>Bảng trống theo định dạng Raid 1 (Khuyên dùng)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Giữ nguyên chuẩn 12 vị trí môn phái & phân nhóm của Raid 1. Toàn bộ nhân sự đã xếp ở các bảng trước vẫn giữ nguyên trạng thái "Đã xếp" trong Kho Nhân Sự.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Fill from Personnel Storage keeping Raid 1 format */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      templateType === 'from_personnel'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="templateType"
                      value="from_personnel"
                      checked={templateType === 'from_personnel'}
                      onChange={() => setTemplateType('from_personnel')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white">
                        <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Điền nhân sự từ Kho Nhân Sự (giữ nguyên định dạng Raid 1)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tự động ưu tiên xếp các nhân sự chưa xếp trong Kho Nhân Sự vào đúng môn phái tương ứng, giữ nguyên trạng thái các nhân sự đã xếp ở bảng khác.
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Clone Current Board */}
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
