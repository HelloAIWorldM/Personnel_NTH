import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Sparkles, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { DiscordUser } from '../types';
import {
  DISCORD_OAUTH2_URL,
  setStoredDiscordUser,
  sendDiscordLoginNotification,
} from '../services/discordNotifyService';

interface DiscordAuthGateModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: DiscordUser) => void;
  onShowToast: (msg: string) => void;
}

export const DiscordAuthGateModal: React.FC<DiscordAuthGateModalProps> = ({
  isOpen,
  onLoginSuccess,
  onShowToast,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Handle incoming OAuth2 callback (hash or code)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check for token in URL hash (#access_token=...&token_type=Bearer...)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        setIsAuthenticating(true);
        setAuthError(null);

        // Fetch user info from Discord API
        fetch('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then(async (res) => {
            if (!res.ok) {
              const err = await res.text();
              throw new Error(`Discord API trả về lỗi (${res.status}): ${err}`);
            }
            return res.json();
          })
          .then(async (data) => {
            const avatarUrl = data.avatar
              ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=128`
              : `https://cdn.discordapp.com/embed/avatars/${(parseInt(data.discriminator || '0', 10) % 5) || 0}.png`;

            const discordUser: DiscordUser = {
              id: data.id,
              username: data.username,
              global_name: data.global_name || data.username,
              avatar: data.avatar,
              avatarUrl,
              email: data.email || null,
              loginTime: new Date().toISOString(),
            };

            // Store user session
            setStoredDiscordUser(discordUser);

            // Clean hash from URL without reloading
            const cleanUrl = window.location.pathname + window.location.search;
            window.history.replaceState(null, '', cleanUrl);

            // Send notification to #notify_private via VLBot webhook
            try {
              await sendDiscordLoginNotification(discordUser);
            } catch (notifyErr) {
              console.warn('Lỗi gửi thông báo Webhook:', notifyErr);
            }

            onShowToast(`Chào mừng ${discordUser.global_name || discordUser.username} đã đăng nhập thành công!`);
            onLoginSuccess(discordUser);
          })
          .catch((err) => {
            console.error('Lỗi xác thực Discord:', err);
            setAuthError(err.message || 'Không thể lấy thông tin tài khoản Discord. Vui lòng thử lại.');
          })
          .finally(() => {
            setIsAuthenticating(false);
          });
        return;
      }
    }

    // 2. Check for query code (?code=...) from response_type=code
    // Because static SPA cannot exchange code with client_secret without backend CORS,
    // automatically redirect to response_type=token so Discord returns token immediately!
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('code')) {
      // Remove ?code from search to prevent reload loop
      searchParams.delete('code');
      const newSearch = searchParams.toString();
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);

      // Redirect seamlessly to the token grant URL
      window.location.href = DISCORD_OAUTH2_URL;
    }
  }, [onLoginSuccess, onShowToast]);

  if (!isOpen) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 select-none">
          {/* Ambient Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#5865F2]/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Main Card Container */}
          <div className="relative w-full max-w-lg bg-[#111827]/95 border-2 border-[#5865F2]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(88,101,242,0.25)] text-slate-100 backdrop-blur-2xl">
            {/* Top Brand Badges */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 px-3 py-1 bg-[#5865F2]/20 border border-[#5865F2]/50 rounded-full">
                {/* Discord SVG Icon */}
                <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span className="text-[11px] font-black tracking-wide text-[#7289DA] uppercase">
                  Discord OAuth2 Gate
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/40 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-black text-amber-300 uppercase">
                  Bang Niên Du
                </span>
              </div>
            </div>

            {/* Central Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#5865F2] to-indigo-600 flex items-center justify-center shadow-lg shadow-[#5865F2]/40 ring-4 ring-[#5865F2]/20">
                  <svg className="w-11 h-11 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#111827] flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                CỔNG ĐĂNG NHẬP DISCORD
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
                Hệ thống quản lý nhân sự & Bảng tác chiến Bang Niên Du
              </p>
              <div className="mt-3 inline-block px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-[11px] text-slate-300">
                Vui lòng đăng nhập Discord để tiếp tục truy cập trang web
              </div>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-4 p-3.5 bg-red-950/60 border border-red-500/50 rounded-2xl flex items-start gap-2.5 text-red-200 text-xs text-left animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-red-300">Đăng nhập không thành công</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-red-200/90">{authError}</p>
                </div>
              </div>
            )}

            {/* Login Action Button */}
            <div className="space-y-3">
              {isAuthenticating ? (
                <div className="w-full py-3.5 px-5 bg-[#5865F2]/50 text-white rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-lg border border-[#5865F2]/50">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span className="text-sm">Đang xác thực tài khoản Discord...</span>
                </div>
              ) : (
                <a
                  href={DISCORD_OAUTH2_URL}
                  className="group w-full py-3.5 px-5 bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3C45A5] text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_0_25px_rgba(88,101,242,0.4)] hover:shadow-[0_0_35px_rgba(88,101,242,0.6)] hover:scale-[1.01] active:scale-[0.99] border border-indigo-400/40"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span>Đăng nhập bằng Discord</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              )}
            </div>

            {/* Feature Guarantees - Balanced 2-column layout */}
            <div className="mt-6 pt-5 grid grid-cols-2 gap-3 text-center border-t border-slate-800/80">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                <span className="block font-bold text-slate-200 text-xs">An toàn</span>
                <span className="text-[11px] text-slate-400">OAuth2 chính thức</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                <span className="block font-bold text-slate-200 text-xs">Không mật khẩu</span>
                <span className="text-[11px] text-slate-400">Ủy quyền trực tiếp</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
};
