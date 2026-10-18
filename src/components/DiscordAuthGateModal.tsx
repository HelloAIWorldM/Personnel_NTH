import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  UserCheck,
  Settings,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import {
  DiscordUser,
  recordDiscordLoginLog,
  saveDiscordUserSession,
} from '../services/discordLogService';

interface DiscordAuthGateModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: DiscordUser) => void;
}

const STORAGE_KEY_CLIENT_ID = 'guild_nien_du_discord_client_id_v1';
// Client ID mặc định nếu admin chưa cấu hình
const DEFAULT_DISCORD_CLIENT_ID = '123456789012345678';

export const DiscordAuthGateModal: React.FC<DiscordAuthGateModalProps> = ({
  isOpen,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'oauth2'>('quick');

  // Quick login states
  const [discordTag, setDiscordTag] = useState('');
  const [ingameName, setIngameName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OAuth2 states
  const [clientId, setClientId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CLIENT_ID) || '';
    } catch {
      return '';
    }
  });
  const [showConfigClientId, setShowConfigClientId] = useState(false);

  // Check URL hash for OAuth2 return token (#access_token=...&token_type=Bearer)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');

      if (accessToken) {
        setIsLoading(true);
        // Fetch Discord User Info
        fetch('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then((res) => res.json())
          .then(async (data) => {
            if (data.id) {
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
              await recordDiscordLoginLog(discordUser, 'LOGIN', 'SUCCESS', 'Đăng nhập thành công qua Discord OAuth2');
              // Clear hash from URL
              window.history.replaceState(null, '', window.location.pathname);
              setIsLoading(false);
              onLoginSuccess(discordUser);
            } else {
              setErrorMsg('Không thể lấy thông tin Discord từ token!');
              setIsLoading(false);
            }
          })
          .catch((err) => {
            console.error('Lỗi xác thực Discord OAuth2:', err);
            setErrorMsg('Đăng nhập Discord thất bại. Vui lòng thử lại!');
            setIsLoading(false);
          });
      }
    }
  }, [onLoginSuccess]);

  if (!isOpen) return null;

  // Xử lý xác thực nhanh
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = discordTag.trim();
    if (!cleanTag) {
      setErrorMsg('Vui lòng nhập tên Discord hoặc Discord Tag của bạn!');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Tạo fake ID ngẫu nhiên nhưng ổn định dựa trên tên để lưu nhật ký
      const pseudoId = 'disc_' + Math.abs(
        cleanTag.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
      ).toString();

      const discordUser: DiscordUser = {
        id: pseudoId,
        username: cleanTag.toLowerCase().replace(/\s+/g, '_'),
        displayName: cleanTag,
        ingameLinked: ingameName.trim() || undefined,
        loginAt: Date.now(),
        authMethod: 'manual',
      };

      saveDiscordUserSession(discordUser);
      await recordDiscordLoginLog(
        discordUser,
        'LOGIN',
        'SUCCESS',
        `Xác thực thành viên bang: ${cleanTag}${ingameName ? ` (Ingame: ${ingameName.trim()})` : ''}`
      );

      setIsLoading(false);
      onLoginSuccess(discordUser);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi xử lý đăng nhập!');
      setIsLoading(false);
    }
  };

  // Kích hoạt Discord OAuth2
  const handleStartDiscordOAuth = () => {
    const effectiveClientId = clientId.trim() || DEFAULT_DISCORD_CLIENT_ID;
    if (!effectiveClientId || effectiveClientId === '123456789012345678') {
      setShowConfigClientId(true);
      setErrorMsg('Vui lòng nhập Discord Client ID từ Discord Developer Portal để sử dụng OAuth2!');
      return;
    }

    const redirectUri = window.location.origin + window.location.pathname;
    const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${effectiveClientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=identify%20email`;

    window.location.href = oauthUrl;
  };

  const handleSaveClientId = () => {
    const clean = clientId.trim();
    try {
      if (clean) {
        localStorage.setItem(STORAGE_KEY_CLIENT_ID, clean);
      } else {
        localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
      }
    } catch {}
    setShowConfigClientId(false);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#0E1722] border-2 border-indigo-400/40 dark:border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-[#5865F2]/20 via-[#5865F2]/10 to-transparent border-b border-indigo-200 dark:border-indigo-900/60 text-center relative">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white shadow-lg shadow-[#5865F2]/30">
            {/* Discord Icon SVG */}
            <svg className="w-8 h-8 fill-current" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-black border border-indigo-200 dark:border-indigo-800 mb-2">
            <Lock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>XÁC THỰC BẮT BUỘC</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-wide uppercase">
            Bang Niên Du
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Hệ thống sắp xếp nhân sự Nghịch Thủy Hàn. Đăng nhập Discord để bắt đầu làm việc.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('quick');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'quick'
                ? 'bg-white dark:bg-[#0E1722] text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Xác thực thành viên</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('oauth2');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'oauth2'
                ? 'bg-white dark:bg-[#0E1722] text-[#5865F2] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discord OAuth2</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {activeTab === 'quick' ? (
            /* Tab 1: Xác thực nhanh */
            <form onSubmit={handleQuickLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Tên Discord / Discord Tag <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={discordTag}
                    onChange={(e) => setDiscordTag(e.target.value)}
                    placeholder="VD: Vy Lì hoặc vyli#0001"
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Nhập tên tài khoản Discord của bạn trong server Bang Niên Du.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Tên Ingame liên kết (tùy chọn)
                </label>
                <input
                  type="text"
                  value={ingameName}
                  onChange={(e) => setIngameName(e.target.value)}
                  placeholder="VD: Vy Lì"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#5865F2] to-indigo-600 hover:from-[#4752C4] hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-[#5865F2]/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Đang ghi nhận...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Xác thực & Vào hệ thống</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Tab 2: Discord OAuth2 */
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>Đăng nhập bảo mật qua Discord API</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Xác thực trực tiếp bằng tài khoản Discord thật của bạn. Hệ thống sẽ tự động đồng bộ avatar và username.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartDiscordOAuth}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-xs font-black shadow-lg shadow-[#5865F2]/30 flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
                </svg>
                <span>Đăng nhập với Discord</span>
              </button>

              {/* Tùy chọn cấu hình Client ID */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setShowConfigClientId(!showConfigClientId)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>{showConfigClientId ? 'Đóng cấu hình Client ID' : 'Cấu hình Discord Client ID'}</span>
                </button>

                {showConfigClientId && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-left space-y-2">
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      Discord Application Client ID
                    </label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="VD: 123456789012345678"
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                    <div className="flex justify-between items-center pt-1">
                      <a
                        href="https://discord.com/developers/applications"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Discord Developer Portal</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <button
                        type="button"
                        onClick={handleSaveClientId}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold"
                      >
                        Lưu ID
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security & Audit Note */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
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
