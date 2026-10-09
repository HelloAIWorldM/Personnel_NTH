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
  updateBoards?: RaidBoard[];
  updatePersonnelPool?: PersonnelMember[];
  activeUpdateBoardId?: string;
  diBuiPersonnelPool?: PersonnelMember[];
  masterPersonnelPool?: PersonnelMember[];
  guildWarPersonnelPool?: PersonnelMember[];
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
 * Đệ quy làm sạch dữ liệu cho Cloud Firestore:
 * - Loại bỏ hoàn toàn các key có giá trị `undefined` ở mọi cấp độ (Firestore nghiêm cấm undefined)
 * - Lọc bỏ các phần tử undefined trong mảng
 */
export function cleanForFirestore<T>(input: T): T {
  if (input === null || input === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof input === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(input as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = cleanForFirestore(value);
      }
    }
    return result as T;
  }
  return input;
}

/**
 * Tạo dữ liệu phòng trống chuẩn mẫu cho nth_guild
 */
export function getEmptyCloudGuildData(guildId: string = DEFAULT_GUILD_ID): CloudGuildData {
  const timestamp = Date.now();
  const emptyRaidBoard: RaidBoard = {
    id: 'board_1',
    titlePrefix: 'RAID 1',
    scheduleTime: 'MON 20:30',
    bossName: 'NIÊN DU',
    members: Array.from({ length: 12 }, (_, i) => ({
      slot: i + 1,
      ingame: '',
      className: 'Toái Mộng',
      party: i < 6 ? 1 : 2,
    })),
    parties: [
      { id: 1, name: 'PT 1' },
      { id: 2, name: 'PT 2' },
    ],
    minAttendanceRequired: 1,
    reportDate: new Date().toISOString().split('T')[0],
    createdAt: timestamp,
    partyNotes: {},
  };

  const emptyGuildWarBoard: GuildWarBoard = {
    id: 'gw_board_1',
    title: 'Bang Chiến Mẫu',
    members: [],
    minAttendanceRequired: 1,
    reportDate: new Date().toISOString().split('T')[0],
    createdAt: timestamp,
    partyNotes: {},
  };

  return {
    boards: [emptyRaidBoard],
    personnelPool: [],
    guildWarBoards: [emptyGuildWarBoard],
    activeBoardId: 'board_1',
    activeGuildWarBoardId: 'gw_board_1',
    customColors: {},
    updateBoards: [],
    updatePersonnelPool: [],
    activeUpdateBoardId: '',
    diBuiPersonnelPool: [],
    masterPersonnelPool: [],
    guildWarPersonnelPool: [],
    title: 'Phòng Mẫu (Public)',
    updatedAt: timestamp,
  };
}

/**
 * Reset trực tiếp mã phòng nth_guild trên Firestore về dữ liệu sạch trống
 */
export async function resetNthGuildOnCloud(): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'guilds', DEFAULT_GUILD_ID);
    const emptyData = getEmptyCloudGuildData(DEFAULT_GUILD_ID);
    await setDoc(docRef, cleanForFirestore(emptyData));
    return { success: true };
  } catch (err: any) {
    console.error('[CloudSync] Reset nth_guild error:', err);
    return { success: false, error: err?.message || 'Không thể reset nth_guild' };
  }
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
    updateBoards?: RaidBoard[];
    updatePersonnelPool?: PersonnelMember[];
    activeUpdateBoardId?: string;
    diBuiPersonnelPool?: PersonnelMember[];
    masterPersonnelPool?: PersonnelMember[];
    guildWarPersonnelPool?: PersonnelMember[];
    title?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = sanitizeGuildId(guildId);

    // Bảo vệ mã phòng public nth_guild: Luôn luôn giữ trống, không cho lưu đè dữ liệu cá nhân
    if (targetId === DEFAULT_GUILD_ID) {
      return {
        success: false,
        error:
          'Mã "nth_guild" là phòng public và sẽ tự reset dữ liệu. Vui lòng đổi tên nth_guild thành tên bạn muốn rồi ấn Đổi mã & Lưu lên cloud ngay!',
      };
    }

    const docRef = doc(db, 'guilds', targetId);

    // Chuẩn hóa và giới hạn kích thước theo firestore.rules
    const rawData: Record<string, any> = {
      boards: (payload.boards || []).slice(0, 100),
      personnelPool: (payload.personnelPool || []).slice(0, 1000),
      guildWarBoards: (payload.guildWarBoards || []).slice(0, 100),
      activeBoardId: String(payload.activeBoardId || '').slice(0, 128),
      activeGuildWarBoardId: String(payload.activeGuildWarBoardId || '').slice(0, 128),
      customColors: payload.customColors || {},
      updatedAt: Date.now(),
      title: payload.title ? String(payload.title).slice(0, 200) : 'Bang NTH',
    };

    if (payload.updateBoards && Array.isArray(payload.updateBoards)) {
      rawData.updateBoards = payload.updateBoards.slice(0, 100);
    }
    if (payload.updatePersonnelPool && Array.isArray(payload.updatePersonnelPool)) {
      rawData.updatePersonnelPool = payload.updatePersonnelPool.slice(0, 1000);
    }
    if (payload.activeUpdateBoardId) {
      rawData.activeUpdateBoardId = String(payload.activeUpdateBoardId).slice(0, 128);
    }
    if (payload.diBuiPersonnelPool && Array.isArray(payload.diBuiPersonnelPool)) {
      rawData.diBuiPersonnelPool = payload.diBuiPersonnelPool.slice(0, 1000);
    }
    if (payload.masterPersonnelPool && Array.isArray(payload.masterPersonnelPool)) {
      rawData.masterPersonnelPool = payload.masterPersonnelPool.slice(0, 1000);
    }
    if (payload.guildWarPersonnelPool && Array.isArray(payload.guildWarPersonnelPool)) {
      rawData.guildWarPersonnelPool = payload.guildWarPersonnelPool.slice(0, 1000);
    }

    // Làm sạch 100% undefined ở mọi cấp độ trước khi gửi Firestore
    const cleaned = cleanForFirestore(rawData);
    const docData: CloudGuildData = JSON.parse(JSON.stringify(cleaned));

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

    // Mã phòng public nth_guild: Luôn luôn trả về dữ liệu mẫu trống
    if (targetId === DEFAULT_GUILD_ID) {
      return { success: true, data: getEmptyCloudGuildData(DEFAULT_GUILD_ID) };
    }

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
