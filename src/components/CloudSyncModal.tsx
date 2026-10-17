import React, { useState } from 'react';
import { Cloud, CloudUpload, CloudDownload, Sparkles, RefreshCw, X, ShieldCheck, Database, Calendar } from 'lucide-react';
import { CloudGuildData } from '../services/cloudSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPushToCloud: () => Promise<{ success: boolean; error?: string }>;
  onPullFromCloud: () => Promise<{ success: boolean; data?: CloudGuildData; error?: string }>;
  lastSyncTime: number | null;
  isSyncing: boolean;
  masterPersonnelCount?: number;
  personnelCount: number;
  raidBoardsCount: number;
  guildWarBoardsCount: number;
  updateBoardsCount?: number;
  updatePersonnelCount?: number;
  diBuiCount?: number;
  showToast: (msg: string) => void;
  onOpenBackupModal?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onPushToCloud,
  onPullFromCloud,
  lastSyncTime,
  isSyncing,
  masterPersonnelCount = 0,
  personnelCount,
  raidBoardsCount,
  guildWarBoardsCount,
  updateBoardsCount = 0,
  updatePersonnelCount = 0,
  diBuiCount = 0,
  showToast,
  onOpenBackupModal,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePush = async () => {
    setIsProcessing(true);
    try {
      const res = await onPushToCloud();
      if (res.success) {
        showToast('Đã lưu toàn bộ dữ liệu lên Máy chủ Đám mây thành công!');
      } else {
        showToast(`Lỗi lưu Cloud: ${res.error || 'Thử lại sau'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePull = async () => {
    const confirmMsg =
      'Hành động này sẽ nạp dữ liệu mới nhất từ Máy chủ Cloud về máy bạn và thay thế dữ liệu hiện tại trên màn hình. Bạn có chắc chắn muốn nạp lại?';

    if (!window.confirm(confirmMsg)) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await onPullFromCloud();
      if (res.success) {
        showToast('Đã nạp dữ liệu mới nhất từ Máy chủ Cloud về máy thành công!');
        onClose();
      } else {
        showToast(`Không thể tải: ${res.error || 'Chưa có dữ liệu trên máy chủ'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Đang kết nối thời gian thực';
    const date = new Date(ts);
    return (
      date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ' ' +
      date.toLocaleDateString('vi-VN')
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-inner">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Đồng Bộ Thời Gian Thực
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Database duy nhất của Bang Niên Du – Tự động đồng bộ ngay lập tức
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm text-slate-300 overflow-y-auto max-h-[75vh]">
          {/* Status Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isSyncing || isProcessing
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Máy chủ: Guild_NiênDu</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Trạng thái:{' '}
                    <span className="text-emerald-400 font-semibold">
                      {isSyncing || isProcessing ? 'Đang gửi cập nhật...' : 'Đang kết nối trực tiếp'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400">
                <div>Cập nhật gần nhất:</div>
                <div className="text-sky-300 font-medium">{formatLastSync(lastSyncTime)}</div>
              </div>
            </div>

            {/* Quick Counters */}
            <div className="pt-2 border-t border-slate-700/50 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Tổng Kho</div>
                <div className="text-sky-400 font-black text-sm">{masterPersonnelCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Bảng Raid</div>
                <div className="text-amber-400 font-black text-sm">{raidBoardsCount} bảng</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Bang Chiến</div>
                <div className="text-purple-400 font-black text-sm">{guildWarBoardsCount} bảng</div>
              </div>
            </div>
          </div>

          {/* Real-time sync explanation banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 text-emerald-200/90 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cơ chế đồng bộ tự động 100% thời gian thực</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-slate-300">
              Mọi thay đổi khi bạn hoặc bất kỳ thành viên nào nhập liệu (thêm nhân sự, xếp slot, sửa ghi chú) đều được tự động lưu và cập nhật ngay lập tức đến tất cả các máy đang mở web.
            </p>
          </div>

          {/* Manual sync actions */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400">Thao tác thủ công (khi cần thiết):</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handlePush}
                disabled={isProcessing || isSyncing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                Lưu lên Cloud ngay
              </button>

              <button
                type="button"
                onClick={handlePull}
                disabled={isProcessing || isSyncing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600/80 font-bold text-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudDownload className="w-4 h-4" />
                )}
                Nạp lại từ Cloud
              </button>
            </div>
          </div>

          {/* Daily Backup Integration Card */}
          {onOpenBackupModal && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-slate-900 border border-sky-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Sao lưu dữ liệu mỗi ngày</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                      Tự động
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Xem lịch sử sao lưu theo ngày và khôi phục khi cần
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackupModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Xem lịch sử</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
