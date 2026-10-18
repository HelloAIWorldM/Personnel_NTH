import * as XLSX from 'xlsx';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
  loginAt: number;
  authMethod: 'oauth2' | 'manual';
  ingameLinked?: string;
}

export interface DiscordLoginLog {
  id: string;
  stt?: number;
  timestamp: string; // e.g. "18/10/2026 10:45:22"
  isoTime: string; // ISO 8601
  discordId: string;
  username: string;
  displayName: string;
  email?: string;
  action: 'LOGIN' | 'LOGOUT' | 'RESUME';
  status: 'SUCCESS' | 'FAILED';
  deviceInfo: string;
  ipOrNetwork?: string;
  authMethod: 'oauth2' | 'manual';
  note?: string;
  createdAt: number;
}

const STORAGE_KEY_USER = 'guild_nien_du_discord_user_v1';
const STORAGE_KEY_LOGS = 'guild_nien_du_discord_logs_v1';
const FIRESTORE_COLLECTION = 'discord_logs';

/**
 * Lấy chuỗi thông tin thiết bị / trình duyệt thân thiện
 */
export const getDeviceInfo = (): string => {
  if (typeof window === 'undefined' || !window.navigator) return 'Web Browser';
  const ua = window.navigator.userAgent;

  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac/i.test(ua)) os = 'MacOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return `${browser} trên ${os}`;
};

/**
 * Định dạng thời gian Việt Nam (DD/MM/YYYY HH:mm:ss)
 */
export const formatVietnamTime = (date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${d}/${m}/${y} ${h}:${min}:${s}`;
};

/**
 * Lưu phiên đăng nhập người dùng Discord
 */
export const saveDiscordUserSession = (user: DiscordUser): void => {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } catch (err) {
    console.warn('Không thể lưu session Discord vào localStorage:', err);
  }
};

/**
 * Lấy phiên đăng nhập Discord hiện tại
 */
export const getDiscordUserSession = (): DiscordUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as DiscordUser;
  } catch {
    return null;
  }
};

/**
 * Xóa phiên đăng nhập Discord
 */
export const clearDiscordUserSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_USER);
  } catch {}
};

/**
 * Lấy danh sách logs từ LocalStorage
 */
export const getLocalDiscordLogs = (): DiscordLoginLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    return JSON.parse(raw) as DiscordLoginLog[];
  } catch {
    return [];
  }
};

/**
 * Lưu danh sách logs vào LocalStorage
 */
const saveLocalDiscordLogs = (logs: DiscordLoginLog[]): void => {
  try {
    // Giữ tối đa 500 logs trong local để tiết kiệm bộ nhớ
    const trimmed = logs.slice(0, 500);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Lỗi lưu logs vào local:', err);
  }
};

/**
 * Ghi nhận một sự kiện đăng nhập vào Cloud Firestore và LocalStorage
 */
export const recordDiscordLoginLog = async (
  user: DiscordUser,
  action: 'LOGIN' | 'LOGOUT' | 'RESUME' = 'LOGIN',
  status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
  note?: string
): Promise<DiscordLoginLog> => {
  const now = new Date();
  const epoch = now.getTime();
  const logId = `dlog_${epoch}_${Math.random().toString(36).substring(2, 7)}`;

  const logEntry: DiscordLoginLog = {
    id: logId,
    timestamp: formatVietnamTime(now),
    isoTime: now.toISOString(),
    discordId: user.id || 'N/A',
    username: user.username || 'unknown',
    displayName: user.displayName || user.username || 'Khách Discord',
    email: user.email || undefined,
    action,
    status,
    deviceInfo: getDeviceInfo(),
    ipOrNetwork: 'Web Trực Tuyến (Online)',
    authMethod: user.authMethod || 'manual',
    note: note || (user.ingameLinked ? `Ingame: ${user.ingameLinked}` : 'Đăng nhập vào hệ thống'),
    createdAt: epoch,
  };

  // 1. Lưu vào LocalStorage
  const existingLocal = getLocalDiscordLogs();
  const updatedLocal = [logEntry, ...existingLocal.filter((l) => l.id !== logId)];
  saveLocalDiscordLogs(updatedLocal);

  // 2. Đồng bộ lên Cloud Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, logId);
    // Chuẩn bị payload hợp lệ theo firestore.rules
    const firestorePayload: Record<string, any> = {
      timestamp: logEntry.timestamp,
      isoTime: logEntry.isoTime,
      discordId: logEntry.discordId,
      username: logEntry.username,
      displayName: logEntry.displayName,
      action: logEntry.action,
      status: logEntry.status,
      deviceInfo: logEntry.deviceInfo,
      authMethod: logEntry.authMethod,
      ipOrNetwork: logEntry.ipOrNetwork,
      createdAt: logEntry.createdAt,
    };
    if (logEntry.email) firestorePayload.email = logEntry.email;
    if (logEntry.note) firestorePayload.note = logEntry.note;

    await setDoc(docRef, firestorePayload);
  } catch (err) {
    console.warn('Ghi log lên Firestore thất bại (đã lưu local):', err);
  }

  return logEntry;
};

/**
 * Tải danh sách lịch sử đăng nhập từ Firestore kết hợp Local
 */
export const fetchDiscordLogs = async (maxCount = 100): Promise<DiscordLoginLog[]> => {
  let firestoreLogs: DiscordLoginLog[] = [];

  try {
    const q = query(collection(db, FIRESTORE_COLLECTION), orderBy('createdAt', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const data = d.data();
      firestoreLogs.push({
        id: d.id,
        timestamp: data.timestamp || '',
        isoTime: data.isoTime || '',
        discordId: data.discordId || '',
        username: data.username || '',
        displayName: data.displayName || '',
        email: data.email,
        action: data.action || 'LOGIN',
        status: data.status || 'SUCCESS',
        deviceInfo: data.deviceInfo || 'Trình duyệt web',
        ipOrNetwork: data.ipOrNetwork,
        authMethod: data.authMethod || 'manual',
        note: data.note,
        createdAt: data.createdAt || 0,
      });
    });
  } catch (err) {
    console.warn('Lỗi đọc logs từ Firestore, dùng bản local:', err);
  }

  // Hợp nhất Firestore và Local
  const localLogs = getLocalDiscordLogs();
  const map = new Map<string, DiscordLoginLog>();

  firestoreLogs.forEach((l) => map.set(l.id, l));
  localLogs.forEach((l) => {
    if (!map.has(l.id)) map.set(l.id, l);
  });

  const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Gán STT
  return merged.map((item, idx) => ({
    ...item,
    stt: idx + 1,
  }));
};

/**
 * Xuất danh sách nhật ký đăng nhập thành file Excel Log_Discord.xlsx
 */
export const exportDiscordLogsToExcel = (logs: DiscordLoginLog[]): void => {
  if (!logs || logs.length === 0) {
    throw new Error('Chưa có dữ liệu nhật ký nào để xuất file Log_Discord.xlsx!');
  }

  // Định dạng hàng dữ liệu cho bảng tính Excel
  const dataRows = logs.map((log, index) => ({
    'STT': index + 1,
    'Thời Gian Đăng Nhập': log.timestamp,
    'Tên Hiển Thị Discord': log.displayName || log.username,
    'Username Discord': log.username ? `@${log.username}` : 'N/A',
    'Discord ID': log.discordId || 'N/A',
    'Phương Thức': log.authMethod === 'oauth2' ? 'Discord OAuth2' : 'Xác thực Discord Tag',
    'Hành Động': log.action === 'LOGIN' ? 'Đăng nhập' : log.action === 'LOGOUT' ? 'Đăng xuất' : 'Tiếp tục phiên',
    'Trạng Thái': log.status === 'SUCCESS' ? 'Thành công' : 'Thất bại',
    'Thiết Bị / Trình Duyệt': log.deviceInfo || 'Không xác định',
    'Kết Nối': log.ipOrNetwork || 'Web Trực Tuyến',
    'Ghi Chú': log.note || 'Bình thường',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);

  // Cấu hình độ rộng các cột tự động để file Excel mở ra đẹp mắt, không bị che chữ
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 22 }, // Thời Gian Đăng Nhập
    { wch: 25 }, // Tên Hiển Thị
    { wch: 20 }, // Username
    { wch: 22 }, // Discord ID
    { wch: 22 }, // Phương Thức
    { wch: 15 }, // Hành Động
    { wch: 14 }, // Trạng Thái
    { wch: 30 }, // Thiết Bị / Trình Duyệt
    { wch: 22 }, // Kết Nối
    { wch: 30 }, // Ghi Chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Log_Discord');

  // Tải file với tên chuẩn "Log_Discord.xlsx"
  XLSX.writeFile(workbook, 'Log_Discord.xlsx');
};
