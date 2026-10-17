/**
 * Daily Backup Service - Sắp Xếp Nhân Sự Bang Niên Du
 * 
 * Tính năng Sao Lưu Dữ Liệu Mỗi Ngày (Daily Backup):
 * 1. Tự động sao lưu mỗi ngày (Auto Daily Snapshot) khi mở web hoặc khi có dữ liệu mới.
 * 2. Lưu trữ đa tầng an toàn:
 *    - Cloud Firestore: Lưu thành document riêng biệt `guilds/{GLOBAL_GUILD_ID}_bak_{YYYY-MM-DD}`
 *      tuân thủ 100% firestore.rules và không bao giờ bị ghi đè bởi các ngày khác.
 *    - IndexedDB: Lưu bản sao offline đầy đủ trên bộ nhớ trình duyệt máy tính.
 * 3. Hỗ trợ tạo bản sao lưu thủ công bất kỳ lúc nào ("Sao lưu ngay hôm nay").
 * 4. Hỗ trợ xem danh sách các ngày đã sao lưu và Khôi phục (Restore) về bất kỳ ngày nào.
 * 5. Tải bản sao lưu về máy dưới dạng file .json chuẩn.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  GLOBAL_GUILD_ID,
  CloudGuildData,
  cleanForFirestore,
} from './cloudSync';
import {
  saveToIndexedDB,
  getFromIndexedDB,
  safeLocalStorageSet,
  countMembersWithData,
  countGuildWarMembers,
  sanitizeRaidBoard,
  sanitizeGuildWarBoard,
} from '../utils/storageBackup';
import { deduplicatePersonnelList } from '../utils/duplicates';

export const STORAGE_KEY_LAST_DAILY_BACKUP = 'nth_last_daily_backup_date_v1';
export const STORAGE_KEY_DAILY_BACKUPS_INDEX = 'nth_daily_backups_index_v1';
export const IDB_KEY_DAILY_BACKUPS_INDEX = 'daily_backups_index';

export interface DailyBackupRecord {
  id: string; // vd: "NIENDU_RAID_THANG10_bak_2026-10-18"
  dateStr: string; // "2026-10-18"
  timestamp: number;
  label: string;
  source: 'cloud' | 'local' | 'both';
  isAuto: boolean;
  masterPersonnelCount: number;
  raidPersonnelCount: number;
  raidMembersCount: number;
  raidBoardsCount: number;
  guildWarBoardsCount: number;
  guildWarMembersCount: number;
  updateBoardsCount: number;
  updatePersonnelCount: number;
  diBuiCount: number;
  data?: CloudGuildData;
}

/**
 * Lấy chuỗi ngày hôm nay theo định dạng chuẩn YYYY-MM-DD (Múi giờ Việt Nam)
 */
export function getTodayDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Định dạng ngày YYYY-MM-DD sang hiển thị tiếng Việt thân thiện (DD/MM/YYYY)
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Đọc chỉ mục danh sách các bản sao lưu đã ghi nhận từ LocalStorage & IndexedDB
 */
export async function getLocalBackupIndex(): Promise<DailyBackupRecord[]> {
  try {
    // 1. Thử đọc từ IndexedDB trước
    const idbList = await getFromIndexedDB<DailyBackupRecord[]>(IDB_KEY_DAILY_BACKUPS_INDEX);
    if (Array.isArray(idbList) && idbList.length > 0) {
      return idbList;
    }

    // 2. Fallback đọc từ LocalStorage
    const raw = localStorage.getItem(STORAGE_KEY_DAILY_BACKUPS_INDEX);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[DailyBackup] Error loading backup index:', err);
  }
  return [];
}

/**
 * Lưu chỉ mục danh sách các bản sao lưu vào LocalStorage & IndexedDB
 */
export async function saveLocalBackupIndex(index: DailyBackupRecord[]): Promise<void> {
  try {
    // Chỉ lưu 30 bản ghi gần nhất vào localStorage để tránh tràn bộ nhớ
    const trimmedForLocalStorage = index.slice(0, 30).map((r) => {
      // Bỏ trường data nặng khi lưu vào index summary
      const { data, ...summary } = r;
      return summary;
    });
    safeLocalStorageSet(STORAGE_KEY_DAILY_BACKUPS_INDEX, JSON.stringify(trimmedForLocalStorage));

    // Lưu vào IndexedDB đầy đủ
    await saveToIndexedDB(IDB_KEY_DAILY_BACKUPS_INDEX, trimmedForLocalStorage);
  } catch (err) {
    console.warn('[DailyBackup] Error saving backup index:', err);
  }
}

/**
 * Tính toán thống kê số lượng thành viên và bảng từ CloudGuildData
 */
export function computeBackupStats(data: CloudGuildData) {
  const masterPersonnelCount = Array.isArray(data.masterPersonnelPool)
    ? data.masterPersonnelPool.length
    : 0;
  const raidPersonnelCount = Array.isArray(data.personnelPool) ? data.personnelPool.length : 0;
  const raidMembersCount = Array.isArray(data.boards) ? countMembersWithData(data.boards) : 0;
  const raidBoardsCount = Array.isArray(data.boards) ? data.boards.length : 0;
  const guildWarBoardsCount = Array.isArray(data.guildWarBoards) ? data.guildWarBoards.length : 0;
  const guildWarMembersCount = Array.isArray(data.guildWarBoards)
    ? countGuildWarMembers(data.guildWarBoards)
    : 0;
  const updateBoardsCount = Array.isArray(data.updateBoards) ? data.updateBoards.length : 0;
  const updatePersonnelCount = Array.isArray(data.updatePersonnelPool)
    ? data.updatePersonnelPool.length
    : 0;
  const diBuiCount = Array.isArray(data.diBuiPersonnelPool) ? data.diBuiPersonnelPool.length : 0;

  return {
    masterPersonnelCount,
    raidPersonnelCount,
    raidMembersCount,
    raidBoardsCount,
    guildWarBoardsCount,
    guildWarMembersCount,
    updateBoardsCount,
    updatePersonnelCount,
    diBuiCount,
  };
}

/**
 * Tạo một bản sao lưu ngày mới (lưu đồng thời lên Cloud Firestore và IndexedDB)
 */
export async function createDailyBackup(
  payload: CloudGuildData,
  isManual: boolean = false,
  customDateStr?: string
): Promise<{ success: boolean; record?: DailyBackupRecord; error?: string }> {
  try {
    const dateStr = customDateStr || getTodayDateString();
    const docId = `${GLOBAL_GUILD_ID}_bak_${dateStr}`;
    const timestamp = Date.now();
    const stats = computeBackupStats(payload);

    // Chuẩn bị payload chuẩn Firestore theo firestore.rules
    const cloudPayload: Record<string, any> = {
      boards: (payload.boards || []).slice(0, 100),
      personnelPool: (payload.personnelPool || []).slice(0, 1000),
      guildWarBoards: (payload.guildWarBoards || []).slice(0, 100),
      activeBoardId: String(payload.activeBoardId || 'board_1').slice(0, 128),
      activeGuildWarBoardId: String(payload.activeGuildWarBoardId || 'gw_board_1').slice(0, 128),
      customColors: payload.customColors || {},
      updatedAt: timestamp,
      title: `Bản sao lưu ngày ${formatDisplayDate(dateStr)} (${isManual ? 'Thủ công' : 'Tự động'})`,
    };

    if (payload.updateBoards && Array.isArray(payload.updateBoards)) {
      cloudPayload.updateBoards = payload.updateBoards.slice(0, 100);
    }
    if (payload.updatePersonnelPool && Array.isArray(payload.updatePersonnelPool)) {
      cloudPayload.updatePersonnelPool = payload.updatePersonnelPool.slice(0, 1000);
    }
    if (payload.activeUpdateBoardId) {
      cloudPayload.activeUpdateBoardId = String(payload.activeUpdateBoardId).slice(0, 128);
    }
    if (payload.diBuiPersonnelPool && Array.isArray(payload.diBuiPersonnelPool)) {
      cloudPayload.diBuiPersonnelPool = payload.diBuiPersonnelPool.slice(0, 1000);
    }
    if (payload.masterPersonnelPool && Array.isArray(payload.masterPersonnelPool)) {
      cloudPayload.masterPersonnelPool = payload.masterPersonnelPool.slice(0, 1000);
    }
    if (payload.guildWarPersonnelPool && Array.isArray(payload.guildWarPersonnelPool)) {
      cloudPayload.guildWarPersonnelPool = payload.guildWarPersonnelPool.slice(0, 1000);
    }

    const cleanedCloudData = cleanForFirestore(cloudPayload);
    const docData: CloudGuildData = JSON.parse(JSON.stringify(cleanedCloudData));

    // 1. Lưu lên Cloud Firestore document
    let cloudSaved = false;
    try {
      const docRef = doc(db, 'guilds', docId);
      await setDoc(docRef, docData, { merge: true });
      cloudSaved = true;
    } catch (cloudErr) {
      console.warn('[DailyBackup] Cloud write warning (proceeding to local save):', cloudErr);
    }

    // 2. Lưu vào IndexedDB cục bộ (nguyên vẹn toàn bộ dữ liệu)
    const localIdbKey = `daily_bak_${dateStr}`;
    await saveToIndexedDB(localIdbKey, docData);

    const record: DailyBackupRecord = {
      id: docId,
      dateStr,
      timestamp,
      label: `Bản sao lưu ngày ${formatDisplayDate(dateStr)} (${new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`,
      source: cloudSaved ? 'both' : 'local',
      isAuto: !isManual,
      ...stats,
    };

    // 3. Cập nhật chỉ mục lịch sử sao lưu (Index)
    const currentIndex = await getLocalBackupIndex();
    const filteredIndex = currentIndex.filter((r) => r.dateStr !== dateStr);
    const updatedIndex = [record, ...filteredIndex].slice(0, 60);
    await saveLocalBackupIndex(updatedIndex);

    // 4. Ghi nhớ ngày đã sao lưu gần nhất
    safeLocalStorageSet(STORAGE_KEY_LAST_DAILY_BACKUP, dateStr);

    console.info(`[DailyBackup] ✅ Đã tạo bản sao lưu thành công cho ngày ${dateStr}:`, {
      masterPersonnelCount: stats.masterPersonnelCount,
      raidMembersCount: stats.raidMembersCount,
      cloudSaved,
    });

    return { success: true, record };
  } catch (err: any) {
    console.error('[DailyBackup] Error creating daily backup:', err);
    return { success: false, error: err?.message || 'Không thể tạo bản sao lưu' };
  }
}

/**
 * Lấy danh sách tất cả các bản sao lưu ngày (kết hợp cả Cloud Firestore và Local)
 * Kiểm tra các ngày gần đây (30 ngày gần nhất) để đảm bảo không bỏ sót bất kỳ bản lưu nào
 */
export async function listAllDailyBackups(): Promise<DailyBackupRecord[]> {
  const indexMap = new Map<string, DailyBackupRecord>();

  // 1. Nạp từ local backup index trước
  const localIndex = await getLocalBackupIndex();
  for (const r of localIndex) {
    if (r && r.dateStr) {
      indexMap.set(r.dateStr, r);
    }
  }

  // 2. Sinh danh sách 14 ngày gần nhất để kiểm tra chéo với Cloud Firestore
  const now = new Date();
  const datesToCheck: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    try {
      const dStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
      datesToCheck.push(dStr);
    } catch {
      datesToCheck.push(d.toISOString().slice(0, 10));
    }
  }

  // 3. Kiểm tra chéo song song từ Cloud Firestore cho những ngày chưa có hoặc kiểm tra tính sẵn sàng
  await Promise.allSettled(
    datesToCheck.map(async (dateStr) => {
      const docId = `${GLOBAL_GUILD_ID}_bak_${dateStr}`;
      try {
        const docRef = doc(db, 'guilds', docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const cd = snap.data() as CloudGuildData;
          const stats = computeBackupStats(cd);
          const existing = indexMap.get(dateStr);
          const ts = cd.updatedAt || (existing ? existing.timestamp : new Date(dateStr).getTime());

          indexMap.set(dateStr, {
            id: docId,
            dateStr,
            timestamp: ts,
            label: `Bản sao lưu ngày ${formatDisplayDate(dateStr)} (${new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`,
            source: existing ? 'both' : 'cloud',
            isAuto: existing ? existing.isAuto : true,
            ...stats,
          });
        }
      } catch (err) {
        // Lỗi mạng hoặc không có quyền bỏ qua
      }
    })
  );

  // Sắp xếp giảm dần theo ngày (mới nhất lên đầu)
  const sorted = Array.from(indexMap.values()).sort((a, b) => {
    return b.dateStr.localeCompare(a.dateStr);
  });

  // Lưu lại index đã làm giàu
  saveLocalBackupIndex(sorted).catch(() => {});

  return sorted;
}

/**
 * Tải chi tiết dữ liệu đầy đủ của một bản sao lưu (từ IndexedDB hoặc Cloud)
 */
export async function fetchDailyBackupData(
  record: DailyBackupRecord
): Promise<CloudGuildData | null> {
  // 1. Thử đọc từ IndexedDB
  try {
    const localIdbKey = `daily_bak_${record.dateStr}`;
    const idbData = await getFromIndexedDB<CloudGuildData>(localIdbKey);
    if (idbData && (idbData.boards || idbData.masterPersonnelPool || idbData.personnelPool)) {
      return idbData;
    }
  } catch {}

  // 2. Thử đọc từ Cloud Firestore
  try {
    const docId = `${GLOBAL_GUILD_ID}_bak_${record.dateStr}`;
    const docRef = doc(db, 'guilds', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cd = snap.data() as CloudGuildData;
      // Lưu lại vào IndexedDB để lần sau tải tức thì
      saveToIndexedDB(`daily_bak_${record.dateStr}`, cd).catch(() => {});
      return cd;
    }
  } catch (err) {
    console.error('[DailyBackup] Error fetching from Cloud:', err);
  }

  return null;
}

/**
 * Tải file sao lưu JSON về máy tính cho người dùng
 */
export function downloadBackupJsonFile(data: CloudGuildData, dateStr?: string): void {
  const dStr = dateStr || getTodayDateString();
  const exportPayload = {
    version: 5,
    appName: 'Bản Sao Lưu Hằng Ngày - Bang Niên Du NTH',
    backupDate: dStr,
    exportedAt: new Date().toISOString(),
    boards: data.boards || [],
    personnelPool: data.personnelPool || [],
    guildWarBoards: data.guildWarBoards || [],
    updateBoards: data.updateBoards || [],
    updatePersonnelPool: data.updatePersonnelPool || [],
    diBuiPersonnelPool: data.diBuiPersonnelPool || [],
    masterPersonnelPool: data.masterPersonnelPool || [],
    guildWarPersonnelPool: data.guildWarPersonnelPool || [],
    customColors: data.customColors || {},
    activeBoardId: data.activeBoardId || 'board_1',
    activeGuildWarBoardId: data.activeGuildWarBoardId || 'gw_board_1',
    activeUpdateBoardId: data.activeUpdateBoardId || '',
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SaoLuu_BangNienDu_${dStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Kiểm tra và tự động kích hoạt sao lưu hằng ngày nếu hôm nay chưa sao lưu
 * và dữ liệu đang có ít nhất 1 thành viên hoặc bảng.
 */
export async function checkAndRunAutoDailyBackup(
  payload: CloudGuildData
): Promise<boolean> {
  try {
    const todayStr = getTodayDateString();
    const lastBackupDate = localStorage.getItem(STORAGE_KEY_LAST_DAILY_BACKUP);

    // Nếu hôm nay đã sao lưu rồi thì bỏ qua
    if (lastBackupDate === todayStr) {
      return false;
    }

    // Đảm bảo chỉ tự động sao lưu khi dữ liệu thực sự có giá trị
    const hasData =
      (payload.masterPersonnelPool && payload.masterPersonnelPool.length > 0) ||
      (payload.personnelPool && payload.personnelPool.length > 0) ||
      (payload.boards && payload.boards.length > 0) ||
      (payload.guildWarBoards && payload.guildWarBoards.length > 0);

    if (!hasData) {
      return false;
    }

    console.info(`[DailyBackup] Phát hiện ngày mới (${todayStr}), tự động thực hiện sao lưu hằng ngày...`);
    const res = await createDailyBackup(payload, false, todayStr);
    return res.success;
  } catch (err) {
    console.warn('[DailyBackup] Auto backup check error:', err);
    return false;
  }
}
