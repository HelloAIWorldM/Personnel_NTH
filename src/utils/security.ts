/**
 * Security & Data Privacy Utilities
 * Ngăn chặn lộ thông tin nhạy cảm (PII), Over-fetching, và Injection attacks.
 */

import { RaidMember, RaidClass } from '../types';
import { RAID_CLASSES } from '../constants/classes';

export type PrivacyMode = 'NONE' | 'MASK' | 'HIDE';

/**
 * Che giấu chuỗi nhạy cảm (ví dụ Logged by, Email, Tên tài khoản, SĐT)
 */
export function maskSensitiveText(value: string | undefined | null, mode: PrivacyMode = 'MASK'): string {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (mode === 'NONE') {
    return trimmed;
  }

  if (mode === 'HIDE') {
    return '---';
  }

  // Chế độ 'MASK':
  // 1. Nếu là email (vd: admin@example.com -> ad***@example.com)
  if (trimmed.includes('@')) {
    const [user, domain] = trimmed.split('@');
    if (user.length <= 2) {
      return `**@${domain}`;
    }
    return `${user.slice(0, 2)}***@${domain}`;
  }

  // 2. Nếu là tên Ingame / Logged by / Số điện thoại:
  if (trimmed.length <= 2) {
    return '***';
  }
  if (trimmed.length <= 4) {
    return `${trimmed[0]}***${trimmed[trimmed.length - 1]}`;
  }
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

/**
 * Whitelist Sanitizer (DTO Pattern)
 * Chỉ cho phép các trường hợp lệ của thành viên Raid đi qua.
 * Tự động loại trừ các thuộc tính nhạy cảm ngoài mong muốn (như password, email, token, role, script).
 */
export function sanitizeRaidMember(raw: any, fallbackStt: number = 1): RaidMember {
  const allowedClasses = Object.keys(RAID_CLASSES) as RaidClass[];

  const id = typeof raw?.id === 'string' && raw.id ? raw.id : `member_${fallbackStt}_${Date.now()}`;
  const stt = typeof raw?.stt === 'number' && Number.isFinite(raw.stt) ? raw.stt : fallbackStt;
  
  // Sanitize text inputs (chống XSS / HTML tags)
  const sanitizeText = (str: any, maxLen: number = 50): string => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/[<>]/g, '') // Chống HTML tags
      .slice(0, maxLen)
      .trim();
  };

  const ingame = sanitizeText(raw?.ingame);
  const loggedBy = sanitizeText(raw?.loggedBy);

  // Validate Class an toàn
  const candidateClass = typeof raw?.className === 'string' ? raw.className.trim() : '';
  const className: RaidClass = allowedClasses.includes(candidateClass as RaidClass)
    ? (candidateClass as RaidClass)
    : 'Toái Mộng';

  const party = typeof raw?.party === 'number' && raw.party > 0 && raw.party <= 10 ? raw.party : undefined;

  return {
    id,
    stt,
    ingame,
    className,
    loggedBy,
    party,
  };
}

/**
 * Áp dụng chế độ bảo vệ dữ liệu khi xuất (Export Privacy Filter)
 */
export function filterMembersForExport(
  members: RaidMember[],
  privacyMode: PrivacyMode = 'NONE'
): RaidMember[] {
  return members.map((m) => {
    if (privacyMode === 'NONE') {
      return { ...m };
    }

    const effectiveLoggedBy = m.loggedBy || m.ingame || '';
    const maskedLogged = maskSensitiveText(effectiveLoggedBy, privacyMode);

    return {
      ...m,
      loggedBy: maskedLogged,
    };
  });
}
