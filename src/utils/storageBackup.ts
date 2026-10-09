/**
 * Multi-layer Storage, IndexedDB, Auto-Snapshot & Backup/Restore Utility
 * Đảm bảo dữ liệu bảng Raid và Bang Chiến không bao giờ bị mất khi tắt máy, load lại trình duyệt.
 */

import {
  RaidBoard,
  RaidMember,
  PersonnelMember,
  CustomClassColors,
  GuildWarBoard,
  GuildMember,
  GuildWarSession,
  GuildRole,
  GuildTeam,
  RaidClass,
} from '../types';
import { createEmptyBoard, INITIAL_PERSONNEL_POOL } from '../constants/classes';
import { createEmptyGuildWarBoard, DEFAULT_GUILD_SESSIONS } from '../constants/guildWarDefaults';
import { normalizeName } from './duplicates';

export const STORAGE_KEY_BOARDS = 'raid_roster_boards_v2';
export const STORAGE_KEY_ACTIVE_BOARD = 'raid_roster_active_board_id_v2';
export const STORAGE_KEY_PERSONNEL = 'raid_roster_personnel_pool_v2';
export const STORAGE_KEY_COLORS = 'raid_roster_custom_colors_v1';
export const STORAGE_KEY_THEME = 'raid_roster_theme_mode_v1';
export const STORAGE_KEY_GUILDWAR_BOARDS = 'guildwar_roster_boards_v1';
export const STORAGE_KEY_ACTIVE_GUILDWAR = 'guildwar_active_board_id_v1';
export const STORAGE_KEY_APP_MODE = 'guildwar_app_mode_v1';
export const STORAGE_KEY_BOARDS_UPDATE = 'raid_update_boards_v1';
export const STORAGE_KEY_ACTIVE_BOARD_UPDATE = 'raid_update_active_board_id_v1';
export const STORAGE_KEY_PERSONNEL_UPDATE = 'raid_update_personnel_pool_v1';
export const STORAGE_KEY_PERSONNEL_DI_BUI = 'raid_personnel_pool_di_bui_v1';
export const STORAGE_KEY_MASTER_PERSONNEL = 'raid_roster_master_personnel_v1';
export const STORAGE_KEY_GUILDWAR_PERSONNEL = 'guildwar_roster_personnel_pool_v1';
export const STORAGE_KEY_MASTER_MIGRATION_FLAG = 'raid_roster_master_migration_done_v1';
export const STORAGE_KEY_GW_TO_MASTER_SYNC_FLAG = 'raid_roster_gw_to_master_sync_v2';
export const STORAGE_KEY_SNAPSHOTS = 'raid_roster_auto_snapshots_v2';

export const LEGACY_STORAGE_KEY_MEMBERS = 'raid_roster_members_v1';
export const LEGACY_STORAGE_KEY_CONFIG = 'raid_roster_config_v1';
export const LEGACY_STORAGE_KEY_PARTIES = 'raid_roster_parties_v1';

// IndexedDB Constants
const IDB_NAME = 'RaidPersonnelDB_v2';
const IDB_STORE_NAME = 'app_state';
const IDB_VERSION = 1;

/**
 * Yêu cầu quyền Persistent Storage từ trình duyệt (Chrome / Edge / Firefox / Safari).
 * Ngăn trình duyệt tự ý xóa IndexedDB và LocalStorage khi máy tính sắp hết dung lượng ổ đĩa.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.info(
          `[Storage] Quyền lưu trữ vĩnh viễn (Persistent Storage): ${
            granted ? 'ĐÃ ĐƯỢC CẤP' : 'TỰ ĐỘNG BỞI TRÌNH DUYỆT'
          }`
        );
        return granted;
      }
      return true;
    } catch (e) {
      console.warn('[Storage] Lỗi khi yêu cầu Persistent Storage:', e);
    }
  }
  return false;
}

/**
 * Mở kết nối IndexedDB an toàn
 */
function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[IndexedDB] Cannot open database:', request.error);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Ghi dữ liệu vào IndexedDB an toàn với cam kết transaction hoàn tất (tx.oncomplete)
 */
export function saveToIndexedDB(key: string, value: any): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      const db = await openIDB();
      if (!db) {
        resolve(false);
        return;
      }
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => {
        console.warn(`[IndexedDB] Error committing ${key}:`, e);
        resolve(false);
      };
      tx.onabort = () => resolve(false);
    } catch (err) {
      console.warn(`[IndexedDB] Error saving ${key}:`, err);
      resolve(false);
    }
  });
}

/**
 * Đọc dữ liệu từ IndexedDB ngầm
 */
export async function getFromIndexedDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Ghi an toàn vào localStorage với cơ chế chống tràn bộ nhớ (QuotaExceededError)
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    // Nếu gặp lỗi đầy bộ nhớ (QuotaExceededError)
    if (
      err.name === 'QuotaExceededError' ||
      err.code === 22 ||
      err.code === 1014 ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
      console.warn('[LocalStorage] Quota exceeded. Cleaning old snapshots to free space...');
      try {
        // Thu gọn hoặc xóa bớt snapshots trong localStorage để nhường chỗ cho dữ liệu chính
        const rawSnapshots = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
        if (rawSnapshots) {
          const parsed = JSON.parse(rawSnapshots);
          if (Array.isArray(parsed) && parsed.length > 2) {
            // Chỉ giữ lại 2 snapshot gần nhất
            localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(parsed.slice(0, 2)));
            // Thử lại
            localStorage.setItem(key, value);
            return true;
          } else {
            // Xóa hẳn snapshots khỏi localStorage vì snapshot đã được lưu an toàn trong IndexedDB
            localStorage.removeItem(STORAGE_KEY_SNAPSHOTS);
            localStorage.setItem(key, value);
            return true;
          }
        }
      } catch (innerErr) {
        console.error('[LocalStorage] Critical quota error, fallback to IndexedDB only:', innerErr);
      }
    }
    return false;
  }
}

export interface AutoSnapshot {
  id: string;
  timestamp: number;
  label: string;
  boardCount: number;
  totalMembersWithData: number;
  boards: RaidBoard[];
  personnelPool: PersonnelMember[];
  customColors?: CustomClassColors;
  guildWarBoards?: GuildWarBoard[];
  personnelCount: number;
  diBuiPersonnelPool?: PersonnelMember[];
  masterPersonnelPool?: PersonnelMember[];
  guildWarPersonnelPool?: PersonnelMember[];
}

/**
 * Chuẩn hóa một RaidBoard để tránh thiếu field (bảo toàn 100% dữ liệu do người dùng nhập)
 */
export function sanitizeRaidBoard(board: any, index: number = 1): RaidBoard {
  const timestamp = Date.now();
  const id = typeof board?.id === 'string' && board.id ? board.id : `board_${timestamp}_${index}`;
  const titlePrefix = typeof board?.titlePrefix === 'string' ? board.titlePrefix : `RAID ${index}`;
  const scheduleTime = typeof board?.scheduleTime === 'string' ? board.scheduleTime : 'MON 20:30';
  const bossName = typeof board?.bossName === 'string' ? board.bossName : 'NIÊN DU';
  const parties = Array.isArray(board?.parties) && board.parties.length > 0
    ? board.parties
    : [{ id: 1, name: 'PT 1' }, { id: 2, name: 'PT 2' }];

  let members: RaidMember[] = Array.isArray(board?.members)
    ? board.members.map((m: any, mIdx: number) => ({
        id: typeof m?.id === 'string' && m.id ? m.id : `m_${timestamp}_${mIdx + 1}`,
        stt: typeof m?.stt === 'number' ? m.stt : mIdx + 1,
        ingame: typeof m?.ingame === 'string' ? m.ingame : '',
        className: (m?.className || 'Toái Mộng') as RaidClass,
        loggedBy: typeof m?.loggedBy === 'string' ? m.loggedBy : '',
        party: typeof m?.party === 'number' ? m.party : (mIdx < 6 ? 1 : 2),
        checked: Boolean(m?.checked),
      }))
    : [];

  return {
    id,
    titlePrefix,
    scheduleTime,
    bossName,
    parties,
    members: members.length > 0 ? members : createEmptyBoard(index).members,
    createdAt: typeof board?.createdAt === 'number' ? board.createdAt : timestamp,
  };
}

/**
 * Chuẩn hóa một GuildWarBoard để tránh thiếu field (bảo toàn 100% dữ liệu)
 */
export function sanitizeGuildWarBoard(board: any, index: number = 1): GuildWarBoard {
  const timestamp = Date.now();
  const id = typeof board?.id === 'string' && board.id ? board.id : `gw_board_${timestamp}_${index}`;
  const title = typeof board?.title === 'string' ? board.title : `BANG CHIẾN TUẦN ${index}`;
  const scheduleTime = typeof board?.scheduleTime === 'string' ? board.scheduleTime : 'T7 20:00 & CN 20:00';
  const targetName = typeof board?.targetName === 'string' ? board.targetName : 'Công Thành / Đẩy Trụ';
  const minAttendanceRequired = typeof board?.minAttendanceRequired === 'number' ? board.minAttendanceRequired : 4;
  const reportDate = typeof board?.reportDate === 'string' ? board.reportDate : new Date().toLocaleDateString('vi-VN');

  const sessions: GuildWarSession[] = Array.isArray(board?.sessions) && board.sessions.length > 0
    ? board.sessions
    : DEFAULT_GUILD_SESSIONS.map((s) => ({ ...s }));

  let members: GuildMember[] = Array.isArray(board?.members)
    ? board.members.map((m: any, mIdx: number) => {
        const rawLoggedBy = typeof m?.loggedBy === 'string' && m.loggedBy.trim()
          ? m.loggedBy.trim()
          : (typeof m?.discord === 'string' && m.discord.trim() ? m.discord.trim() : (typeof m?.ingame === 'string' ? m.ingame.trim() : ''));

        const mem: GuildMember = {
          id: typeof m?.id === 'string' && m.id ? m.id : `gw_m_${timestamp}_${mIdx + 1}`,
          stt: typeof m?.stt === 'number' ? m.stt : mIdx + 1,
          ingame: typeof m?.ingame === 'string' ? m.ingame : '',
          className: (m?.className || 'Cửu Linh') as RaidClass,
          guildRole: (m?.guildRole || 'Thành Viên') as GuildRole,
          participation: m?.participation || 'Cả hai',
          loggedBy: rawLoggedBy,
          discord: typeof m?.discord === 'string' ? m.discord : rawLoggedBy,
          team: (m?.team || 'Chưa xếp') as GuildTeam,
          attendance: typeof m?.attendance === 'object' && m.attendance ? { ...m.attendance } : {},
          note: typeof m?.note === 'string' ? m.note : '',
        };
        if (typeof m?.party === 'number') mem.party = m.party;
        if (typeof m?.slot === 'number') mem.slot = m.slot;
        if (typeof m?.updatedAt === 'string') mem.updatedAt = m.updatedAt;
        return mem;
      })
    : [];

  return {
    id,
    title,
    scheduleTime,
    targetName,
    sessions,
    members,
    minAttendanceRequired,
    reportDate,
    createdAt: typeof board?.createdAt === 'number' ? board.createdAt : timestamp,
    partyNotes: typeof board?.partyNotes === 'object' && board.partyNotes !== null ? { ...board.partyNotes } : {},
  };
}

/**
 * Đếm số lượng thành viên đã có tên ingame trong các bảng Raid
 */
export function countMembersWithData(boards: RaidBoard[]): number {
  if (!Array.isArray(boards)) return 0;
  return boards.reduce((acc, board) => {
    const valid = (board.members || []).filter((m) => m && m.ingame && m.ingame.trim().length > 0);
    return acc + valid.length;
  }, 0);
}

/**
 * Đếm số lượng thành viên có tên trong các bảng Bang Chiến
 */
export function countGuildWarMembers(guildWarBoards: GuildWarBoard[]): number {
  if (!Array.isArray(guildWarBoards)) return 0;
  return guildWarBoards.reduce((acc, board) => {
    const valid = (board.members || []).filter((m) => m && m.ingame && m.ingame.trim().length > 0);
    return acc + valid.length;
  }, 0);
}

/**
 * Lấy danh sách các bản tự động sao lưu (Auto-snapshots)
 */
export function getAutoSnapshots(): AutoSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[AutoSnapshot] Error reading snapshots:', e);
    return [];
  }
}

/**
 * Tự động tạo snapshot nếu dữ liệu có giá trị (có thành viên hoặc kho có người)
 * Giữ tối đa 10 bản ghi gần nhất.
 */
export function saveAutoSnapshot(
  boards: RaidBoard[],
  personnelPool: PersonnelMember[],
  customColors?: CustomClassColors,
  guildWarBoards?: GuildWarBoard[],
  diBuiPersonnelPool?: PersonnelMember[],
  masterPersonnelPool?: PersonnelMember[],
  guildWarPersonnelPool?: PersonnelMember[]
): void {
  try {
    const totalMembers = countMembersWithData(boards);
    const totalGwMembers = guildWarBoards ? countGuildWarMembers(guildWarBoards) : 0;
    const personnelCount = Array.isArray(personnelPool) ? personnelPool.length : 0;
    const diBuiCount = Array.isArray(diBuiPersonnelPool) ? diBuiPersonnelPool.length : 0;
    const masterCount = Array.isArray(masterPersonnelPool) ? masterPersonnelPool.length : 0;

    // Không snapshot nếu hoàn toàn không có dữ liệu nào
    if (totalMembers === 0 && totalGwMembers === 0 && personnelCount === 0 && diBuiCount === 0 && masterCount === 0) {
      return;
    }

    const snapshots = getAutoSnapshots();
    const lastSnap = snapshots[0];
    const now = Date.now();

    // Nếu snapshot gần nhất cách chưa đầy 60 giây và số lượng thành viên không đổi thì bỏ qua để tránh rác storage
    if (
      lastSnap &&
      now - lastSnap.timestamp < 60000 &&
      lastSnap.totalMembersWithData === totalMembers &&
      lastSnap.personnelCount === personnelCount
    ) {
      return;
    }

    const newSnapshot: AutoSnapshot = {
      id: `snap_${now}`,
      timestamp: now,
      label: `Bản lưu ${new Date(now).toLocaleTimeString('vi-VN')} (${totalMembers} thành viên Raid, ${totalGwMembers} Bang chiến, ${masterCount} tổng kho, ${personnelCount} kho Raid${diBuiCount > 0 ? `, ${diBuiCount} đi bụi` : ''})`,
      boardCount: boards.length,
      totalMembersWithData: totalMembers,
      boards: JSON.parse(JSON.stringify(boards)),
      personnelPool: JSON.parse(JSON.stringify(personnelPool)),
      customColors: customColors ? { ...customColors } : {},
      guildWarBoards: guildWarBoards ? JSON.parse(JSON.stringify(guildWarBoards)) : [],
      personnelCount,
      diBuiPersonnelPool: diBuiPersonnelPool ? JSON.parse(JSON.stringify(diBuiPersonnelPool)) : [],
      masterPersonnelPool: masterPersonnelPool ? JSON.parse(JSON.stringify(masterPersonnelPool)) : [],
      guildWarPersonnelPool: guildWarPersonnelPool ? JSON.parse(JSON.stringify(guildWarPersonnelPool)) : [],
    };

    // Giới hạn 10 snapshots gần nhất để tiết kiệm dung lượng
    const updatedSnapshots = [newSnapshot, ...snapshots.slice(0, 9)];
    const serialized = JSON.stringify(updatedSnapshots);

    // Ghi an toàn vào localStorage (tự động dọn bớt nếu đầy bộ nhớ)
    safeLocalStorageSet(STORAGE_KEY_SNAPSHOTS, serialized);

    // Luôn lưu đầy đủ vào IndexedDB (không lo bị giới hạn dung lượng)
    saveToIndexedDB('snapshots', updatedSnapshots);
  } catch (err) {
    console.warn('[AutoSnapshot] Warning:', err);
  }
}

/**
 * Tải danh sách boards với cơ chế phục hồi đa tầng (Đồng bộ):
 * 1. Đọc localStorage boards
 * 2. Nếu không có hoặc rỗng, kiểm tra auto snapshot gần nhất có dữ liệu
 * 3. Nếu vẫn không có, kiểm tra legacy storage
 * 4. Fallback cuối cùng là bảng sạch mặc định (không chứa dữ liệu rác mẫu)
 */
export function loadInitialBoards(): { boards: RaidBoard[]; activeBoardId: string } {
  let loadedBoards: RaidBoard[] | null = null;

  try {
    // 1. Thử đọc từ localStorage
    const saved = localStorage.getItem(STORAGE_KEY_BOARDS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedBoards = parsed.map((b, idx) => sanitizeRaidBoard(b, idx + 1));
      }
    }
  } catch (e) {
    console.error('[Storage] Error reading saved boards:', e);
  }

  // 2. Nếu localStorage rỗng hoàn toàn, thử khôi phục từ snapshot gần nhất
  if (!loadedBoards || loadedBoards.length === 0) {
    const snapshots = getAutoSnapshots();
    const validSnap = snapshots.find((s) => s.boards && s.boards.length > 0);
    if (validSnap) {
      console.info('[Storage] Tự động phục hồi bảng Raid từ bản sao lưu gần nhất:', validSnap.label);
      loadedBoards = validSnap.boards.map((b, idx) => sanitizeRaidBoard(b, idx + 1));
      try {
        safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(loadedBoards));
      } catch {}
    }
  }

  // 3. Migrate từ legacy storage
  if (!loadedBoards || loadedBoards.length === 0) {
    try {
      const legacyMembers = localStorage.getItem(LEGACY_STORAGE_KEY_MEMBERS);
      const legacyConfig = localStorage.getItem(LEGACY_STORAGE_KEY_CONFIG);
      const legacyParties = localStorage.getItem(LEGACY_STORAGE_KEY_PARTIES);
      if (legacyMembers) {
        const parsedMembers: RaidMember[] = JSON.parse(legacyMembers);
        const parsedConfig = legacyConfig ? JSON.parse(legacyConfig) : {};
        const parsedParties = legacyParties ? JSON.parse(legacyParties) : [
          { id: 1, name: 'PT 1' },
          { id: 2, name: 'PT 2' },
        ];
        loadedBoards = [
          sanitizeRaidBoard({
            id: 'board_1',
            titlePrefix: parsedConfig.titlePrefix || 'RAID 1',
            scheduleTime: parsedConfig.scheduleTime || 'MON 20:30',
            bossName: parsedConfig.bossName || 'NIÊN DU',
            members: parsedMembers,
            parties: parsedParties,
            createdAt: Date.now(),
          }),
        ];
      }
    } catch {}
  }

  // 4. Fallback mặc định: Tạo bảng sạch
  if (!loadedBoards || loadedBoards.length === 0) {
    loadedBoards = [createEmptyBoard(1)];
  }

  // Xác định activeBoardId hợp lệ
  let activeId = loadedBoards[0]?.id || 'board_1';
  try {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_BOARD);
    if (savedId && loadedBoards.some((b) => b.id === savedId)) {
      activeId = savedId;
    }
  } catch {}

  return { boards: loadedBoards, activeBoardId: activeId };
}

/**
 * Tải kho nhân sự với cơ chế phục hồi đa tầng:
 * 1. Đọc localStorage: Nếu có mảng hợp lệ, bảo toàn 100% dữ liệu
 * 2. Nếu localStorage chưa có gì, thử khôi phục từ snapshot
 * 3. Fallback mặc định là []
 */
export function loadInitialPersonnel(initialFallback: PersonnelMember[] = []): PersonnelMember[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PERSONNEL);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[Storage] Error loading personnel from localStorage:', e);
  }

  // Thử khôi phục từ snapshot nếu localStorage chưa có VÀ chưa migrate sang master pool
  const isMigrated = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_MASTER_MIGRATION_FLAG) === 'true';
  if (!isMigrated) {
    const snapshots = getAutoSnapshots();
    const validSnap = snapshots.find(
      (s) => s.personnelPool && Array.isArray(s.personnelPool) && s.personnelPool.length > 0
    );
    if (validSnap && Array.isArray(validSnap.personnelPool)) {
      console.info('[Storage] Tự động phục hồi Kho nhân sự từ Snapshot gần nhất:', validSnap.label);
      try {
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(validSnap.personnelPool));
      } catch {}
      return validSnap.personnelPool;
    }
  }

  return initialFallback;
}

/**
 * Hàm kiểm tra tính hợp lệ của danh sách nhân sự (không bao giờ tự ý xoá dữ liệu người dùng)
 */
export function isSamplePersonnelPool(_pool: PersonnelMember[]): boolean {
  return false;
}

/**
 * Gộp hai danh sách nhân sự thông minh theo tên Ingame (không phân biệt hoa/thường):
 * Giữ nguyên thông tin chi tiết, đảm bảo tuyệt đối không bỏ sót bất kỳ nhân sự nào.
 */
export function mergePersonnelPools(
  primary: PersonnelMember[],
  secondary: PersonnelMember[]
): PersonnelMember[] {
  if (!Array.isArray(primary) && !Array.isArray(secondary)) return [];
  if (!Array.isArray(primary)) return secondary || [];
  if (!Array.isArray(secondary)) return primary || [];

  const map = new Map<string, PersonnelMember>();

  // Nạp danh sách secondary trước (từ IndexedDB hoặc snapshot)
  for (const item of secondary) {
    if (item && item.ingame && typeof item.ingame === 'string') {
      const norm = item.ingame.trim().toLowerCase();
      if (norm) {
        map.set(norm, item);
      }
    }
  }

  // Ghi đè hoặc thêm mới bằng danh sách primary (state hiện thời)
  for (const item of primary) {
    if (item && item.ingame && typeof item.ingame === 'string') {
      const norm = item.ingame.trim().toLowerCase();
      if (norm) {
        map.set(norm, item);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Tải danh sách bảng Bang Chiến với cơ chế phục hồi
 */
export function loadInitialGuildWarBoards(): { boards: GuildWarBoard[]; activeBoardId: string } {
  let loadedBoards: GuildWarBoard[] | null = null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY_GUILDWAR_BOARDS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedBoards = parsed.map((b, idx) => sanitizeGuildWarBoard(b, idx + 1));
      }
    }
  } catch (e) {
    console.error('[Storage] Error loading guild war boards:', e);
  }

  if (!loadedBoards || loadedBoards.length === 0) {
    const snapshots = getAutoSnapshots();
    const validSnap = snapshots.find(
      (s) => s.guildWarBoards && Array.isArray(s.guildWarBoards) && s.guildWarBoards.length > 0
    );
    if (validSnap && validSnap.guildWarBoards) {
      loadedBoards = validSnap.guildWarBoards.map((b, idx) => sanitizeGuildWarBoard(b, idx + 1));
    }
  }

  if (!loadedBoards || loadedBoards.length === 0) {
    loadedBoards = [createEmptyGuildWarBoard(1)];
  }

  let activeId = loadedBoards[0]?.id || '';
  try {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_GUILDWAR);
    if (savedId && loadedBoards.some((b) => b.id === savedId)) {
      activeId = savedId;
    }
  } catch {}

  return { boards: loadedBoards, activeBoardId: activeId };
}

/**
 * Tải danh sách bảng Raid Update
 */
export function loadInitialUpdateBoards(): { boards: RaidBoard[]; activeBoardId: string } {
  let loadedBoards: RaidBoard[] | null = null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY_BOARDS_UPDATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedBoards = parsed.map((b, idx) => sanitizeRaidBoard(b, idx + 1));
      }
    }
  } catch (e) {
    console.error('[Storage] Error loading raid update boards:', e);
  }

  if (!loadedBoards || loadedBoards.length === 0) {
    const initialBoard = createEmptyBoard(1);
    initialBoard.titlePrefix = 'RAID 1';
    loadedBoards = [initialBoard];
  }

  let activeId = loadedBoards[0]?.id || '';
  try {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_BOARD_UPDATE);
    if (savedId && loadedBoards.some((b) => b.id === savedId)) {
      activeId = savedId;
    }
  } catch {}

  return { boards: loadedBoards, activeBoardId: activeId };
}

/**
 * Tải kho nhân sự riêng biệt của Raid Update
 */
export function loadInitialUpdatePersonnel(initialFallback: PersonnelMember[] = []): PersonnelMember[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PERSONNEL_UPDATE);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[Storage] Error loading update personnel from localStorage:', e);
  }
  return initialFallback;
}

/**
 * Tải kho nhân sự riêng biệt của Kho Đi Bụi (chứa nhân sự trong thời gian tạm nghỉ / chờ quay lại game)
 */
export function loadInitialDiBuiPersonnel(initialFallback: PersonnelMember[] = []): PersonnelMember[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PERSONNEL_DI_BUI);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[Storage] Error loading di bui personnel from localStorage:', e);
  }
  return initialFallback;
}

/**
 * Tải Tổng Kho Nhân Sự (Master Personnel Pool) với cơ chế tự động chuyển đổi an toàn (One-time Auto Migration):
 * 1. Đọc localStorage Master Personnel Pool nếu có.
 * 2. Nếu chưa có hoặc chưa migrate:
 *    - Gom toàn bộ nhân sự từ Kho Raid cũ, Kho Raid Update cũ, Kho Đi Bụi cũ, và các snapshots.
 *    - Khử trùng theo normalizeName, giữ thông tin chi tiết nhất (loggedBy, note, className).
 *    - Lưu an toàn vào STORAGE_KEY_MASTER_PERSONNEL và IndexedDB 'masterPersonnelPool'.
 *    - Đánh dấu migration flag đã hoàn thành.
 *    - Chia các kho con (Raid, Update, Bang Chiến) thành kho trống riêng biệt như yêu cầu.
 */
/**
 * Trích xuất tất cả thành viên hợp lệ từ các bảng Bang Chiến và kho Bang Chiến thành PersonnelMember
 */
export function extractGuildWarMembersAsPersonnel(
  guildWarBoards?: GuildWarBoard[],
  guildWarPersonnel?: PersonnelMember[]
): PersonnelMember[] {
  const result: PersonnelMember[] = [];
  const visited = new Set<string>();

  const addIfValid = (ingame?: string, className?: RaidClass, loggedBy?: string, note?: string, id?: string) => {
    if (!ingame || typeof ingame !== 'string') return;
    const cleanIngame = ingame.trim();
    if (!cleanIngame) return;
    const norm = normalizeName(cleanIngame);
    if (!norm || visited.has(norm)) return;
    visited.add(norm);

    result.push({
      id: id || `p_gw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ingame: cleanIngame,
      className: className || 'Cửu Linh',
      loggedBy: (loggedBy && loggedBy.trim()) || cleanIngame,
      note: note || '',
      createdAt: Date.now(),
    });
  };

  // 1. Từ mảng guildWarBoards truyền vào
  if (Array.isArray(guildWarBoards)) {
    for (const b of guildWarBoards) {
      if (Array.isArray(b.members)) {
        for (const m of b.members) {
          addIfValid(m?.ingame, m?.className, m?.loggedBy || m?.discord || m?.ingame, m?.note, m?.id);
        }
      }
    }
  }

  // 2. Từ mảng guildWarPersonnel truyền vào
  if (Array.isArray(guildWarPersonnel)) {
    for (const p of guildWarPersonnel) {
      addIfValid(p?.ingame, p?.className, p?.loggedBy, p?.note, p?.id);
    }
  }

  // 3. Fallback đọc thêm từ localStorage
  try {
    const rawGwBoards = localStorage.getItem(STORAGE_KEY_GUILDWAR_BOARDS);
    if (rawGwBoards) {
      const parsedBoards = JSON.parse(rawGwBoards);
      if (Array.isArray(parsedBoards)) {
        for (const b of parsedBoards) {
          if (Array.isArray(b?.members)) {
            for (const m of b.members) {
              addIfValid(m?.ingame, m?.className, m?.loggedBy || m?.discord || m?.ingame, m?.note, m?.id);
            }
          }
        }
      }
    }
  } catch {}

  try {
    const rawGwPool = localStorage.getItem(STORAGE_KEY_GUILDWAR_PERSONNEL);
    if (rawGwPool) {
      const parsedPool = JSON.parse(rawGwPool);
      if (Array.isArray(parsedPool)) {
        for (const p of parsedPool) {
          addIfValid(p?.ingame, p?.className, p?.loggedBy, p?.note, p?.id);
        }
      }
    }
  } catch {}

  // 4. Fallback đọc thêm từ AutoSnapshots gần nhất
  try {
    const snaps = getAutoSnapshots();
    if (Array.isArray(snaps)) {
      for (const s of snaps.slice(0, 5)) {
        if (Array.isArray(s.guildWarBoards)) {
          for (const b of s.guildWarBoards) {
            if (Array.isArray(b?.members)) {
              for (const m of b.members) {
                addIfValid(m?.ingame, m?.className, m?.loggedBy || m?.discord || m?.ingame, m?.note, m?.id);
              }
            }
          }
        }
        if (Array.isArray(s.guildWarPersonnelPool)) {
          for (const p of s.guildWarPersonnelPool) {
            addIfValid(p?.ingame, p?.className, p?.loggedBy, p?.note, p?.id);
          }
        }
      }
    }
  } catch {}

  return result;
}

/**
 * Tự động đồng bộ các nhân sự từ Bang Chiến vào Tổng kho nhân sự nếu chưa có
 * Đảm bảo Tổng kho nhận đủ 100% nhân sự mà không bao giờ làm trùng lặp hay mất dữ liệu.
 */
export function syncGuildWarMembersToMasterPool(
  currentMasterPool: PersonnelMember[],
  guildWarBoards?: GuildWarBoard[],
  guildWarPersonnel?: PersonnelMember[]
): { updatedPool: PersonnelMember[]; addedCount: number } {
  const masterMap = new Map<string, PersonnelMember>();

  for (const p of currentMasterPool) {
    if (p && p.ingame && typeof p.ingame === 'string') {
      const norm = normalizeName(p.ingame);
      if (norm) {
        masterMap.set(norm, { ...p });
      }
    }
  }

  const initialCount = masterMap.size;
  const gwPersonnel = extractGuildWarMembersAsPersonnel(guildWarBoards, guildWarPersonnel);

  for (const p of gwPersonnel) {
    const norm = normalizeName(p.ingame);
    if (!norm) continue;

    const existing = masterMap.get(norm);
    if (!existing) {
      masterMap.set(norm, { ...p });
    } else {
      // Làm giàu thông tin nếu trong kho hiện tại còn thiếu note hoặc thông tin chi tiết
      let changed = false;
      let newNote = existing.note;
      let newLoggedBy = existing.loggedBy;
      let newClass = existing.className;

      if (!newNote && p.note) {
        newNote = p.note;
        changed = true;
      }
      if ((!newLoggedBy || newLoggedBy === existing.ingame) && p.loggedBy && p.loggedBy !== p.ingame) {
        newLoggedBy = p.loggedBy;
        changed = true;
      }
      if ((!newClass || newClass === 'Toái Mộng') && p.className) {
        newClass = p.className;
        changed = true;
      }

      if (changed) {
        masterMap.set(norm, {
          ...existing,
          note: newNote,
          loggedBy: newLoggedBy,
          className: newClass,
        });
      }
    }
  }

  const updatedPool = Array.from(masterMap.values());
  const addedCount = masterMap.size - initialCount;
  return { updatedPool, addedCount };
}

/**
 * Tự động đồng bộ các nhân sự từ các bảng Bang Chiến vào Kho Bang Chiến (guildWarPersonnelPool)
 * Bảo toàn 100% tên ingame, môn phái, loggedBy, ghi chú.
 */
export function syncGuildWarMembersToGuildWarPersonnelPool(
  currentGwPool: PersonnelMember[],
  guildWarBoards?: GuildWarBoard[]
): { updatedPool: PersonnelMember[]; addedCount: number } {
  const poolMap = new Map<string, PersonnelMember>();

  if (Array.isArray(currentGwPool)) {
    for (const p of currentGwPool) {
      if (p && p.ingame && typeof p.ingame === 'string') {
        const norm = normalizeName(p.ingame);
        if (norm) {
          poolMap.set(norm, { ...p });
        }
      }
    }
  }

  const initialCount = poolMap.size;
  const gwPersonnel = extractGuildWarMembersAsPersonnel(guildWarBoards);

  for (const p of gwPersonnel) {
    const norm = normalizeName(p.ingame);
    if (!norm) continue;

    const existing = poolMap.get(norm);
    if (!existing) {
      poolMap.set(norm, { ...p });
    } else {
      let changed = false;
      let newNote = existing.note;
      let newLoggedBy = existing.loggedBy;
      let newClass = existing.className;

      if (!newNote && p.note) {
        newNote = p.note;
        changed = true;
      }
      if (p.loggedBy && p.loggedBy !== existing.loggedBy) {
        if (!newLoggedBy || newLoggedBy === existing.ingame || p.loggedBy.length >= newLoggedBy.length || p.loggedBy.toLowerCase().includes(newLoggedBy.toLowerCase())) {
          newLoggedBy = p.loggedBy;
          changed = true;
        }
      }
      if ((!newClass || newClass === 'Toái Mộng') && p.className) {
        newClass = p.className;
        changed = true;
      }

      if (changed) {
        poolMap.set(norm, {
          ...existing,
          note: newNote,
          loggedBy: newLoggedBy,
          className: newClass,
        });
      }
    }
  }

  const updatedPool = Array.from(poolMap.values());
  const addedCount = updatedPool.length - initialCount;
  return { updatedPool, addedCount };
}

/**
 * Tải Tổng Kho Nhân Sự (Master Personnel Pool) với cơ chế tự động chuyển đổi an toàn (One-time Auto Migration)
 * và tự động đồng bộ đầy đủ nhân sự từ Bang Chiến.
 */
export function loadInitialMasterPersonnel(initialFallback: PersonnelMember[] = []): PersonnelMember[] {
  let loadedMaster: PersonnelMember[] = [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY_MASTER_PERSONNEL);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedMaster = parsed;
      }
    }
  } catch (e) {
    console.error('[Storage] Error loading master personnel from localStorage:', e);
  }

  // Nếu chưa có master pool trong localStorage, kiểm tra tiến hành gom từ các kho cũ và Bang Chiến
  if (loadedMaster.length === 0) {
    try {
      const isDone = localStorage.getItem(STORAGE_KEY_MASTER_MIGRATION_FLAG) === 'true';
      if (!isDone) {
        console.info('[Storage] Tiến hành tự động gộp tất cả kho nhân sự vào Tổng kho nhân sự...');
        const allOld: PersonnelMember[] = [];

        // 1. Kho Raid cũ
        try {
          const raw = localStorage.getItem(STORAGE_KEY_PERSONNEL);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) allOld.push(...parsed);
          }
        } catch {}

        // 2. Kho Raid Update cũ
        try {
          const raw = localStorage.getItem(STORAGE_KEY_PERSONNEL_UPDATE);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) allOld.push(...parsed);
          }
        } catch {}

        // 3. Kho Đi Bụi cũ
        try {
          const raw = localStorage.getItem(STORAGE_KEY_PERSONNEL_DI_BUI);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) allOld.push(...parsed);
          }
        } catch {}

        // 4. Các thành viên từ Bang Chiến
        try {
          const gwMembers = extractGuildWarMembersAsPersonnel();
          if (gwMembers.length > 0) allOld.push(...gwMembers);
        } catch {}

        // 5. Snapshots gần nhất
        try {
          const snaps = getAutoSnapshots();
          if (snaps && snaps.length > 0) {
            snaps.slice(0, 3).forEach((s) => {
              if (Array.isArray(s.personnelPool)) allOld.push(...s.personnelPool);
              if (Array.isArray(s.diBuiPersonnelPool)) allOld.push(...s.diBuiPersonnelPool);
              if (Array.isArray(s.guildWarPersonnelPool)) allOld.push(...s.guildWarPersonnelPool);
            });
          }
        } catch {}

        // Deduplicate by normalizeName
        const masterMap = new Map<string, PersonnelMember>();
        for (const p of allOld) {
          if (p && p.ingame && typeof p.ingame === 'string') {
            const norm = normalizeName(p.ingame);
            if (!norm) continue;
            const existing = masterMap.get(norm);
            if (!existing) {
              masterMap.set(norm, { ...p });
            } else {
              // Ưu tiên giữ thông tin đầy đủ nhất
              masterMap.set(norm, {
                ...existing,
                loggedBy: (existing.loggedBy && existing.loggedBy.trim()) || p.loggedBy || existing.ingame,
                note: existing.note || p.note,
                className: existing.className || p.className,
              });
            }
          }
        }

        const mergedMaster = Array.from(masterMap.values());
        if (mergedMaster.length > 0) {
          console.info(`[Storage] Đã gộp thành công ${mergedMaster.length} nhân sự vào Tổng kho nhân sự!`);
          safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(mergedMaster));
          saveToIndexedDB('masterPersonnelPool', mergedMaster);
          safeLocalStorageSet(STORAGE_KEY_MASTER_MIGRATION_FLAG, 'true');

          // Khởi tạo các kho con trống riêng biệt theo yêu cầu
          safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify([]));
          safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify([]));
          safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify([]));
          saveToIndexedDB('personnelPool', []);
          saveToIndexedDB('updatePersonnelPool', []);
          saveToIndexedDB('guildWarPersonnelPool', []);

          loadedMaster = mergedMaster;
        } else {
          safeLocalStorageSet(STORAGE_KEY_MASTER_MIGRATION_FLAG, 'true');
        }
      }
    } catch (err) {
      console.error('[Storage] Error during master personnel migration:', err);
    }
  }

  // Tự động kiểm tra & đồng bộ bổ sung từ Bang Chiến vào Tổng kho một lần duy nhất khi khởi tạo migration
  try {
    const isGwSyncDone = localStorage.getItem(STORAGE_KEY_GW_TO_MASTER_SYNC_FLAG) === 'true';
    if (!isGwSyncDone) {
      const { updatedPool, addedCount } = syncGuildWarMembersToMasterPool(loadedMaster);
      if (addedCount > 0) {
        console.info(`[Storage] Tự động đồng bộ bổ sung ${addedCount} nhân sự từ Bang Chiến vào Tổng kho lần đầu!`);
        loadedMaster = updatedPool;
        safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(loadedMaster));
        saveToIndexedDB('masterPersonnelPool', loadedMaster);
      }
      safeLocalStorageSet(STORAGE_KEY_GW_TO_MASTER_SYNC_FLAG, 'true');
    }
  } catch (err) {
    console.warn('[Storage] Error during guild war sync to master:', err);
  }

  if (loadedMaster.length > 0) {
    return loadedMaster;
  }

  // Thử khôi phục từ snapshot nếu có masterPersonnelPool
  const snapshots = getAutoSnapshots();
  const validSnap = snapshots.find(
    (s) => s.masterPersonnelPool && Array.isArray(s.masterPersonnelPool) && s.masterPersonnelPool.length > 0
  );
  if (validSnap && Array.isArray(validSnap.masterPersonnelPool)) {
    try {
      safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(validSnap.masterPersonnelPool));
    } catch {}
    return validSnap.masterPersonnelPool;
  }

  return initialFallback;
}

/**
 * Tải kho nhân sự con riêng biệt của Bang Chiến
 */
export function loadInitialGuildWarPersonnel(initialFallback: PersonnelMember[] = []): PersonnelMember[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GUILDWAR_PERSONNEL);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[Storage] Error loading guild war personnel from localStorage:', e);
  }
  return initialFallback;
}

/**
 * Phục hồi bất đồng bộ từ IndexedDB nếu LocalStorage bị xóa hoặc thiếu dữ liệu
 * Tuyệt đối không xóa bất kỳ dữ liệu nào đã lưu trong IndexedDB.
 */
export async function recoverAsyncFromIndexedDB(): Promise<{
  boards?: RaidBoard[];
  activeBoardId?: string;
  personnelPool?: PersonnelMember[];
  customColors?: CustomClassColors;
  guildWarBoards?: GuildWarBoard[];
  activeGuildWarBoardId?: string;
  snapshots?: AutoSnapshot[];
  updateBoards?: RaidBoard[];
  activeUpdateBoardId?: string;
  updatePersonnelPool?: PersonnelMember[];
  diBuiPersonnelPool?: PersonnelMember[];
} | null> {
  try {
    const [
      dbBoards,
      dbPersonnel,
      dbColors,
      dbGuildWar,
      dbSnapshots,
      dbActiveBoardId,
      dbActiveGwId,
      dbUpdateBoards,
      dbUpdatePersonnel,
      dbActiveUpdateBoardId,
      dbDiBuiPersonnel,
      dbMasterPersonnel,
      dbGwPersonnel,
    ] = await Promise.all([
      getFromIndexedDB<RaidBoard[]>('boards'),
      getFromIndexedDB<PersonnelMember[]>('personnelPool'),
      getFromIndexedDB<CustomClassColors>('customColors'),
      getFromIndexedDB<GuildWarBoard[]>('guildWarBoards'),
      getFromIndexedDB<AutoSnapshot[]>('snapshots'),
      getFromIndexedDB<string>('activeBoardId'),
      getFromIndexedDB<string>('activeGuildWarBoardId'),
      getFromIndexedDB<RaidBoard[]>('updateBoards'),
      getFromIndexedDB<PersonnelMember[]>('updatePersonnelPool'),
      getFromIndexedDB<string>('activeUpdateBoardId'),
      getFromIndexedDB<PersonnelMember[]>('diBuiPersonnelPool'),
      getFromIndexedDB<PersonnelMember[]>('masterPersonnelPool'),
      getFromIndexedDB<PersonnelMember[]>('guildWarPersonnelPool'),
    ]);

    const sanitizedBoards = Array.isArray(dbBoards)
      ? dbBoards.map((b, idx) => sanitizeRaidBoard(b, idx + 1))
      : [];
    const sanitizedGw = Array.isArray(dbGuildWar)
      ? dbGuildWar.map((b, idx) => sanitizeGuildWarBoard(b, idx + 1))
      : [];
    const sanitizedUpdateBoards = Array.isArray(dbUpdateBoards)
      ? dbUpdateBoards.map((b, idx) => sanitizeRaidBoard(b, idx + 1))
      : [];

    const hasBoards = sanitizedBoards.length > 0;
    const hasPersonnel = Array.isArray(dbPersonnel) && dbPersonnel.length > 0;
    const hasGuildWar = sanitizedGw.length > 0;
    const hasSnapshots = Array.isArray(dbSnapshots) && dbSnapshots.length > 0;
    const hasUpdateBoards = sanitizedUpdateBoards.length > 0;
    const hasUpdatePersonnel = Array.isArray(dbUpdatePersonnel) && dbUpdatePersonnel.length > 0;
    const hasDiBuiPersonnel = Array.isArray(dbDiBuiPersonnel) && dbDiBuiPersonnel.length > 0;
    const hasMasterPersonnel = Array.isArray(dbMasterPersonnel) && dbMasterPersonnel.length > 0;
    const hasGwPersonnel = Array.isArray(dbGwPersonnel) && dbGwPersonnel.length > 0;

    if (!hasBoards && !hasPersonnel && !hasGuildWar && !hasSnapshots && !hasUpdateBoards && !hasUpdatePersonnel && !hasDiBuiPersonnel && !hasMasterPersonnel && !hasGwPersonnel) {
      return null;
    }

    const result: {
      boards?: RaidBoard[];
      activeBoardId?: string;
      personnelPool?: PersonnelMember[];
      customColors?: CustomClassColors;
      guildWarBoards?: GuildWarBoard[];
      activeGuildWarBoardId?: string;
      snapshots?: AutoSnapshot[];
      updateBoards?: RaidBoard[];
      activeUpdateBoardId?: string;
      updatePersonnelPool?: PersonnelMember[];
      diBuiPersonnelPool?: PersonnelMember[];
      masterPersonnelPool?: PersonnelMember[];
      guildWarPersonnelPool?: PersonnelMember[];
    } = {};

    if (hasBoards) {
      result.boards = sanitizedBoards;
      result.activeBoardId =
        dbActiveBoardId && result.boards.some((b) => b.id === dbActiveBoardId)
          ? dbActiveBoardId
          : result.boards[0].id;
      safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(result.boards));
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD, result.activeBoardId);
    }
    if (hasPersonnel) {
      result.personnelPool = dbPersonnel;
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(result.personnelPool));
    }
    if (dbColors && Object.keys(dbColors).length > 0) {
      result.customColors = dbColors;
      safeLocalStorageSet(STORAGE_KEY_COLORS, JSON.stringify(result.customColors));
    }
    if (hasGuildWar) {
      result.guildWarBoards = sanitizedGw;
      result.activeGuildWarBoardId =
        dbActiveGwId && result.guildWarBoards.some((b) => b.id === dbActiveGwId)
          ? dbActiveGwId
          : result.guildWarBoards[0].id;
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(result.guildWarBoards));
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_GUILDWAR, result.activeGuildWarBoardId);
    }
    if (hasSnapshots) {
      result.snapshots = dbSnapshots;
      const localSnaps = getAutoSnapshots();
      if (localSnaps.length < dbSnapshots.length) {
        safeLocalStorageSet(STORAGE_KEY_SNAPSHOTS, JSON.stringify(dbSnapshots));
      }
    }
    if (hasUpdateBoards) {
      result.updateBoards = sanitizedUpdateBoards;
      result.activeUpdateBoardId =
        dbActiveUpdateBoardId && result.updateBoards.some((b) => b.id === dbActiveUpdateBoardId)
          ? dbActiveUpdateBoardId
          : result.updateBoards[0].id;
      safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(result.updateBoards));
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD_UPDATE, result.activeUpdateBoardId);
    }
    if (hasUpdatePersonnel) {
      result.updatePersonnelPool = dbUpdatePersonnel;
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(result.updatePersonnelPool));
    }
    if (hasDiBuiPersonnel) {
      result.diBuiPersonnelPool = dbDiBuiPersonnel;
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(result.diBuiPersonnelPool));
    }
    if (hasMasterPersonnel) {
      result.masterPersonnelPool = dbMasterPersonnel;
      safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(result.masterPersonnelPool));
    }
    if (hasGwPersonnel) {
      result.guildWarPersonnelPool = dbGwPersonnel;
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(result.guildWarPersonnelPool));
    }

    return result;
  } catch (err) {
    console.warn('[IndexedDB] Async recovery error:', err);
    return null;
  }
}

/**
 * Ghi đồng bộ ngay lập tức tất cả state xuống LocalStorage & IndexedDB
 * Gọi khi `beforeunload` hoặc `visibilitychange` để ngăn việc mất dữ liệu khi đóng tab hoặc tắt máy.
 */
export function flushAllStorageSync(params: {
  boards: RaidBoard[];
  activeBoardId: string;
  personnelPool: PersonnelMember[];
  customColors?: CustomClassColors;
  guildWarBoards?: GuildWarBoard[];
  activeGuildWarBoardId?: string;
  updateBoards?: RaidBoard[];
  activeUpdateBoardId?: string;
  updatePersonnelPool?: PersonnelMember[];
  diBuiPersonnelPool?: PersonnelMember[];
  masterPersonnelPool?: PersonnelMember[];
  guildWarPersonnelPool?: PersonnelMember[];
  appMode?: 'RAID' | 'RAID_UPDATE' | 'GUILD_WAR';
}): void {
  try {
    safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(params.boards));
    safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD, params.activeBoardId);
    safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(params.personnelPool));
    if (params.customColors) {
      safeLocalStorageSet(STORAGE_KEY_COLORS, JSON.stringify(params.customColors));
    }
    if (params.guildWarBoards) {
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(params.guildWarBoards));
    }
    if (params.activeGuildWarBoardId) {
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_GUILDWAR, params.activeGuildWarBoardId);
    }
    if (params.updateBoards) {
      safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(params.updateBoards));
    }
    if (params.activeUpdateBoardId) {
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD_UPDATE, params.activeUpdateBoardId);
    }
    if (params.updatePersonnelPool) {
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(params.updatePersonnelPool));
    }
    if (params.diBuiPersonnelPool) {
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(params.diBuiPersonnelPool));
    }
    if (params.masterPersonnelPool) {
      safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(params.masterPersonnelPool));
    }
    if (params.guildWarPersonnelPool) {
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(params.guildWarPersonnelPool));
    }
    if (params.appMode) {
      safeLocalStorageSet(STORAGE_KEY_APP_MODE, params.appMode);
    }

    // Tự động tạo snapshot nhanh
    saveAutoSnapshot(
      params.boards,
      params.personnelPool,
      params.customColors,
      params.guildWarBoards,
      params.diBuiPersonnelPool,
      params.masterPersonnelPool,
      params.guildWarPersonnelPool
    );

    // Lưu vào IndexedDB ngầm
    saveToIndexedDB('boards', params.boards);
    saveToIndexedDB('activeBoardId', params.activeBoardId);
    saveToIndexedDB('personnelPool', params.personnelPool);
    if (params.customColors) saveToIndexedDB('customColors', params.customColors);
    if (params.guildWarBoards) {
      saveToIndexedDB('guildWarBoards', params.guildWarBoards);
      if (params.activeGuildWarBoardId) {
        saveToIndexedDB('activeGuildWarBoardId', params.activeGuildWarBoardId);
      }
    }
    if (params.updateBoards) saveToIndexedDB('updateBoards', params.updateBoards);
    if (params.activeUpdateBoardId) saveToIndexedDB('activeUpdateBoardId', params.activeUpdateBoardId);
    if (params.updatePersonnelPool) saveToIndexedDB('updatePersonnelPool', params.updatePersonnelPool);
    if (params.diBuiPersonnelPool) saveToIndexedDB('diBuiPersonnelPool', params.diBuiPersonnelPool);
    if (params.masterPersonnelPool) saveToIndexedDB('masterPersonnelPool', params.masterPersonnelPool);
    if (params.guildWarPersonnelPool) saveToIndexedDB('guildWarPersonnelPool', params.guildWarPersonnelPool);
  } catch (err) {
    console.warn('[FlushSync] Error flushing storage:', err);
  }
}

/**
 * Xuất toàn bộ dữ liệu ra file JSON để người dùng sao lưu vật lý
 */
export function downloadBackupFile(
  boards: RaidBoard[],
  personnelPool: PersonnelMember[],
  customColors?: CustomClassColors,
  guildWarBoards?: GuildWarBoard[],
  diBuiPersonnelPool?: PersonnelMember[],
  masterPersonnelPool?: PersonnelMember[],
  guildWarPersonnelPool?: PersonnelMember[]
): void {
  const data = {
    version: 5,
    appName: 'Bảng Sắp Xếp Nhân Sự Raid & Bang Chiến NTH',
    exportedAt: new Date().toISOString(),
    boards,
    personnelPool,
    customColors,
    guildWarBoards: guildWarBoards || [],
    diBuiPersonnelPool: diBuiPersonnelPool || [],
    masterPersonnelPool: masterPersonnelPool || [],
    guildWarPersonnelPool: guildWarPersonnelPool || [],
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `SaoLuu_Raid_BangChien_NTH_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Nhập dữ liệu từ file JSON sao lưu
 */
export function parseBackupFile(
  jsonText: string
): {
  boards: RaidBoard[];
  personnelPool: PersonnelMember[];
  customColors?: CustomClassColors;
  guildWarBoards?: GuildWarBoard[];
  diBuiPersonnelPool?: PersonnelMember[];
  masterPersonnelPool?: PersonnelMember[];
  guildWarPersonnelPool?: PersonnelMember[];
} {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Định dạng file sao lưu không hợp lệ.');
  }

  const rawBoards = Array.isArray(parsed.boards) ? parsed.boards : [];
  const personnelPool = Array.isArray(parsed.personnelPool) ? parsed.personnelPool : [];
  const customColors = parsed.customColors || {};
  const rawGwBoards = Array.isArray(parsed.guildWarBoards) ? parsed.guildWarBoards : [];
  const diBuiPersonnelPool = Array.isArray(parsed.diBuiPersonnelPool) ? parsed.diBuiPersonnelPool : [];
  const masterPersonnelPool = Array.isArray(parsed.masterPersonnelPool) ? parsed.masterPersonnelPool : [];
  const guildWarPersonnelPool = Array.isArray(parsed.guildWarPersonnelPool) ? parsed.guildWarPersonnelPool : [];

  if (
    rawBoards.length === 0 &&
    personnelPool.length === 0 &&
    rawGwBoards.length === 0 &&
    diBuiPersonnelPool.length === 0 &&
    masterPersonnelPool.length === 0 &&
    guildWarPersonnelPool.length === 0
  ) {
    throw new Error('File sao lưu không chứa dữ liệu bảng hoặc kho nhân sự.');
  }

  const boards = rawBoards.map((b: any, idx: number) => sanitizeRaidBoard(b, idx + 1));
  const guildWarBoards = rawGwBoards.map((b: any, idx: number) => sanitizeGuildWarBoard(b, idx + 1));

  return {
    boards,
    personnelPool,
    customColors,
    guildWarBoards,
    diBuiPersonnelPool,
    masterPersonnelPool,
    guildWarPersonnelPool,
  };
}

/**
 * UTF-8 Base64 Encoder / Decoder an toàn cho tiếng Việt
 */
function utf8ToBase64(str: string): string {
  return window.btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
}

function base64ToUtf8(b64: string): string {
  return decodeURIComponent(
    Array.prototype.map
      .call(window.atob(b64), (c: string) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
}

/**
 * Mã hóa 1 bảng Raid thành link chia sẻ trực tiếp (URL Hash)
 * Cho phép thành viên mở link là thấy ngay bảng mà không cần chung máy tính hay đăng nhập database.
 */
export function generateShareLink(board: RaidBoard): string {
  try {
    const compactData = {
      type: 'raid',
      t: board.titlePrefix,
      s: board.scheduleTime,
      b: board.bossName,
      p: (board.parties || []).map((pt) => ({ id: pt.id, n: pt.name })),
      m: (board.members || []).map((m) => ({
        s: m.stt,
        i: m.ingame,
        c: m.className,
        l: m.loggedBy,
        p: m.party,
        k: m.checked ? 1 : 0,
      })),
    };
    const encoded = utf8ToBase64(JSON.stringify(compactData));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#share=${encoded}`;
  } catch (err) {
    console.error('Error generating share link:', err);
    return window.location.href;
  }
}

/**
 * Giải mã bảng Raid từ hash chia sẻ trong URL
 */
export function parseShareHash(hash: string): RaidBoard | null {
  try {
    if (!hash || !hash.includes('#share=')) return null;
    const base64Data = hash.split('#share=')[1];
    if (!base64Data) return null;
    const jsonStr = base64ToUtf8(base64Data);
    const data = JSON.parse(jsonStr);

    if (data.type && data.type !== 'raid') return null;

    const timestamp = Date.now();
    const members: RaidMember[] = (data.m || []).map((item: any, idx: number) => ({
      id: `m_shared_${timestamp}_${idx + 1}`,
      stt: item.s || idx + 1,
      ingame: item.i || '',
      className: item.c || 'Toái Mộng',
      loggedBy: item.l || '',
      party: item.p || (idx < 6 ? 1 : 2),
      checked: item.k === 1,
    }));

    const parties = (data.p || []).map((pt: any) => ({
      id: pt.id,
      name: pt.n || `PT ${pt.id}`,
    }));

    return sanitizeRaidBoard({
      id: `board_shared_${timestamp}`,
      titlePrefix: data.t || 'Bảng Được Chia Sẻ',
      scheduleTime: data.s || 'MON 20:30',
      bossName: data.b || 'NIÊN DU',
      parties: parties.length > 0 ? parties : [{ id: 1, name: 'PT 1' }, { id: 2, name: 'PT 2' }],
      members: members.length > 0 ? members : Array.from({ length: 12 }, (_, i) => ({
        id: `m_${timestamp}_${i + 1}`,
        stt: i + 1,
        ingame: '',
        className: 'Toái Mộng',
        loggedBy: '',
        party: i < 6 ? 1 : 2,
      })),
      createdAt: timestamp,
    });
  } catch (err) {
    console.error('Error parsing shared hash:', err);
    return null;
  }
}

/**
 * Mã hóa 1 bảng Bang Chiến thành link chia sẻ trực tiếp (URL Hash)
 */
export function generateGuildWarShareLink(board: GuildWarBoard): string {
  try {
    const compactData = {
      type: 'gw',
      t: board.title,
      s: board.scheduleTime,
      tg: board.targetName,
      min: board.minAttendanceRequired,
      pn: board.partyNotes || {},
      ses: (board.sessions || []).map((s) => ({ id: s.id, l: s.label })),
      m: (board.members || []).map((m) => ({
        s: m.stt,
        i: m.ingame,
        c: m.className,
        r: m.guildRole,
        p: m.participation,
        tm: m.team,
        pt: m.party,
        sl: m.slot,
        at: m.attendance || {},
        n: m.note || '',
        l: m.loggedBy || m.discord || m.ingame,
      })),
    };
    const encoded = utf8ToBase64(JSON.stringify(compactData));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#share_gw=${encoded}`;
  } catch (err) {
    console.error('Error generating guild war share link:', err);
    return window.location.href;
  }
}

/**
 * Giải mã bảng Bang Chiến từ hash chia sẻ trong URL
 */
export function parseGuildWarShareHash(hash: string): GuildWarBoard | null {
  try {
    if (!hash || !hash.includes('#share_gw=')) return null;
    const base64Data = hash.split('#share_gw=')[1];
    if (!base64Data) return null;
    const jsonStr = base64ToUtf8(base64Data);
    const data = JSON.parse(jsonStr);

    if (data.type && data.type !== 'gw') return null;

    const timestamp = Date.now();
    const members: GuildMember[] = (data.m || []).map((item: any, idx: number) => ({
      id: `gw_m_shared_${timestamp}_${idx + 1}`,
      stt: item.s || idx + 1,
      ingame: item.i || '',
      className: item.c || 'Cửu Linh',
      guildRole: item.r || 'Thành Viên',
      participation: item.p || 'Cả hai',
      loggedBy: item.l || item.i || '',
      discord: item.l || '',
      team: item.tm || 'Chưa xếp',
      party: item.pt,
      slot: item.sl,
      attendance: item.at || {},
      note: item.n || '',
    }));

    const sessions: GuildWarSession[] = (data.ses || []).map((s: any) => ({
      id: s.id,
      label: s.l || s.id,
    }));

    return sanitizeGuildWarBoard({
      id: `gw_board_shared_${timestamp}`,
      title: data.t || 'Bang Chiến Được Chia Sẻ',
      scheduleTime: data.s || 'T7 20:00 & CN 20:00',
      targetName: data.tg || 'Công Thành / Đẩy Trụ',
      sessions: sessions.length > 0 ? sessions : DEFAULT_GUILD_SESSIONS,
      members,
      minAttendanceRequired: data.min || 4,
      reportDate: new Date().toLocaleDateString('vi-VN'),
      createdAt: timestamp,
      partyNotes: data.pn || {},
    });
  } catch (err) {
    console.error('Error parsing guild war shared hash:', err);
    return null;
  }
}
