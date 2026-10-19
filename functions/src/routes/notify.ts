import { Router, Request, Response } from 'express';

const router = Router();

const DEFAULT_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// Rate limiter in-memory: ip -> timestamps
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string, maxRequests = 6, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

/**
 * Strict validator for Discord Webhook URLs to completely prevent SSRF
 */
function isValidDiscordWebhookUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
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
 * POST /api/notify/discord
 * Gửi thông báo an toàn qua Discord Webhook từ phía Server
 * Giúp giấu hoàn toàn Webhook Token bí mật khỏi trình duyệt Client
 */
router.post('/discord', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIp = req.ip || 'unknown';

    if (isRateLimited(clientIp, 6, 60000)) {
      res.status(429).json({ error: 'Too many requests. Vui lòng thử lại sau.' });
      return;
    }

    const { type, user, customWebhookUrl } = req.body;

    let webhookUrl = DEFAULT_WEBHOOK_URL;
    if (customWebhookUrl) {
      if (typeof customWebhookUrl !== 'string' || !isValidDiscordWebhookUrl(customWebhookUrl)) {
        res.status(400).json({
          error: 'URL Webhook không hợp lệ. Chỉ chấp nhận URL HTTPS Discord Webhook chính thức.',
        });
        return;
      }
      webhookUrl = customWebhookUrl.trim();
    }

    if (!webhookUrl) {
      res.status(500).json({ error: 'Discord webhook URL is not configured on server' });
      return;
    }

    let payload: any = {};

    if (type === 'login' && user) {
      // Validate user structure to prevent forged or spam data
      if (!user.id || typeof user.id !== 'string' || !/^\d{16,21}$/.test(user.id)) {
        res.status(400).json({ error: 'Invalid user ID format' });
        return;
      }
      if (!user.username || typeof user.username !== 'string' || user.username.length > 64) {
        res.status(400).json({ error: 'Invalid username format' });
        return;
      }

      const vnTime = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false,
      });

      payload = {
        username: 'NTH Security Gate',
        embeds: [
          {
            title: 'Xác Thực Đăng Nhập Thành Công',
            description: `Tài khoản **${user.global_name || user.username}** đã vượt qua cổng xác thực bảo mật an toàn.`,
            color: 0x5865f2, // Discord Blurple
            thumbnail: {
              url: user.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
            },
            fields: [
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
                value: `\`${vnTime}\``,
                inline: false,
              },
              {
                name: 'Cơ chế bảo mật',
                value: '`WebAssembly In-Memory + Backend Proxy Gate`',
                inline: false,
              },
            ],
            footer: {
              text: 'NTH Raid & Bang Chiến · Backend Proxy',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else {
      res.status(400).json({ error: 'Invalid or unauthorized notification type' });
      return;
    }

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      console.error('Lỗi khi bắn Webhook tới Discord:', errText);
      res.status(discordRes.status).json({
        error: 'Discord Webhook failed',
        details: errText,
      });
      return;
    }

    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error: any) {
    console.error('Lỗi gửi Discord webhook:', error);
    res.status(500).json({
      error: 'Internal server error sending Discord webhook',
      message: error?.message || String(error),
    });
  }
});

export default router;
