import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, LogOut, ShieldCheck } from 'lucide-react';
import { DiscordUser } from '../types';

interface DiscordUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: DiscordUser | null;
  onLogout: () => void;
  onShowToast: (msg: string) => void;
}

export const DiscordUserProfileModal: React.FC<DiscordUserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onShowToast,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !user) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    onShowToast('Đã sao chép Discord ID vào bộ nhớ tạm!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formattedLoginTime = user.loginTime
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(user.loginTime))
    : new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());

  const displayName = user.global_name || user.username;
  const avatarUrl =
    user.avatarUrl ||
    (user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : 'https://cdn.discordapp.com/embed/avatars/0.png');

  return typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#5865F2] text-white flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Thông Tin Người Dùng
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tài khoản Discord liên kết với Bang Niên Du
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Profile Card Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/30 to-sky-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-16 h-16 rounded-full border-2 border-[#5865F2] object-cover shadow-md shadow-[#5865F2]/20"
                  />
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-slate-900 dark:text-white truncate">
                      {displayName}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    @{user.username}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Đã xác thực Discord</span>
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden text-xs">
                {/* Discord ID */}
                <div className="p-3 flex items-center justify-between bg-white dark:bg-slate-900/60">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Discord ID</span>
                  <div className="flex items-center gap-1.5">
                    <code className="px-2 py-1 bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-lg font-mono text-[11px] border border-slate-200 dark:border-slate-800">
                      {user.id}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                      title="Sao chép ID"
                    >
                      {copiedId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="p-3 flex items-center justify-between bg-white dark:bg-slate-900/60">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {user.email || 'Không công khai'}
                  </span>
                </div>

                {/* Thời gian đăng nhập */}
                <div className="p-3 flex items-center justify-between bg-white dark:bg-slate-900/60">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Thời gian đăng nhập</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formattedLoginTime}
                  </span>
                </div>

                {/* Máy chủ liên kết */}
                <div className="p-3 flex items-center justify-between bg-white dark:bg-slate-900/60">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Máy chủ Discord</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Mun Kiu
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
};
