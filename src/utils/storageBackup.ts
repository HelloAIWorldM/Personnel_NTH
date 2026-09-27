/**
 * Storage & Data Resilience Utility
 * Multi-layer persistence (LocalStorage + IndexedDB + Auto Snapshots)
 * Ngăn chặn tuyệt đối tình trạng mất dữ liệu khi tắt máy, load lại trang hoặc chuyển tab.
 */

import { CustomClassColors, PersonnelMember, RaidBoard, RaidMember } from '../types';
import { createEmptyBoard } from '../constants/classes';

export const STORAGE_KEY_BOARDS = 'raid_roster_boards_v2';
export const STORAGE_KEY_ACTIVE_BOARD = 'raid_roster_active_board_id_v2';
export const STORAGE_KEY_PERSONNEL = 'raid_roster_personnel_pool_v2';
export const STORAGE_KEY_COLORS = 'raid_roster_custom_colors_v1';
export const STORAGE_KEY_THEME = 'raid_roster_theme_mode_v1';
export const STORAGE_KEY_AUTO_SNAPSHOTS = 'raid_roster_auto_snapshots_v1';

// Legacy keys for automatic migration
const LEGACY_STORAGE_KEY_MEMBERS = 'raid_roster_members_v1';
const LEGACY_STORAGE_KEY_CONFIG = 'raid_roster_config_v1';
const LEGACY_STORAGE_KEY_PARTIES = 'raid_roster_parties_v1';

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  label: string;
  boardCount: number;
  totalMembersWithData: number;
  personnelCount: number;
  boards: RaidBoard[];
  personnelPool: PersonnelMember[];
  customColors?: CustomClassColors;
}

const DB_NAME = 'RaidPersonnelDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

// Initialize IndexedDB connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Write to IndexedDB in background
export async function saveToIndexedDB(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
  } catch (err) {
    // Non-critical fallback
    console.warn('[IndexedDB] Save warning:', err);
  }
}

// Read from IndexedDB
export async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Kiểm tra xem bảng có dữ liệu thực tế hay không (đếm số thành viên có tên ingame)
 */
export function countMembersWithData(boards: RaidBoard[]): number {
  let count = 0;
  for (const b of boards) {
    if (b && Array.isArray(b.members)) {
      for (const m of b.members) {
        if (m && m.ingame && m.ingame.trim() !== '') {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Lấy danh sách các bản lưu tự động (Auto Snapshots)
 */
export function getAutoSnapshots(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTO_SNAPSHOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Lưu một bản snapshot tự động vào bộ nhớ dự phòng
 */
let lastSnapshotTime = 0;
export function maybeSaveAutoSnapshot(
  boards: RaidBoard[],
  personnelPool: PersonnelMember[],
  customColors?: CustomClassColors,
  force: boolean = false
): void {
  const now = Date.now();
  // Chỉ tự động tạo snapshot nếu cách lần trước ít nhất 60s hoặc khi có yêu cầu force
  if (!force && now - lastSnapshotTime < 60000) {
    return;
  }

  const memberDataCount = countMembersWithData(boards);
  // Không snapshot bảng trống hoàn toàn nếu chưa có gì
  if (memberDataCount === 0 && personnelPool.length === 0 && !force) {
    return;
  }

  try {
    const snapshots = getAutoSnapshots();
    const newSnapshot: BackupSnapshot = {
      id: `snap_${now}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      label: `Bản lưu tự động (${new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`,
      boardCount: boards.length,
      totalMembersWithData: memberDataCount,
      personnelCount: personnelPool.length,
      boards,
      personnelPool,
      customColors,
    };

    // Giữ tối đa 10 bản sao lưu gần nhất
    const updated = [newSnapshot, ...snapshots.slice(0, 9)];
    localStorage.setItem(STORAGE_KEY_AUTO_SNAPSHOTS, JSON.stringify(updated));
    saveToIndexedDB(STORAGE_KEY_AUTO_SNAPSHOTS, updated);
    lastSnapshotTime = now;
  } catch (err) {
    console.warn('[AutoSnapshot] Warning:', err);
  }
}

/**
 * Tải danh sách boards với cơ chế phục hồi nhiều lớp:
 * 1. Đọc localStorage boards
 * 2. Nếu không có hoặc rỗng, kiểm tra auto snapshot
 * 3. Nếu vẫn không có, kiểm tra legacy storage
 * 4. Fallback cuối cùng là bảng trống mặc định
 */
export function loadInitialBoards(): { boards: RaidBoard[]; activeBoardId: string } {
  let loadedBoards: RaidBoard[] | null = null;

  try {
    // 1. Thử đọc từ localStorage
    const saved = localStorage.getItem(STORAGE_KEY_BOARDS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedBoards = parsed;
      }
    }
  } catch (e) {
    console.error('[Storage] Error reading saved boards:', e);
  }

  // 2. Nếu localStorage rỗng hoặc lỗi, thử khôi phục từ bản Auto Snapshot gần nhất có dữ liệu
  if (!loadedBoards || loadedBoards.length === 0 || countMembersWithData(loadedBoards) === 0) {
    const snapshots = getAutoSnapshots();
    const validSnap = snapshots.find((s) => s.boards && s.boards.length > 0 && s.totalMembersWithData > 0);
    if (validSnap) {
      console.info('[Storage] Tự động phục hồi bảng Raid từ bản sao lưu gần nhất:', validSnap.label);
      loadedBoards = validSnap.boards;
      // Khôi phục lại vào localStorage
      try {
        localStorage.setItem(STORAGE_KEY_BOARDS, JSON.stringify(loadedBoards));
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
          {
            id: 'board_1',
            titlePrefix: parsedConfig.titlePrefix || 'RAID 1',
            scheduleTime: parsedConfig.scheduleTime || 'MON 20:30',
            bossName: parsedConfig.bossName || 'NIÊN DU',
            members: parsedMembers,
            parties: parsedParties,
            createdAt: Date.now(),
          },
        ];
      }
    } catch {}
  }

  // 4. Fallback mặc định
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
 * Tải kho nhân sự với cơ chế phục hồi
 */
export function loadInitialPersonnel(): PersonnelMember[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PERSONNEL);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[Storage] Error loading personnel:', e);
  }

  // Thử khôi phục từ snapshot
  const snapshots = getAutoSnapshots();
  const validSnap = snapshots.find((s) => s.personnelPool && s.personnelPool.length > 0);
  if (validSnap) {
    return validSnap.personnelPool;
  }

  return [];
}

/**
 * Xuất toàn bộ dữ liệu ra file JSON để người dùng sao lưu vật lý
 */
export function downloadBackupFile(
  boards: RaidBoard[],
  personnelPool: PersonnelMember[],
  customColors?: CustomClassColors
): void {
  const data = {
    version: 2,
    appName: 'Bảng Sắp Xếp Nhân Sự Raid',
    exportedAt: new Date().toISOString(),
    boards,
    personnelPool,
    customColors,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `SaoLuu_Raid_NTH_${dateStr}.json`;
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
} {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Định dạng file sao lưu không hợp lệ.');
  }

  const boards = Array.isArray(parsed.boards) ? parsed.boards : [];
  const personnelPool = Array.isArray(parsed.personnelPool) ? parsed.personnelPool : [];
  const customColors = parsed.customColors || {};

  if (boards.length === 0 && personnelPool.length === 0) {
    throw new Error('File sao lưu không chứa dữ liệu bảng hoặc kho nhân sự.');
  }

  return { boards, personnelPool, customColors };
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
 * Mã hóa 1 bảng Raid thành link chia sẻ
 */
export function generateShareLink(board: RaidBoard): string {
  try {
    const compactData = {
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

    const timestamp = Date.now();
    const members: RaidMember[] = (data.m || []).map((item: any, idx: number) => ({
      id: `m_shared_${timestamp}_${idx + 1}`,
      stt: item.s || idx + 1,
      ingame: item.i || '',
      className: item.c || 'Toái Mộng',
      loggedBy: item.l || '',
      party: item.p || (idx < 6 ? 1 : 2),
    }));

    const parties = (data.p || []).map((pt: any) => ({
      id: pt.id,
      name: pt.n || `PT ${pt.id}`,
    }));

    return {
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
    };
  } catch (err) {
    console.error('Error parsing shared hash:', err);
    return null;
  }
}
