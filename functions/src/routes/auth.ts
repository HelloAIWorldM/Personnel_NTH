import { Router, Request, Response } from 'express';
import { auth } from '../config/firebase';

const router = Router();

// Discord OAuth2 Constants
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1559521882431299594';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DEFAULT_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://sapxepnhansunth.web.app/';

/**
 * POST /api/auth/discord/token
 * Trao đổi Authorization Code lấy Access Token an toàn trên server
 * Tạo Firebase Custom Token để client đăng nhập Firebase Auth
 */
router.post('/discord/token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Missing code parameter' });
      return;
    }

    if (!DISCORD_CLIENT_SECRET) {
      console.warn('CẢNH BÁO: Chưa cấu hình DISCORD_CLIENT_SECRET trong biến môi trường backend.');
      res.status(500).json({
        error: 'Backend chưa cấu hình DISCORD_CLIENT_SECRET',
        details: 'Vui lòng thiết lập biến môi trường DISCORD_CLIENT_SECRET trên Firebase Functions.',
      });
      return;
    }

    const targetRedirectUri = redirectUri || DEFAULT_REDIRECT_URI;

    // 1. Trao đổi Authorization Code với Discord API
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: targetRedirectUri,
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Lỗi khi exchange code tại Discord:', errText);
      res.status(tokenResponse.status).json({
        error: 'Failed to exchange Discord authorization code',
        details: errText,
      });
      return;
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token?: string;
      scope: string;
    };

    // 2. Lấy thông tin Discord user
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const userErr = await userResponse.text();
      res.status(userResponse.status).json({
        error: 'Failed to fetch Discord user profile',
        details: userErr,
      });
      return;
    }

    const rawUser = (await userResponse.json()) as {
      id: string;
      username: string;
      global_name?: string | null;
      avatar?: string | null;
      discriminator?: string;
      email?: string | null;
    };

    const avatarUrl = rawUser.avatar
      ? `https://cdn.discordapp.com/avatars/${rawUser.id}/${rawUser.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(rawUser.discriminator || '0', 10) % 5) || 0}.png`;

    const discordUser = {
      id: rawUser.id,
      username: rawUser.username,
      global_name: rawUser.global_name || rawUser.username,
      avatar: rawUser.avatar,
      avatarUrl,
      email: rawUser.email || null,
      loginTime: new Date().toISOString(),
    };

    // 3. Tạo / Cập nhật người dùng trong Firebase Auth & Tạo Firebase Custom Token
    const firebaseUid = `discord:${rawUser.id}`;
    let firebaseCustomToken = '';

    try {
      try {
        await auth.updateUser(firebaseUid, {
          displayName: discordUser.global_name || discordUser.username,
          photoURL: avatarUrl,
          ...(discordUser.email ? { email: discordUser.email } : {}),
        });
      } catch (updateErr: any) {
        if (updateErr.code === 'auth/user-not-found') {
          await auth.createUser({
            uid: firebaseUid,
            displayName: discordUser.global_name || discordUser.username,
            photoURL: avatarUrl,
            ...(discordUser.email ? { email: discordUser.email } : {}),
          });
        } else {
          console.warn('Lỗi Firebase updateUser:', updateErr);
        }
      }

      firebaseCustomToken = await auth.createCustomToken(firebaseUid, {
        discordId: rawUser.id,
        username: rawUser.username,
      });
    } catch (fbErr) {
      console.warn('Không thể tạo Firebase Custom Token (tiếp tục trả về user):', fbErr);
    }

    // 4. Trả về kết quả cho client
    res.json({
      success: true,
      user: discordUser,
      accessToken: tokenData.access_token,
      firebaseCustomToken,
      expiresIn: tokenData.expires_in,
    });
  } catch (error: any) {
    console.error('Lỗi server xử lý Discord OAuth:', error);
    res.status(500).json({
      error: 'Internal server error during Discord OAuth exchange',
      message: error?.message || String(error),
    });
  }
});

/**
 * POST /api/auth/discord/verify
 * Xác thực live token từ client xem còn hiệu lực không
 */
router.post('/discord/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userRes.ok) {
      res.status(401).json({ valid: false, error: 'Token expired or revoked' });
      return;
    }

    const user = await userRes.json();
    res.json({ valid: true, user });
  } catch (err: any) {
    res.status(500).json({ error: 'Error verifying token', details: err?.message });
  }
});

export default router;
