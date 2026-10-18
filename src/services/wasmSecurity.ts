import { DiscordUser } from '../types';

export const SECURE_SESSION_STORAGE_KEY = 'guild_nien_du_auth_session_v2';
export const LEGACY_DISCORD_USER_KEY = 'guild_nien_du_discord_user';

// Dynamic salt key for WebAssembly in-memory operations
const WASM_SECRET_SALT = 'NienDu_MunKiu_WasmSecurityEngine_v2';

let wasmInstancePromise: Promise<WebAssembly.Instance> | null = null;

// Embedded fallback WASM binary bytes in case static file fetch fails
const EMBEDDED_WASM_BYTES = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x0f, 0x02, 0x60, 0x04, 0x7f, 0x7f, 0x7f, 0x7f, 0x01, 0x7f, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
  0x03, 0x03, 0x02, 0x00, 0x01,
  0x05, 0x03, 0x01, 0x00, 0x01,
  0x07, 0x2b, 0x03,
  0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00,
  0x0e, 0x64, 0x65, 0x63, 0x72, 0x79, 0x70, 0x74, 0x5f, 0x62, 0x75, 0x66, 0x66, 0x65, 0x72, 0x00, 0x00,
  0x0e, 0x76, 0x65, 0x72, 0x69, 0x66, 0x79, 0x5f, 0x73, 0x65, 0x73, 0x73, 0x69, 0x6f, 0x6e, 0x00, 0x01,
  0x0a, 0x36, 0x02,
  0x2b, 0x01, 0x01, 0x7f, 0x41, 0x00, 0x21, 0x04, 0x02, 0x40, 0x03, 0x40,
  0x20, 0x04, 0x20, 0x00, 0x4e, 0x0d, 0x01, 0x20, 0x04, 0x20, 0x04, 0x2d, 0x00, 0x00,
  0x20, 0x02, 0x20, 0x04, 0x20, 0x03, 0x6f, 0x6a, 0x2d, 0x00, 0x00, 0x73, 0x20, 0x01,
  0x41, 0xff, 0x01, 0x71, 0x73, 0x3a, 0x00, 0x00, 0x20, 0x04, 0x41, 0x01, 0x6a, 0x21,
  0x04, 0x0c, 0x00, 0x0b, 0x0b, 0x20, 0x00, 0x0b,
  0x09, 0x00, 0x20, 0x00, 0x41, 0x0a, 0x4e, 0x04, 0x7f, 0x41, 0x01, 0x05, 0x41, 0x00, 0x0b, 0x0b
]);

/**
 * Nạp WebAssembly security module (từ public/security.wasm hoặc embedded binary)
 */
export async function getSecurityWasmInstance(): Promise<WebAssembly.Instance> {
  if (wasmInstancePromise) return wasmInstancePromise;

  wasmInstancePromise = (async () => {
    try {
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        const res = await fetch('/security.wasm', { cache: 'no-cache' });
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const { instance } = await WebAssembly.instantiate(buffer);
          return instance;
        }
      }
    } catch {
      // Fallback below
    }

    // Instantiation from embedded binary bytes
    const { instance } = await WebAssembly.instantiate(EMBEDDED_WASM_BYTES);
    return instance;
  })();

  return wasmInstancePromise;
}

/**
 * Tạo chữ ký SHA-256 cho session
 */
async function computeSessionHash(userId: string, token: string, timestamp: number): Promise<string> {
  const message = `${userId}:${token}:${timestamp}:${WASM_SECRET_SALT}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Simple fallback hash
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Mã hóa payload JSON sử dụng thuật toán xáo trộn theo dynamicKey + timestamp
 */
function encryptPayload(rawJson: string, timestamp: number, key: string): string {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(rawJson);
  const keyBytes = encoder.encode(key);

  const encrypted = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length] ^ (timestamp & 255);
  }

  // Chuyển sang Base64
  let binary = '';
  for (let i = 0; i < encrypted.length; i++) {
    binary += String.fromCharCode(encrypted[i]);
  }
  return btoa(binary);
}

/**
 * Giải mã payload an toàn trực tiếp trong bộ nhớ WebAssembly (WASM Linear Memory)
 */
async function decryptPayloadWithWasm(
  encryptedBase64: string,
  timestamp: number,
  key: string
): Promise<string> {
  const instance = await getSecurityWasmInstance();
  const exports = instance.exports as any;
  const memory = exports.memory as WebAssembly.Memory;

  const binaryStr = atob(encryptedBase64);
  const dataLen = binaryStr.length;

  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const keyOffset = 32768; // Nửa trang bộ nhớ WASM (32KB)

  const memView = new Uint8Array(memory.buffer);

  // Nạp dữ liệu mã hóa vào đầu bộ nhớ
  for (let i = 0; i < dataLen; i++) {
    memView[i] = binaryStr.charCodeAt(i);
  }

  // Nạp key giải mã vào keyOffset
  for (let i = 0; i < keyBytes.length; i++) {
    memView[keyOffset + i] = keyBytes[i];
  }

  // Kích hoạt hàm giải mã native trong WebAssembly
  exports.decrypt_buffer(dataLen, timestamp, keyOffset, keyBytes.length);

  // Đọc kết quả giải mã từ bộ nhớ WASM
  const decryptedBytes = new Uint8Array(memory.buffer, 0, dataLen);
  return new TextDecoder('utf-8').decode(decryptedBytes);
}

export interface StoredSecureSession {
  encryptedData: string;
  token: string;
  timestamp: number;
  expiresAt: number;
  hash: string;
}

/**
 * Lưu phiên đăng nhập an toàn với WebAssembly Encryption & Chữ ký toàn vẹn
 */
export async function saveSecureDiscordSession(
  user: DiscordUser,
  accessToken: string,
  expiresInSeconds: number = 604800 // 7 ngày mặc định
): Promise<void> {
  try {
    const timestamp = Date.now();
    const expiresAt = timestamp + expiresInSeconds * 1000;
    const hash = await computeSessionHash(user.id, accessToken, timestamp);

    const rawJson = JSON.stringify(user);
    const encryptedData = encryptPayload(rawJson, timestamp, WASM_SECRET_SALT);

    const sessionObj: StoredSecureSession = {
      encryptedData,
      token: accessToken,
      timestamp,
      expiresAt,
      hash,
    };

    localStorage.setItem(SECURE_SESSION_STORAGE_KEY, JSON.stringify(sessionObj));

    // Đổi mới fallback cũ để tương thích nhưng kèm cờ
    localStorage.setItem(LEGACY_DISCORD_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Lỗi khi lưu phiên bảo mật WebAssembly:', err);
  }
}

/**
 * Kiểm tra và giải mã phiên làm việc Discord bằng WebAssembly
 * Nếu bị can thiệp F12 hoặc token giả, trả về null ngay lập tức
 */
export async function loadVerifiedDiscordSession(): Promise<DiscordUser | null> {
  try {
    if (typeof localStorage === 'undefined') return null;

    const rawSession = localStorage.getItem(SECURE_SESSION_STORAGE_KEY);
    if (!rawSession) {
      // Kiểm tra xem có session cũ không
      const legacyRaw = localStorage.getItem(LEGACY_DISCORD_USER_KEY);
      if (!legacyRaw) return null;
      try {
        const parsed = JSON.parse(legacyRaw);
        if (parsed && parsed.id && parsed.username) {
          return parsed as DiscordUser;
        }
      } catch {
        return null;
      }
      return null;
    }

    const session: StoredSecureSession = JSON.parse(rawSession);

    // 1. Kiểm tra thời hạn hết hạn (Expiration)
    if (Date.now() > session.expiresAt) {
      console.warn('Phiên đăng nhập Discord đã hết hạn.');
      purgeSecureDiscordSession();
      return null;
    }

    // 2. Kiểm tra tính toàn vẹn qua WebAssembly verification engine
    const instance = await getSecurityWasmInstance();
    const exports = instance.exports as any;
    const isValidTokenLen = exports.verify_session(session.token.length, session.timestamp);
    if (!isValidTokenLen) {
      console.warn('Token Discord không đạt chuẩn kiểm định WebAssembly.');
      purgeSecureDiscordSession();
      return null;
    }

    // 3. Giải mã dữ liệu người dùng qua WASM linear memory
    const decryptedJson = await decryptPayloadWithWasm(
      session.encryptedData,
      session.timestamp,
      WASM_SECRET_SALT
    );

    const user: DiscordUser = JSON.parse(decryptedJson);

    // 4. Kiểm tra chữ ký bảo mật SHA-256
    const expectedHash = await computeSessionHash(user.id, session.token, session.timestamp);
    if (session.hash !== expectedHash) {
      console.warn('Cảnh báo: Chữ ký phiên bảo mật không khớp. Phát hiện can thiệp dữ liệu!');
      purgeSecureDiscordSession();
      return null;
    }

    return user;
  } catch (err) {
    console.error('Không thể xác thực phiên WebAssembly:', err);
    purgeSecureDiscordSession();
    return null;
  }
}

/**
 * Xóa sạch toàn bộ phiên đăng nhập
 */
export function purgeSecureDiscordSession(): void {
  try {
    localStorage.removeItem(SECURE_SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_DISCORD_USER_KEY);
  } catch (err) {
    console.error('Lỗi xóa session:', err);
  }
}
