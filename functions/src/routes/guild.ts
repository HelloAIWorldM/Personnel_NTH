import { Router, Request, Response } from 'express';
import { db, auth } from '../config/firebase';

const router = Router();

/**
 * Helper xác thực Bearer token (hỗ trợ cả Firebase ID Token và Discord Bearer Token)
 */
async function isAuthenticated(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  if (!token) return false;

  // 1. Thử xác thực với Firebase Auth ID Token
  try {
    const decoded = await auth.verifyIdToken(token);
    if (decoded && decoded.uid) return true;
  } catch {
    // Không phải Firebase ID token, kiểm tra tiếp với Discord OAuth token
  }

  // 2. Thử xác thực trực tiếp với Discord API
  try {
    const discordRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (discordRes.ok) {
      const u = await discordRes.json();
      if (u && u.id) return true;
    }
  } catch {
    // Discord verify thất bại
  }

  return false;
}

/**
 * GET /api/guild/:guildId
 * Đọc dữ liệu phòng Raid / Bang Chiến qua Firebase Admin SDK (Chỉ cho phép người dùng đã xác thực)
 */
router.get('/:guildId', async (req: Request, res: Response): Promise<void> => {
  try {
    // Kiểm tra đăng nhập bắt buộc
    const authenticated = await isAuthenticated(req);
    if (!authenticated) {
      res.status(401).json({
        error: 'Unauthorized: Yêu cầu xác thực tài khoản để truy cập dữ liệu Bang.',
      });
      return;
    }

    const { guildId } = req.params;
    if (!guildId || !/^[a-zA-Z0-9_.-]+$/.test(guildId)) {
      res.status(400).json({ error: 'Mã phòng guildId không hợp lệ' });
      return;
    }

    const docRef = db.collection('guilds').doc(guildId);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json({ error: 'Không tìm thấy phòng', guildId });
      return;
    }

    res.json({
      success: true,
      data: snap.data(),
    });
  } catch (error: any) {
    console.error('Lỗi đọc phòng guild:', error);
    res.status(500).json({ error: 'Lỗi server khi đọc dữ liệu phòng', details: error?.message });
  }
});

/**
 * POST /api/guild/:guildId
 * Lưu / cập nhật dữ liệu phòng Raid & Bang Chiến qua Firebase Admin SDK
 * Yêu cầu xác thực tài khoản Discord
 */
router.post('/:guildId', async (req: Request, res: Response): Promise<void> => {
  try {
    const authenticated = await isAuthenticated(req);
    if (!authenticated) {
      res.status(401).json({
        error: 'Unauthorized: Yêu cầu xác thực tài khoản để lưu dữ liệu Bang.',
      });
      return;
    }

    const { guildId } = req.params;
    if (!guildId || !/^[a-zA-Z0-9_.-]+$/.test(guildId) || guildId.length > 128) {
      res.status(400).json({ error: 'Mã phòng guildId không hợp lệ' });
      return;
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      res.status(400).json({ error: 'Payload không hợp lệ' });
      return;
    }

    // Giới hạn kích thước payload (tối đa 5MB)
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 5 * 1024 * 1024) {
      res.status(413).json({ error: 'Dữ liệu quá lớn (vượt quá 5MB)' });
      return;
    }

    const docRef = db.collection('guilds').doc(guildId);
    await docRef.set(
      {
        ...payload,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    res.json({ success: true, message: 'Đã lưu dữ liệu phòng thành công' });
  } catch (error: any) {
    console.error('Lỗi lưu dữ liệu guild:', error);
    res.status(500).json({ error: 'Lỗi server khi lưu dữ liệu phòng', details: error?.message });
  }
});

/**
 * POST /api/guild/:guildId/snapshot
 * Lưu bản sao lưu (backup snapshot) cho phòng (Yêu cầu xác thực tài khoản)
 */
router.post('/:guildId/snapshot', async (req: Request, res: Response): Promise<void> => {
  try {
    const authenticated = await isAuthenticated(req);
    if (!authenticated) {
      res.status(401).json({
        error: 'Unauthorized: Yêu cầu xác thực tài khoản để tạo bản sao lưu.',
      });
      return;
    }

    const { guildId } = req.params;
    const { snapshotData, createdBy } = req.body;

    if (!guildId || !/^[a-zA-Z0-9_.-]+$/.test(guildId) || guildId.length > 128) {
      res.status(400).json({ error: 'Mã phòng guildId không hợp lệ (tối đa 128 ký tự an toàn)' });
      return;
    }

    if (!snapshotData || typeof snapshotData !== 'object' || Array.isArray(snapshotData)) {
      res.status(400).json({ error: 'Thiếu dữ liệu snapshot hoặc định dạng dữ liệu không hợp lệ' });
      return;
    }

    // Giới hạn kích thước payload snapshot để chống DoS / Storage Exhaustion (2MB max)
    const jsonSize = JSON.stringify(snapshotData).length;
    if (jsonSize > 2 * 1024 * 1024) {
      res.status(413).json({ error: 'Kích thước dữ liệu snapshot vượt quá giới hạn cho phép (2MB)' });
      return;
    }

    const safeCreatedBy = typeof createdBy === 'string' ? createdBy.slice(0, 100) : 'authenticated_user';

    const backupRef = db
      .collection('guilds')
      .doc(guildId)
      .collection('snapshots')
      .doc(String(Date.now()));

    await backupRef.set({
      createdAt: Date.now(),
      createdBy: safeCreatedBy,
      data: snapshotData,
    });

    res.json({ success: true, message: 'Đã lưu bản sao lưu thành công', backupId: backupRef.id });
  } catch (error: any) {
    console.error('Lỗi lưu snapshot:', error);
    res.status(500).json({ error: 'Lỗi server khi lưu snapshot', details: error?.message });
  }
});

/**
 * GET /api/guild/:guildId/permissions
 * Kiểm tra quyền hạn của người dùng (Admin vs Member) dựa trên Discord ID
 */
router.get('/:guildId/permissions', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ authenticated: false, role: 'guest', canEdit: false });
      return;
    }
    const token = authHeader.split(' ')[1];

    let userId = '';
    let username = '';

    // 1. Thử xác thực với Discord API
    try {
      const discordRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (discordRes.ok) {
        const u = (await discordRes.json()) as any;
        userId = u.id;
        username = u.username;
      }
    } catch {}

    // 2. Fallback Firebase ID Token
    if (!userId) {
      try {
        const decoded = await auth.verifyIdToken(token);
        userId = decoded.uid;
        username = decoded.name || decoded.email || decoded.uid;
      } catch {}
    }

    if (!userId) {
      res.status(401).json({ authenticated: false, role: 'guest', canEdit: false });
      return;
    }

    // Admin và thành viên đều có quyền hạn bình đẳng như nhau (Toàn quyền xem & chỉnh sửa)
    res.json({
      authenticated: true,
      user: { id: userId, username },
      role: 'member',
      canEdit: true,
      message: 'Thành viên Bang Niên Du (Toàn quyền chỉnh sửa & quản lý đội hình)',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Lỗi kiểm tra quyền hạn', details: error?.message });
  }
});

export default router;
