import { DiscordUser } from '../types';

export const DISCORD_WEBHOOK_STORAGE_KEY = 'guild_nien_du_discord_webhook_url';
export const DISCORD_USER_STORAGE_KEY = 'guild_nien_du_discord_user';

// Official Application Client ID
export const DISCORD_CLIENT_ID = '1559521882431299594';

// Production Redirect URI registered in Discord Developer Portal
export const DISCORD_REDIRECT_URI = 'https://sapxepnhansunth.web.app/';

// Direct OAuth2 authorization URL (Implicit grant with response_type=token)
export const DISCORD_OAUTH2_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
  DISCORD_REDIRECT_URI
)}&response_type=token&scope=identify%20email`;

// Webhook URL is kept strictly on the backend server for security.
// Client only stores a custom webhook URL if explicitly configured by the user.
export const DEFAULT_DISCORD_WEBHOOK_URL = '';

/**
 * Kiểm tra xem URL có đúng định dạng Discord Webhook chính thức hay không
 */
export function isValidDiscordWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host !== 'discord.com' && host !== 'discordapp.com') return false;
    if (!parsed.pathname.startsWith('/api/webhooks/')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Lấy Webhook URL tùy chỉnh đã lưu trong localStorage (nếu có)
 */
export function getStoredDiscordWebhookUrl(): string {
  try {
    const saved = localStorage.getItem(DISCORD_WEBHOOK_STORAGE_KEY)?.trim();
    if (saved && isValidDiscordWebhookUrl(saved)) return saved;
  } catch {
    // fallback
  }
  return '';
}

/**
 * Lưu Webhook URL tùy chỉnh vào localStorage (Chỉ lưu nếu hợp lệ)
 */
export function setStoredDiscordWebhookUrl(url: string): void {
  try {
    const trimmed = url.trim();
    if (!trimmed) {
      localStorage.removeItem(DISCORD_WEBHOOK_STORAGE_KEY);
    } else if (isValidDiscordWebhookUrl(trimmed)) {
      localStorage.setItem(DISCORD_WEBHOOK_STORAGE_KEY, trimmed);
    }
  } catch (err) {
    console.error('Không thể lưu Discord Webhook URL:', err);
  }
}

/**
 * Lấy thông tin Discord user (Đã chuyển sang WebAssembly Engine)
 */
export function getStoredDiscordUser(): DiscordUser | null {
  // Không bao giờ đọc từ plain text localStorage để chống bypass DevTools
  return null;
}

/**
 * Lưu thông tin Discord user (Không lưu plain-text)
 */
export function setStoredDiscordUser(_user: DiscordUser): void {
  try {
    localStorage.removeItem(DISCORD_USER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Đăng xuất tài khoản Discord
 */
export function clearStoredDiscordUser(): void {
  try {
    localStorage.removeItem(DISCORD_USER_STORAGE_KEY);
  } catch (err) {
    console.error('Lỗi khi xóa Discord session:', err);
  }
}

/**
 * Nhận diện thiết bị cơ bản (tinh gọn)
 */
function detectDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  return `${os} • ${browser}`;
}

/**
 * Gửi thông báo đăng nhập tinh gọn vào kênh #notify_private qua Discord Webhook (không dùng icon)
 */
export async function sendDiscordLoginNotification(
  user: DiscordUser,
  customWebhookUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const targetCustomUrl = (customWebhookUrl || getStoredDiscordWebhookUrl()).trim();

  // 1. Ưu tiên gửi qua Backend Cloud Functions Proxy để giấu hoàn toàn Webhook Secret
  try {
    const apiUrl = import.meta.env.VITE_BACKEND_API_URL || '';
    const backendRes = await fetch(`${apiUrl}/api/notify/discord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'login',
        user,
        ...(targetCustomUrl ? { customWebhookUrl: targetCustomUrl } : {}),
      }),
    });

    if (backendRes.ok) {
      return { success: true };
    }
  } catch (backendErr) {
    console.warn('[Notify] Gửi qua Backend Proxy gặp lỗi:', backendErr);
  }

  // 2. Chỉ fallback sang gửi trực tiếp từ client NẾU người dùng đã tự nhập Custom Webhook URL hợp lệ
  if (targetCustomUrl && isValidDiscordWebhookUrl(targetCustomUrl)) {
    const displayName = user.global_name || user.username;
    const nowVN = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      {
        name: 'Discord User',
        value: `**${user.username}** (${user.global_name || 'N/A'})`,
        inline: false,
      },
      {
        name: 'Discord ID',
        value: `\`${user.id}\``,
        inline: true,
      },
      {
        name: 'Email',
        value: user.email ? `\`${user.email}\`` : '*Không công khai*',
        inline: true,
      },
      {
        name: 'Thời gian truy cập (VN)',
        value: `\`${nowVN}\``,
        inline: false,
      },
      {
        name: 'Cơ chế bảo mật',
        value: '`WebAssembly In-Memory + Client Fallback`',
        inline: false,
      },
    ];

    const payload = {
      username: 'NTH Security Gate',
      embeds: [
        {
          title: 'Xác Thực Đăng Nhập Thành Công',
          description: `Tài khoản **${displayName}** đã vượt qua cổng xác thực bảo mật an toàn.`,
          color: 0x5865f2,
          thumbnail: {
            url: user.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
          },
          fields,
          footer: { text: 'NTH Raid & Bang Chiến' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      const res = await fetch(targetCustomUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return { success: true };
      }
      const errText = await res.text();
      return { success: false, error: `Discord Webhook HTTP ${res.status}: ${errText}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi mạng khi gửi thông báo tới custom Webhook.' };
    }
  }

  return { success: false, error: 'Máy chủ backend chưa sẵn sàng để gửi thông báo.' };
}

/**
 * Kiểm tra kết nối Webhook tinh gọn (không dùng icon)
 */
export async function testDiscordWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = webhookUrl.trim();
  if (!trimmed || !isValidDiscordWebhookUrl(trimmed)) {
    return {
      success: false,
      error: 'URL Webhook không hợp lệ. Chỉ chấp nhận URL HTTPS Discord Webhook chính thức (discord.com/api/webhooks/...).',
    };
  }

  const nowVN = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const payload = {
    username: 'VLBot',
    embeds: [
      {
        title: 'Kiểm Tra Kết Nối',
        description: 'Webhook kênh #notify_private hoạt động bình thường.',
        color: 1096065, // Emerald green
        fields: [
          {
            name: 'Thời gian',
            value: nowVN,
            inline: true,
          },
          {
            name: 'Trạng thái',
            value: 'Hoạt động',
            inline: true,
          },
        ],
        footer: {
          text: 'Bang Niên Du • Mun Kiu',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `Lỗi kết nối Webhook (HTTP ${res.status}): ${errText}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Không thể gửi tin nhắn kiểm tra tới Webhook.',
    };
  }
}
