import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  Database,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { RaidBoard, PersonnelMember, CustomClassColors, GuildWarBoard } from '../types';
import {
  AutoSnapshot,
  getAutoSnapshots,
  downloadBackupFile,
  parseBackupFile,
} from '../utils/storageBackup';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: RaidBoard[];
  personnelPool: PersonnelMember[];
  customColors?: CustomClassColors;
  guildWarBoards?: GuildWarBoard[];
  onRestoreData: (restored: {
    boards?: RaidBoard[];
    personnelPool?: PersonnelMember[];
    customColors?: CustomClassColors;
    guildWarBoards?: GuildWarBoard[];
  }) => void;
  onShowToast: (msg: string) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  boards,
  personnelPool,
  customColors,
  guildWarBoards,
  onRestoreData,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [snapshots, setSnapshots] = useState<AutoSnapshot[]>(() => getAutoSnapshots());

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    try {
      downloadBackupFile(boards, personnelPool, customColors, guildWarBoards);
      onShowToast('Đã tải xuống file sao lưu an toàn (.json)');
    } catch {
      onShowToast('Có lỗi khi tạo file sao lưu.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const restored = parseBackupFile(text);

        if (
          window.confirm(
            `Xác nhận nạp dữ liệu từ file sao lưu?\n- Số bảng Raid: ${restored.boards.length}\n- Số bảng Bang chiến: ${restored.guildWarBoards?.length || 0}\n- Kho nhân sự: ${restored.personnelPool.length} người\n\nThao tác này sẽ cập nhật các bảng hiện có trên máy này.`
          )
        ) {
          onRestoreData(restored);
          onShowToast('Khôi phục dữ liệu thành công từ file sao lưu!');
          onClose();
        }
      } catch (err: any) {
        alert(err.message || 'Lỗi khi đọc file sao lưu.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestoreSnapshot = (snap: AutoSnapshot) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn khôi phục lại "${snap.label}"?\n\n- ${snap.boardCount} bảng Raid (${snap.totalMembersWithData} thành viên có tên)\n- ${snap.personnelCount} người trong kho\n${snap.guildWarBoards ? `- ${snap.guildWarBoards.length} bảng Bang chiến\n` : ''}`
      )
    ) {
      onRestoreData({
        boards: snap.boards,
        personnelPool: snap.personnelPool,
        customColors: snap.customColors,
        guildWarBoards: snap.guildWarBoards,
      });
      onShowToast('Đã khôi phục dữ liệu từ bản sao lưu tự động!');
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Sao Lưu & Khôi Phục Dữ Liệu
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bảo vệ bảng Raid, Bang Chiến và Kho nhân sự không bao giờ bị mất
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Section 1: File Backup & Restore */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#88DCFA]" />
                Sao lưu thủ công về máy tính
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Xuất toàn bộ bảng xếp Raid, Bang Chiến và kho nhân sự thành file <strong>.json</strong>. Bạn có thể lưu vào Google Drive hoặc chuyển sang máy tính/điện thoại khác để nạp lại bất kỳ lúc nào.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-xs transition-colors min-h-[40px] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải file sao lưu (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-100 font-bold rounded-xl border border-slate-300 dark:border-slate-600 transition-colors min-h-[40px] cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span>Nạp lại từ file (.json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Section 2: Auto Snapshots */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                Lịch sử tự động sao lưu gần đây
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                (Hệ thống tự động ghi nhận khi chỉnh sửa)
              </span>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-500">
                Chưa có bản lưu tự động nào. Hệ thống sẽ tự động tạo bản lưu khi bạn nhập dữ liệu.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-indigo-400 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {new Date(snap.timestamp).toLocaleString('vi-VN')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>{snap.boardCount} bảng Raid</span>
                        <span>•</span>
                        <span className="text-[#88DCFA] font-medium">
                          {snap.totalMembersWithData} thành viên Raid có tên
                        </span>
                        <span>•</span>
                        <span>Kho: {snap.personnelCount}</span>
                        {snap.guildWarBoards && snap.guildWarBoards.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-violet-600 dark:text-violet-400 font-medium">
                              {snap.guildWarBoards.length} bảng Bang chiến
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1">
              <span className="font-bold block">Bảo vệ dữ liệu đa tầng (LocalStorage + IndexedDB + Tự động lưu):</span>
              <p className="text-[11px] leading-relaxed">
                Khi tắt máy tính hoặc tải lại trình duyệt, dữ liệu luôn được lưu tự động. Nếu bạn gửi bảng cho thành viên khác, hãy sử dụng tính năng <strong>"Chia sẻ link"</strong> trong nút Xuất Ảnh để họ mở link là thấy ngay toàn bộ bảng xếp!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
