import { RaidMember } from '../types';

export interface DuplicateGroup {
  key: string;
  originalName: string;
  count: number;
  stts: number[];
  memberIds: string[];
}

/**
 * Normalizes a name string for duplicate comparison:
 * - Trims whitespace
 * - Converts to lowercase
 * - Returns empty string for empty, whitespace or '-' placeholders
 */
export const normalizeName = (name?: string): string => {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed === '' || trimmed === '-') return '';
  return trimmed.toLowerCase();
};

/**
 * Finds all duplicate Ingame names among members.
 */
export const findDuplicateIngames = (members: RaidMember[]): DuplicateGroup[] => {
  const map = new Map<string, DuplicateGroup>();

  members.forEach((m) => {
    const key = normalizeName(m.ingame);
    if (!key) return;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.stts.push(m.stt);
      existing.memberIds.push(m.id);
    } else {
      map.set(key, {
        key,
        originalName: m.ingame.trim(),
        count: 1,
        stts: [m.stt],
        memberIds: [m.id],
      });
    }
  });

  return Array.from(map.values()).filter((group) => group.count > 1);
};

/**
 * Finds all duplicate Logged by names among members.
 */
export const findDuplicateLoggedBys = (members: RaidMember[]): DuplicateGroup[] => {
  const map = new Map<string, DuplicateGroup>();

  members.forEach((m) => {
    const key = normalizeName(m.loggedBy);
    if (!key) return;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.stts.push(m.stt);
      existing.memberIds.push(m.id);
    } else {
      map.set(key, {
        key,
        originalName: m.loggedBy.trim(),
        count: 1,
        stts: [m.stt],
        memberIds: [m.id],
      });
    }
  });

  return Array.from(map.values()).filter((group) => group.count > 1);
};

/**
 * Returns a lookup map from memberId to its Ingame DuplicateGroup (if duplicate).
 */
export const getDuplicateIngameMap = (members: RaidMember[]): Map<string, DuplicateGroup> => {
  const duplicates = findDuplicateIngames(members);
  const lookup = new Map<string, DuplicateGroup>();

  duplicates.forEach((group) => {
    group.memberIds.forEach((id) => {
      lookup.set(id, group);
    });
  });

  return lookup;
};

/**
 * Returns a lookup map from memberId to its LoggedBy DuplicateGroup (if duplicate).
 */
export const getDuplicateLoggedByMap = (members: RaidMember[]): Map<string, DuplicateGroup> => {
  const duplicates = findDuplicateLoggedBys(members);
  const lookup = new Map<string, DuplicateGroup>();

  duplicates.forEach((group) => {
    group.memberIds.forEach((id) => {
      lookup.set(id, group);
    });
  });

  return lookup;
};
