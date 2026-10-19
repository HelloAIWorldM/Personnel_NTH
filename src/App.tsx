import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { DiscordUser } from './types';
import { DiscordAuthGateModal } from './components/DiscordAuthGateModal';
import {
  loadVerifiedDiscordSession,
  purgeSecureDiscordSession,
} from './services/wasmSecurity';
import { clearStoredDiscordUser } from './services/discordNotifyService';
import { auth } from './services/firebase';
import { signOut } from 'firebase/auth';
import {
  setupDevToolsKeyBlocker,
  startAntiDebugging,
  stopAntiDebugging,
} from './utils/antiTamper';
import { NotFoundPage } from './components/NotFoundPage';

// Code Splitting: The main application (tables, personnel, boards) is lazy-loaded ONLY after authentication.
// This prevents the application code and data structures from existing in the initial bundle.
const ProtectedMainApp = React.lazy(() => import('./components/ProtectedMainApp'));

function WasmLoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3 select-none">
      <div className="w-10 h-10 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin shadow-lg shadow-[#5865F2]/20" />
      <span className="text-sm font-semibold tracking-wide text-slate-200">
        Đang khởi tạo WebAssembly Security Engine...
      </span>
    </div>
  );
}

export default function App() {
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [isWasmVerifying, setIsWasmVerifying] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      return false;
    }
    return true;
  });
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  const verifyAuthSession = useCallback(async () => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      setIsWasmVerifying(false);
      return;
    }

    try {
      const verifiedUser = await loadVerifiedDiscordSession();
      if (verifiedUser) {
        // Đảm bảo Firebase Auth session luôn active cho user đã xác thực
        try {
          if (!auth.currentUser) {
            const { signInAnonymously } = await import('firebase/auth');
            await signInAnonymously(auth);
          }
        } catch (fbErr) {
          console.warn('[Firebase Auth] Error ensuring session on load:', fbErr);
        }
        setDiscordUser(verifiedUser);
      } else {
        setDiscordUser(null);
      }
    } catch (err) {
      console.error('[WebAssembly Security] Lỗi xác thực phiên:', err);
      setDiscordUser(null);
    } finally {
      setIsWasmVerifying(false);
    }
  }, []);

  useEffect(() => {
    // 1. Dọn dẹp triệt để bất kỳ key plain-text nào nếu bị inject từ DevTools
    try {
      localStorage.removeItem('guild_nien_du_discord_user');
      localStorage.removeItem('legacy_auth');
    } catch {}

    verifyAuthSession();

    // 2. Giám sát can thiệp localStorage thời gian thực (chống inject lệnh F12)
    const handleStorageTamper = (e: StorageEvent) => {
      if (
        e.key === 'guild_nien_du_discord_user' ||
        e.key === 'guild_nien_du_auth_session_v2' ||
        e.key === 'legacy_auth'
      ) {
        try {
          localStorage.removeItem('guild_nien_du_discord_user');
          localStorage.removeItem('legacy_auth');
        } catch {}
        verifyAuthSession();
      }
    };

    window.addEventListener('storage', handleStorageTamper);

    return () => {
      window.removeEventListener('storage', handleStorageTamper);
    };
  }, [verifyAuthSession]);

  useEffect(() => {
    // Kích hoạt chặn phím F12, Ctrl+Shift+I và bẫy debugger khi ở Cổng Đăng Nhập
    if (!discordUser) {
      const cleanupKeys = setupDevToolsKeyBlocker(() => !discordUser);
      startAntiDebugging(true);

      return () => {
        cleanupKeys();
        stopAntiDebugging();
      };
    } else {
      stopAntiDebugging();
    }
  }, [discordUser]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {}
    purgeSecureDiscordSession();
    clearStoredDiscordUser();
    setDiscordUser(null);
    showToast('Đã đăng xuất tài khoản an toàn.');
  }, [showToast]);

  // 0. Giao diện 404 Not Found Page khi truy cập đường dẫn /404
  if (currentPath === '/404' || currentPath === '/404/') {
    return (
      <NotFoundPage
        brandName="TrungQuanDev"
        onGoHome={() => {
          window.history.pushState(null, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  // 1. Màn hình chờ kiểm tra chữ ký WebAssembly
  if (isWasmVerifying) {
    return <WasmLoadingSpinner />;
  }

  // 2. STRICT EARLY RETURN: Khi chưa đăng nhập, DOM CHỈ chứa duy nhất Cổng Đăng Nhập.
  // Tuyệt đối không mount bất kỳ module bảng Raid, Bang Chiến hay nhân sự nào vào DOM.
  if (!discordUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden select-none">
        <DiscordAuthGateModal
          isOpen={true}
          onLoginSuccess={(user) => {
            setDiscordUser(user);
          }}
          onShowToast={showToast}
        />

        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-[100] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // 3. Khi đã xác thực an toàn: Dynamic lazy-loading nạp ProtectedMainApp
  return (
    <Suspense fallback={<WasmLoadingSpinner />}>
      <ProtectedMainApp user={discordUser} onLogout={handleLogout} />
    </Suspense>
  );
}
