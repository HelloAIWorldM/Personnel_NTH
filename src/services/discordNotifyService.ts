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

// Default Webhook URL for #notify_private in server Mun Kiu
export const DEFAULT_DISCORD_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1561235562063462450/s2H14lAvwyezgrH0J0prRo81AuIcI7igKIaTdtQzy79bmaCowY2B5cFJ3TxmErlbIySj';

/**
 * Lấy Webhook URL đã lưu trong localStorage (hoặc dùng mặc định nếu chưa lưu)
 */
export function getStoredDiscordWebhookUrl(): string {
  try {
    const saved = localStorage.getItem(DISCORD_WEBHOOK_STORAGE_KEY)?.trim();
    if (saved) return saved;
  } catch {
    // fallback
  }
  return DEFAULT_DISCORD_WEBHOOK_URL;
}

/**
 * Lưu Webhook URL vào localStorage
 */
export function setStoredDiscordWebhookUrl(url: string): void {
  try {
    const trimmed = url.trim();
    if (!trimmed || trimmed === DEFAULT_DISCORD_WEBHOOK_URL) {
      localStorage.removeItem(DISCORD_WEBHOOK_STORAGE_KEY);
    } else {
      localStorage.setItem(DISCORD_WEBHOOK_STORAGE_KEY, trimmed);
    }
  } catch (err) {
    console.error('Không thể lưu Discord Webhook URL:', err);
  }
}

/**
 * Lấy thông tin Discord user đã đăng nhập
 */
export function getStoredDiscordUser(): DiscordUser | null {
  try {
    const raw = localStorage.getItem(DISCORD_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string') {
      return parsed as DiscordUser;
    }
  } catch {
    // corrupted or invalid JSON
  }
  return null;
}

/**
 * Lưu thông tin Discord user vào localStorage
 */
export function setStoredDiscordUser(user: DiscordUser): void {
  try {
    localStorage.setItem(DISCORD_USER_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Không thể lưu Discord user session:', err);
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
  const webhookUrl = (customWebhookUrl || getStoredDiscordWebhookUrl()).trim();

  if (!webhookUrl) {
    return {
      success: false,
      error: 'Chưa cấu hình Discord Webhook cho kênh #notify_private.',
    };
  }

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
      name: 'Discord ID',
      value: user.id,
      inline: true,
    },
    {
      name: 'Thời gian',
      value: `${nowVN} VN`,
      inline: true,
    },
    {
      name: 'Thiết bị',
      value: detectDeviceInfo(),
      inline: true,
    },
  ];

  if (user.email) {
    fields.push({
      name: 'Email',
      value: user.email,
      inline: true,
    });
  }

  const payload = {
    username: 'VLBot',
    embeds: [
      {
        title: 'Thông Báo Đăng Nhập',
        description: `**${displayName}** (@${user.username}) vừa đăng nhập hệ thống.`,
        color: 1096065, // Emerald green (0x10B981)
        fields,
        footer: {
          text: 'Bang Niên Du • Mun Kiu',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `Discord Webhook HTTP ${res.status}: ${errText}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Lỗi gửi Webhook Discord:', err);
    return {
      success: false,
      error: err?.message || 'Lỗi mạng khi gửi thông báo tới Discord Webhook.',
    };
  }
}

/**
 * Kiểm tra kết nối Webhook tinh gọn (không dùng icon)
 */
export async function testDiscordWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl.trim()) {
    return { success: false, error: 'Vui lòng nhập URL Webhook.' };
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
