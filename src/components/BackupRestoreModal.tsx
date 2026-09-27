import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  X,
  Clock,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CustomClassColors, PersonnelMember, RaidBoard } from '../types';
import {
  BackupSnapshot,
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
  onRestoreData: (restored: {
    boards: RaidBoard[];
    personnelPool: PersonnelMember[];
    customColors?: CustomClassColors;
  }) => void;
  onShowToast: (msg: string) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  boards,
  personnelPool,
  customColors,
  onRestoreData,
  onShowToast,
}) => {
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(() => getAutoSnapshots());
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    try {
      downloadBackupFile(boards, personnelPool, customColors);
      onShowToast('Đã tải file sao lưu (.json) về máy tính thành công!');
    } catch (err: any) {
      alert('Lỗi tải file sao lưu: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const restored = parseBackupFile(content);
        if (
          window.confirm(
            `Xác nhận khôi phục từ file?\n- Số bảng Raid: ${restored.boards.length}\n- Kho nhân sự: ${restored.personnelPool.length} người\n\nThao tác này sẽ cập nhật dữ liệu hiện tại.`
          )
        ) {
          onRestoreData(restored);
          onShowToast('Đã khôi phục dữ liệu từ file sao lưu thành công!');
          onClose();
        }
      } catch (err: any) {
        alert('Lỗi khi đọc file sao lưu: ' + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    if (
      window.confirm(
        `Xác nhận khôi phục bản lưu lúc ${new Date(snap.timestamp).toLocaleString('vi-VN')}?\n- Bảng Raid: ${snap.boardCount}\n- Nhân sự có tên: ${snap.totalMembersWithData}`
      )
    ) {
      onRestoreData({
        boards: snap.boards,
        personnelPool: snap.personnelPool || [],
        customColors: snap.customColors,
      });
      onShowToast(`Đã khôi phục bản lưu lúc ${new Date(snap.timestamp).toLocaleTimeString('vi-VN')}!`);
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
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
                Bảo vệ bảng Raid và Kho nhân sự không bao giờ bị mất
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
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Sao lưu thủ công về máy tính
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Xuất toàn bộ bảng xếp Raid và kho nhân sự thành file <strong>.json</strong>. Bạn có thể lưu giữ hoặc chuyển sang máy tính/điện thoại khác để nạp lại bất kỳ lúc nào.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-xs transition-colors min-h-[40px]"
              >
                <Download className="w-4 h-4" />
                <span>Tải file sao lưu (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-100 font-bold rounded-xl border border-slate-300 dark:border-slate-600 transition-colors min-h-[40px]"
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
                (Tự động ghi nhận định kỳ)
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
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{snap.boardCount} bảng</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {snap.totalMembersWithData} thành viên có tên
                        </span>
                        <span>•</span>
                        <span>Kho: {snap.personnelCount}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-lg transition-colors"
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
              <span className="font-bold block">Mẹo giữ an toàn dữ liệu:</span>
              <p className="text-[11px] leading-relaxed">
                Hệ thống hiện tại đã kích hoạt bảo vệ 3 lớp (LocalStorage + IndexedDB + Tự động sao lưu). Nếu bạn sử dụng trình duyệt ở chế độ ẩn danh (Incognito) hoặc dọn dẹp lịch sử thường xuyên, hãy bấm <strong>Tải file sao lưu (.json)</strong> để lưu trữ an toàn tuyệt đối.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
