import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import {
  DiscordUser,
  recordDiscordLoginLog,
  saveDiscordUserSession,
} from '../services/discordLogService';

interface DiscordAuthGateModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: DiscordUser) => void;
}

// Client ID chính thức của ứng dụng Discord Bang Niên Du
const DISCORD_CLIENT_ID = '490681384684355604';

export const DiscordAuthGateModal: React.FC<DiscordAuthGateModalProps> = ({
  isOpen,
  onLoginSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tự động kiểm tra và xử lý token trả về từ Discord OAuth2 (#access_token=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');

      if (accessToken) {
        setIsLoading(true);
        setErrorMsg('');

        fetch('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Discord API phản hồi mã lỗi ${res.status}`);
            }
            return res.json();
          })
          .then(async (data) => {
            if (data && data.id) {
              const avatarUrl = data.avatar
                ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(data.id) % 5n)}.png`;

              const discordUser: DiscordUser = {
                id: data.id,
                username: data.username,
                displayName: data.global_name || data.username,
                avatar: avatarUrl,
                email: data.email,
                loginAt: Date.now(),
                authMethod: 'oauth2',
              };

              saveDiscordUserSession(discordUser);
              await recordDiscordLoginLog(
                discordUser,
                'LOGIN',
                'SUCCESS',
                `Đăng nhập thành công qua Discord OAuth2 (@${data.username})`
              );

              // Xóa hash trên thanh địa chỉ URL mà không cần tải lại trang
              window.history.replaceState(null, '', window.location.pathname);
              setIsLoading(false);
              onLoginSuccess(discordUser);
            } else {
              setErrorMsg('Không thể lấy thông tin Discord từ token xác thực!');
              setIsLoading(false);
            }
          })
          .catch((err) => {
            console.error('Lỗi xác thực Discord OAuth2:', err);
            setErrorMsg('Đăng nhập Discord thất bại hoặc phiên đã hết hạn. Vui lòng bấm đăng nhập lại!');
            setIsLoading(false);
          });
      }
    }
  }, [onLoginSuccess]);

  if (!isOpen) return null;

  // Điều hướng trực tiếp sang trang Discord OAuth2 chính thức
  const handleStartDiscordOAuth = () => {
    setIsLoading(true);
    setErrorMsg('');

    // Xác định Redirect URI: Ưu tiên domain chính thức https://sapxepnhansunth.web.app/
    const redirectUri = window.location.origin.includes('localhost')
      ? `${window.location.origin}/`
      : 'https://sapxepnhansunth.web.app/';

    const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=identify%20email`;

    window.location.href = oauthUrl;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#0E1722] border-2 border-indigo-400/40 dark:border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="p-6 sm:p-7 bg-gradient-to-br from-[#5865F2]/25 via-[#5865F2]/10 to-transparent border-b border-indigo-200 dark:border-indigo-900/60 text-center relative">
          <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white shadow-xl shadow-[#5865F2]/35 group hover:scale-105 transition-transform">
            {/* Discord Icon SVG */}
            <svg className="w-9 h-9 fill-current" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-black border border-indigo-200 dark:border-indigo-800 mb-2.5">
            <Lock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>XÁC THỰC BẮT BUỘC</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-wide uppercase">
            Bang Niên Du
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Hệ thống sắp xếp nhân sự Nghịch Thủy Hàn. Vui lòng đăng nhập tài khoản Discord để bắt đầu.
          </p>
        </div>

        {/* Action Content */}
        <div className="p-6 sm:p-7 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-700 dark:text-rose-300 font-semibold leading-relaxed animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-[#5865F2] animate-spin" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Đang xác thực tài khoản Discord của bạn...
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Vui lòng đợi trong giây lát. Hệ thống đang đồng bộ dữ liệu vào Log_Discord.xlsx.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300">
                  <Sparkles className="w-4 h-4 text-[#5865F2]" />
                  <span>Đăng nhập bảo mật qua Discord OAuth2</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Bấm nút bên dưới để chuyển sang trang xác thực Discord chính thức. Hệ thống sẽ nhận diện tài khoản của bạn và tự động cấp quyền truy cập.
                </p>
              </div>

              {/* Nút bấm Đăng Nhập Discord Duy Nhất */}
              <button
                type="button"
                onClick={handleStartDiscordOAuth}
                className="w-full py-4 px-6 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-2xl text-sm font-black shadow-xl shadow-[#5865F2]/30 flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer group"
              >
                <svg className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 127.14 96.36">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
                </svg>
                <span>Đăng nhập với Discord</span>
              </button>
            </div>
          )}

          {/* Ghi chú bảo mật & Quản trị nhật ký */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Ghi nhận nhật ký quản trị</span>
            </div>
            <p className="leading-relaxed">
              Mọi lượt truy cập và đăng nhập được tự động đồng bộ vào file quản trị <strong>Log_Discord.xlsx</strong> để hỗ trợ quản trị viên Bang Niên Du theo dõi hoạt động.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
