import React, { useState } from 'react';
import { Cloud, CloudUpload, CloudDownload, Check, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import {
  getSavedGuildId,
  saveGuildId,
  isAutoCloudSyncEnabled,
  setAutoCloudSyncEnabled,
  CloudGuildData,
} from '../services/cloudSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPushToCloud: (guildId: string) => Promise<{ success: boolean; error?: string }>;
  onPullFromCloud: (guildId: string) => Promise<{ success: boolean; data?: CloudGuildData; error?: string }>;
  lastSyncTime: number | null;
  isSyncing: boolean;
  personnelCount: number;
  raidBoardsCount: number;
  guildWarBoardsCount: number;
  showToast: (msg: string) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onPushToCloud,
  onPullFromCloud,
  lastSyncTime,
  isSyncing,
  personnelCount,
  raidBoardsCount,
  guildWarBoardsCount,
  showToast,
}) => {
  const [guildId, setGuildId] = useState<string>(() => getSavedGuildId());
  const [autoSync, setAutoSync] = useState<boolean>(() => isAutoCloudSyncEnabled());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveGuildId = () => {
    saveGuildId(guildId);
    showToast(`Đã lưu mã phòng: "${guildId}"`);
  };

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSync(checked);
    setAutoCloudSyncEnabled(checked);
    showToast(checked ? 'Đã BẬT tự động đồng bộ Cloud' : 'Đã TẮT tự động đồng bộ Cloud');
  };

  const handlePush = async () => {
    setIsProcessing(true);
    try {
      const res = await onPushToCloud(guildId);
      if (res.success) {
        showToast('✅ Đã lưu toàn bộ dữ liệu lên Cloud thành công!');
      } else {
        showToast(`❌ Lỗi lưu Cloud: ${res.error || 'Thử lại sau'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePull = async () => {
    if (!window.confirm('Hành động này sẽ nạp dữ liệu từ Cloud về máy bạn và thay thế dữ liệu hiện tại trên màn hình. Bạn có chắc chắn muốn nạp?')) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await onPullFromCloud(guildId);
      if (res.success) {
        showToast('✅ Đã nạp dữ liệu từ Cloud về máy thành công!');
        onClose();
      } else {
        showToast(`❌ Không thể tải: ${res.error || 'Phòng chưa có dữ liệu'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Chưa đồng bộ phiên này';
    const date = new Date(ts);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString('vi-VN');
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
                Đồng Bộ Đám Mây (Cloud Sync)
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Firebase
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lưu trữ an toàn trên Google Cloud – Chống mất dữ liệu 100%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm text-slate-300 overflow-y-auto max-h-[75vh]">
          {/* Status Card */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${isSyncing || isProcessing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'}`} />
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {isSyncing || isProcessing ? 'Đang kết nối & xử lý Cloud...' : 'Trạng thái: Sẵn sàng kết nối'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Lần lưu gần nhất: <span className="text-blue-300 font-medium">{formatLastSync(lastSyncTime)}</span>
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <div>Kho nhân sự: <strong className="text-amber-400">{personnelCount}</strong></div>
              <div>Bảng: <strong className="text-blue-400">{raidBoardsCount} Raid</strong> | <strong className="text-purple-400">{guildWarBoardsCount} Bang chiến</strong></div>
            </div>
          </div>

          {/* Protection Note */}
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-start gap-2.5 text-xs text-blue-200/90 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Bảo vệ vĩnh viễn:</strong> Khi đã lưu lên Cloud, dù bạn có bật tính năng xóa dữ liệu khi đóng tab của Brave, mở tab ẩn danh hay đổi sang máy tính khác, dữ liệu của bang bạn luôn được giữ an toàn trên máy chủ Google.
            </div>
          </div>

          {/* Guild Code Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Mã Phòng / Bang (Guild ID):</span>
              <span className="text-[10px] text-slate-400 font-normal">Chung mã để xem & xếp chung</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                placeholder="nth_guild"
                className="flex-1 px-3 py-2 text-sm bg-slate-800/90 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSaveGuildId}
                className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
              >
                Đổi mã
              </button>
            </div>
          </div>

          {/* Auto Sync Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 cursor-pointer hover:bg-slate-800/70 transition-colors">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => handleToggleAutoSync(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
            />
            <div className="text-xs">
              <div className="font-semibold text-white">Tự động đồng bộ lên Cloud khi có thay đổi</div>
              <div className="text-slate-400 text-[11px]">
                Tự động gửi cập nhật lên máy chủ sau mỗi lần thêm/sửa nhân sự hoặc bảng
              </div>
            </div>
          </label>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handlePush}
              disabled={isProcessing || isSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              Lưu lên Cloud ngay
            </button>

            <button
              onClick={handlePull}
              disabled={isProcessing || isSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600/80 font-semibold text-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudDownload className="w-4 h-4" />
              )}
              Nạp từ Cloud về máy
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
