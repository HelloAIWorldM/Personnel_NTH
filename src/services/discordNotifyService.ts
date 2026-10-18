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

/**
 * Lấy Webhook URL đã lưu trong localStorage
 */
export function getStoredDiscordWebhookUrl(): string {
  try {
    return localStorage.getItem(DISCORD_WEBHOOK_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Lưu Webhook URL vào localStorage
 */
export function setStoredDiscordWebhookUrl(url: string): void {
  try {
    if (!url.trim()) {
      localStorage.removeItem(DISCORD_WEBHOOK_STORAGE_KEY);
    } else {
      localStorage.setItem(DISCORD_WEBHOOK_STORAGE_KEY, url.trim());
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
 * Nhận diện thiết bị cơ bản
 */
function detectDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Trình duyệt Web';
  const ua = navigator.userAgent;
  let os = 'Thiết bị không rõ';
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
 * Gửi thông báo đăng nhập vào kênh #notify_private qua Discord Webhook
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
  const avatarUrl =
    user.avatarUrl ||
    (user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : 'https://cdn.discordapp.com/embed/avatars/0.png');

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

  const payload = {
    username: 'VLBot',
    avatar_url: avatarUrl,
    embeds: [
      {
        author: {
          name: 'VLBot • Thông Báo Đăng Nhập',
          icon_url: avatarUrl,
        },
        title: '🛡️ THÀNH VIÊN ĐĂNG NHẬP HỆ THỐNG',
        description: `Thành viên **${displayName}** (\`@${user.username}\`) vừa đăng nhập vào **Sắp Xếp Nhân Sự Bang Niên Du**.`,
        color: 3908842, // Emerald/Green (#3BA55C)
        thumbnail: {
          url: avatarUrl,
        },
        fields: [
          {
            name: '👤 Tên hiển thị',
            value: `**${displayName}**`,
            inline: true,
          },
          {
            name: '🆔 Discord ID',
            value: `\`${user.id}\``,
            inline: true,
          },
          {
            name: '📧 Email',
            value: user.email ? `\`${user.email}\`` : '*Không công khai*',
            inline: true,
          },
          {
            name: '⏰ Thời gian đăng nhập',
            value: `${nowVN} (Giờ VN)`,
            inline: true,
          },
          {
            name: '🌐 Nền tảng / Thiết bị',
            value: detectDeviceInfo(),
            inline: true,
          },
          {
            name: '🏛️ Máy chủ & Kênh',
            value: '**Mun Kiu** • `#notify_private`',
            inline: true,
          },
        ],
        footer: {
          text: 'Mun Kiu • #notify_private • VLBot System Guard',
          icon_url: avatarUrl,
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
 * Kiểm tra kết nối Webhook
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
        title: '🧪 KIỂM TRA KẾT NỐI WEBHOOK THÀNH CÔNG',
        description:
          'Webhook kênh `#notify_private` trên máy chủ **Mun Kiu** đã kết nối thành công với **Hệ Thống Sắp Xếp Nhân Sự Bang Niên Du**.',
        color: 5793266, // Discord Blurple (#5865F2)
        fields: [
          {
            name: '🤖 Bot phụ trách',
            value: '**VLBot**',
            inline: true,
          },
          {
            name: '⏰ Thời gian kiểm tra',
            value: `${nowVN}`,
            inline: true,
          },
          {
            name: '✅ Trạng thái',
            value: 'Sẵn sàng ghi nhận thông báo đăng nhập',
            inline: false,
          },
        ],
        footer: {
          text: 'Mun Kiu • #notify_private • VLBot',
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
