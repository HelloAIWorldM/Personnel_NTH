import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import {
  RaidBoard,
  PersonnelMember,
  GuildWarBoard,
  CustomClassColors,
} from '../types';

export const DEFAULT_GUILD_ID = 'nth_guild';
export const STORAGE_KEY_GUILD_ID = 'raid_roster_cloud_guild_id_v1';
export const STORAGE_KEY_AUTO_CLOUD_SYNC = 'raid_roster_auto_cloud_sync_v1';

export interface CloudGuildData {
  boards: RaidBoard[];
  personnelPool: PersonnelMember[];
  guildWarBoards: GuildWarBoard[];
  activeBoardId: string;
  activeGuildWarBoardId: string;
  customColors: CustomClassColors;
  updatedAt: number;
  title?: string;
}

export function sanitizeGuildId(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
  return cleaned.slice(0, 64) || DEFAULT_GUILD_ID;
}

export function getSavedGuildId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GUILD_ID);
    if (saved && saved.trim().length > 0) {
      return sanitizeGuildId(saved);
    }
  } catch {}
  return DEFAULT_GUILD_ID;
}

export function saveGuildId(guildId: string): void {
  try {
    const cleaned = sanitizeGuildId(guildId);
    localStorage.setItem(STORAGE_KEY_GUILD_ID, cleaned);
  } catch {}
}

export function isAutoCloudSyncEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_CLOUD_SYNC);
    if (val !== null) {
      return val === 'true';
    }
  } catch {}
  return true; // Mặc định bật để chống mất dữ liệu khi đóng tab
}

export function setAutoCloudSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTO_CLOUD_SYNC, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Lưu dữ liệu lên Firestore an toàn tuân thủ chặt chẽ firestore.rules
 */
export async function pushToCloud(
  guildId: string,
  payload: {
    boards: RaidBoard[];
    personnelPool: PersonnelMember[];
    guildWarBoards: GuildWarBoard[];
    activeBoardId: string;
    activeGuildWarBoardId: string;
    customColors: CustomClassColors;
    title?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = sanitizeGuildId(guildId);
    const docRef = doc(db, 'guilds', targetId);

    // Chuẩn hóa và giới hạn kích thước theo firestore.rules
    const docData: CloudGuildData = {
      boards: (payload.boards || []).slice(0, 100),
      personnelPool: (payload.personnelPool || []).slice(0, 1000),
      guildWarBoards: (payload.guildWarBoards || []).slice(0, 100),
      activeBoardId: String(payload.activeBoardId || '').slice(0, 128),
      activeGuildWarBoardId: String(payload.activeGuildWarBoardId || '').slice(0, 128),
      customColors: payload.customColors || {},
      updatedAt: Date.now(),
      title: payload.title ? String(payload.title).slice(0, 200) : 'Bang NTH',
    };

    await setDoc(docRef, docData, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('[CloudSync] Push error:', err);
    return { success: false, error: err?.message || 'Không thể lưu lên Cloud' };
  }
}

/**
 * Tải dữ liệu từ Firestore
 */
export async function pullFromCloud(guildId: string): Promise<{
  success: boolean;
  data?: CloudGuildData;
  error?: string;
}> {
  try {
    const targetId = sanitizeGuildId(guildId);
    const docRef = doc(db, 'guilds', targetId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { success: false, error: 'Phòng bang chưa có dữ liệu trên Cloud' };
    }

    const data = snap.data() as CloudGuildData;
    return { success: true, data };
  } catch (err: any) {
    console.error('[CloudSync] Pull error:', err);
    return { success: false, error: err?.message || 'Không thể kết nối đến Cloud' };
  }
}

/**
 * Lắng nghe cập nhật thời gian thực từ Cloud
 */
export function subscribeToCloud(
  guildId: string,
  onData: (data: CloudGuildData) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const targetId = sanitizeGuildId(guildId);
    const docRef = doc(db, 'guilds', targetId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CloudGuildData;
          onData(data);
        }
      },
      (error) => {
        console.warn('[CloudSync] Snapshot error:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[CloudSync] Subscribe init error:', err);
    return () => {};
  }
}
