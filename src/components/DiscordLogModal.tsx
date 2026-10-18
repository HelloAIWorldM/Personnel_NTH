import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  LogOut,
  Clock,
  Laptop,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  DiscordLoginLog,
  DiscordUser,
  fetchDiscordLogs,
  exportDiscordLogsToExcel,
} from '../services/discordLogService';

interface DiscordLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DiscordUser | null;
  onLogout: () => void;
}

export const DiscordLogModal: React.FC<DiscordLogModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  const [logs, setLogs] = useState<DiscordLoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<'ALL' | 'LOGIN' | 'LOGOUT'>('ALL');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Load logs when modal opens
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDiscordLogs(150);
      setLogs(data);
    } catch (err) {
      console.error('Lỗi tải nhật ký Discord:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      setExportNotice(null);
    }
  }, [isOpen]);

  // Filter logs based on search and action
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterAction !== 'ALL' && log.action !== filterAction) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (log.displayName || '').toLowerCase().includes(q);
        const matchUser = (log.username || '').toLowerCase().includes(q);
        const matchId = (log.discordId || '').toLowerCase().includes(q);
        const matchDevice = (log.deviceInfo || '').toLowerCase().includes(q);
        const matchTime = (log.timestamp || '').toLowerCase().includes(q);
        const matchNote = (log.note || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchId && !matchDevice && !matchTime && !matchNote) {
          return false;
        }
      }
      return true;
    });
  }, [logs, searchQuery, filterAction]);

  // Handle Export to Excel Log_Discord.xlsx
  const handleExport = () => {
    try {
      exportDiscordLogsToExcel(logs.length > 0 ? logs : filteredLogs);
      setExportNotice('Đã xuất thành công file "Log_Discord.xlsx"! Hãy kiểm tra thư mục tải xuống.');
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: any) {
      setExportNotice(`Lỗi xuất file: ${err.message || 'Không thể tạo file Excel'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white dark:bg-[#0E1722] border-2 border-indigo-400/40 dark:border-indigo-600/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#5865F2]/15 via-indigo-500/10 to-transparent border-b border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#5865F2]/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <span>Quản Lý Nhật Ký Đăng Nhập Discord</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                  Log_Discord.xlsx
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Ghi nhận chi tiết lịch sử đăng nhập của các thành viên vào hệ thống Bang Niên Du.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User & Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* User info */}
          <div className="flex items-center gap-2">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="w-8 h-8 rounded-full border border-indigo-400 shadow-2xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#5865F2] text-white flex items-center justify-center font-bold text-xs">
                {(currentUser?.displayName || 'D')[0].toUpperCase()}
              </div>
            )}
            <div className="text-xs">
              <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{currentUser?.displayName || 'Chưa đăng nhập'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Trực tuyến" />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {currentUser?.username ? `@${currentUser.username}` : ''} • ID: {currentUser?.id || 'N/A'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={loadLogs}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
              title="Xuất toàn bộ lịch sử thành file Excel Log_Discord.xlsx"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Xuất file Log_Discord.xlsx</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
              title="Đăng xuất tài khoản Discord này"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Notice Alert */}
        {exportNotice && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{exportNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportNotice(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#0E1722] shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên Discord, username, thiết bị..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterAction('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                filterAction === 'ALL'
                  ? 'bg-indigo-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Tất cả ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('LOGIN')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                filterAction === 'LOGIN'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('LOGOUT')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                filterAction === 'LOGOUT'
                  ? 'bg-rose-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
              <p className="font-bold text-sm">Chưa có dữ liệu nhật ký phù hợp</p>
              <p className="text-xs">
                Khi có người đăng nhập hoặc xác thực qua Discord, dữ liệu sẽ tự động ghi nhận vào đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-black">
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Thời gian</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Tài khoản Discord</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Phương thức</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Hành động</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Thiết bị & Kết nối</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredLogs.map((log, idx) => {
                    const isLogin = log.action === 'LOGIN';
                    const isLogout = log.action === 'LOGOUT';

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400 dark:text-slate-500">
                          {log.stt || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{log.timestamp}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-black text-slate-900 dark:text-slate-100">
                            {log.displayName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {log.username ? `@${log.username}` : ''} • ID: {log.discordId}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              log.authMethod === 'oauth2'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {log.authMethod === 'oauth2' ? 'Discord OAuth2' : 'Xác thực Tag'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isLogin
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : isLogout
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isLogin ? 'Đăng nhập' : isLogout ? 'Đăng xuất' : 'Tiếp tục'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <Laptop className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{log.deviceInfo || 'Trình duyệt web'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {log.ipOrNetwork || 'Web Trực Tuyến'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs break-words">
                          {log.note || 'Bình thường'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 px-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              Tổng cộng <strong>{logs.length}</strong> lượt ghi nhận hoạt động • Dữ liệu lưu trữ đồng bộ
              trong file <strong>Log_Discord.xlsx</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Tải ngay Log_Discord.xlsx</span>
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
