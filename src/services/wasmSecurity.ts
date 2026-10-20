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

function sha256Fallback(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isPrime = (n: number) => {
    for (let factor = 2, max = Math.sqrt(n); factor <= max; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0, a, hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (let i = 0; i < 8; i++) {
    for (let i2 = 3; i2 >= 0; i2--) {
      const b = (hash[i] >> (i2 * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
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
  return sha256Fallback(message);
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

    // Xóa triệt để mọi key plain-text cũ để ngăn chặn việc kẻ xấu sửa bằng F12
    localStorage.removeItem('guild_nien_du_discord_user');
  } catch (err) {
    console.error('Lỗi khi lưu phiên bảo mật WebAssembly:', err);
  }
}

/**
 * Kiểm tra và giải mã phiên làm việc Discord bằng WebAssembly & Xác thực Token trực tiếp từ Discord API
 * Nếu bị can thiệp F12, sửa localStorage hay dùng token giả -> HỦY PHIÊN NGAY LẬP TỨC
 */
export async function loadVerifiedDiscordSession(): Promise<DiscordUser | null> {
  try {
    if (typeof localStorage === 'undefined') return null;

    // 0. Luôn dọn dẹp key giả mạo nếu có kẻ xấu cố tình inject vào localStorage
    localStorage.removeItem('guild_nien_du_discord_user');

    const rawSession = localStorage.getItem(SECURE_SESSION_STORAGE_KEY);
    if (!rawSession) {
      // TUYỆT ĐỐI KHÔNG FALLBACK: Bắt buộc phải có phong bì mã hóa WebAssembly
      return null;
    }

    const session: StoredSecureSession = JSON.parse(rawSession);

    if (!session || !session.token || !session.encryptedData || !session.hash) {
      console.warn('[WASM Security] Cấu trúc phiên không hợp lệ.');
      purgeSecureDiscordSession();
      return null;
    }

    // 1. Kiểm tra thời hạn hết hạn (Expiration)
    if (Date.now() > session.expiresAt) {
      console.warn('[WASM Security] Phiên đăng nhập Discord đã hết hạn.');
      purgeSecureDiscordSession();
      return null;
    }

    // 2. Kiểm tra tính toàn vẹn qua WebAssembly verification engine
    const instance = await getSecurityWasmInstance();
    const exports = instance.exports as any;
    const isValidTokenLen = exports.verify_session(session.token.length, session.timestamp);
    if (!isValidTokenLen) {
      console.warn('[WASM Security] Token Discord không đạt chuẩn kiểm định WebAssembly.');
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
    if (!user || !user.id || !user.username) {
      console.warn('[WASM Security] Dữ liệu người dùng sau giải mã WebAssembly không hợp lệ.');
      purgeSecureDiscordSession();
      return null;
    }

    // 4. Kiểm tra chữ ký bảo mật SHA-256
    const expectedHash = await computeSessionHash(user.id, session.token, session.timestamp);
    if (session.hash !== expectedHash) {
      console.warn('[WASM Security] Cảnh báo: Chữ ký phiên bảo mật không khớp. Phát hiện can thiệp dữ liệu!');
      purgeSecureDiscordSession();
      return null;
    }

    // 5. Xác thực token thực tế với Discord API (@me endpoint)
    // Ngăn chặn hoàn toàn việc ai đó tạo token rác hoặc sửa ID người dùng
    try {
      const discordRes = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!discordRes.ok) {
        console.warn(`[WASM Security] Token bị Discord API từ chối (Mã lỗi ${discordRes.status}). Buộc đăng nhập lại.`);
        purgeSecureDiscordSession();
        return null;
      }

      const discordData = await discordRes.json();
      if (!discordData || discordData.id !== user.id) {
        console.warn('[WASM Security] ID người dùng không trùng khớp với Token Discord chính chủ!');
        purgeSecureDiscordSession();
        return null;
      }
    } catch (apiErr) {
      console.warn('[WASM Security] Không thể kết nối Discord API để re-verify (sẽ dùng chữ ký WebAssembly):', apiErr);
    }

    return user;
  } catch (err) {
    console.error('Không thể xác thực phiên WebAssembly:', err);
    purgeSecureDiscordSession();
    return null;
  }
}

/**
 * Lấy Access Token của Discord từ phiên đăng nhập an toàn để gửi lên Backend Vercel
 */
export function getStoredDiscordToken(): string | null {
  try {
    const rawSession = localStorage.getItem(SECURE_SESSION_STORAGE_KEY);
    if (!rawSession) return null;
    const session = JSON.parse(rawSession);
    return session?.token || null;
  } catch {
    return null;
  }
}

/**
 * Xóa sạch toàn bộ phiên đăng nhập
 */
export function purgeSecureDiscordSession(): void {
  try {
    localStorage.removeItem(SECURE_SESSION_STORAGE_KEY);
    localStorage.removeItem('guild_nien_du_discord_user');
  } catch (err) {
    console.error('Lỗi xóa session:', err);
  }
}
