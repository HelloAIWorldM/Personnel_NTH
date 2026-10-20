/**
 * Anti-Tamper & Anti-DevTools Security Suite
 * Chống can thiệp mã nguồn qua F12, Console, DevTools và React Developer Tools Extension
 */

/**
 * Frontend View-Layer Mode:
 * Toàn bộ bảo mật, xác thực token và phân quyền đã chuyển giao hoàn toàn sang Backend Vercel.
 * Phía frontend không cần chặn phím F12 hay tạo bẫy debugger nữa.
 */
export function disableReactDevTools(): void {}

export function setupDevToolsKeyBlocker(_isEnabled?: () => boolean): () => void {
  return () => {};
}

export function startAntiDebugging(_active?: boolean): void {}

export function stopAntiDebugging(): void {}
