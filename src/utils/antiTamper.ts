/**
 * Anti-Tamper & Anti-DevTools Security Suite
 * Chống can thiệp mã nguồn qua F12, Console, DevTools và React Developer Tools Extension
 */

/**
 * 1. Vô hiệu hóa React Developer Tools Extension Hook
 * Ngăn chặn hoàn toàn việc hacker/dev mở tab Components trong DevTools để sửa State discordUser
 */
export function disableReactDevTools(): void {
  if (typeof window === 'undefined') return;

  try {
    const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (typeof hook === 'object' && hook !== null) {
      if (typeof hook.inject === 'function') hook.inject = () => {};
      if (typeof hook.onCommitFiberRoot === 'function') hook.onCommitFiberRoot = () => {};
      if (typeof hook.onCommitFiberUnmount === 'function') hook.onCommitFiberUnmount = () => {};
      if (hook.renderers && typeof hook.renderers.set === 'function') {
        hook.renderers = new Map();
      }
    } else {
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true,
        renderers: new Map(),
        inject: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
      };
    }
  } catch {
    // ignore
  }
}

/**
 * 2. Chặn các phím tắt mở DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U) và Chuột phải ở Cổng Đăng Nhập
 */
export function setupDevToolsKeyBlocker(isEnabled: () => boolean = () => true): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isEnabled()) return;

    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + I (Inspect) / Cmd + Option + I
    // Ctrl + Shift + J (Console) / Cmd + Option + J
    // Ctrl + Shift + C (Element Inspector) / Cmd + Option + C
    // Ctrl + Shift + K (Firefox Console)
    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      ['I', 'i', 'J', 'j', 'C', 'c', 'K', 'k'].includes(e.key)
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + U (View Page Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + S (Save webpage)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    if (!isEnabled()) return;
    // Chặn chuột phải để ngăn bấm Inspect Element khi ở Cổng Đăng Nhập
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('contextmenu', handleContextMenu, true);

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('contextmenu', handleContextMenu, true);
  };
}

/**
 * 3. Bẫy Anti-Debugging (Debugger Loop Trap)
 * Khi DevTools mở ra, lệnh debugger sẽ liên tục dừng trình duyệt lại, làm tê liệt Console & Sources
 */
let debuggerTimer: any = null;

export function startAntiDebugging(active: boolean = true): void {
  if (typeof window === 'undefined') return;

  if (debuggerTimer) {
    clearInterval(debuggerTimer);
    debuggerTimer = null;
  }

  if (!active) return;

  debuggerTimer = setInterval(() => {
    try {
      // Gọi debugger gián tiếp qua constructor để né các bộ lọc tĩnh
      const checkDebugger = function () {
        return false;
      };
      (checkDebugger as any)['constructor']('debugger').call(null);
    } catch {
      // ignore
    }
  }, 400);
}

export function stopAntiDebugging(): void {
  if (debuggerTimer) {
    clearInterval(debuggerTimer);
    debuggerTimer = null;
  }
}
