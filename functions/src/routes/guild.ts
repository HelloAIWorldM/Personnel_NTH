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

export default router;
