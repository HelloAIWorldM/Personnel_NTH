import { RaidMember, RaidBoard, GuildMember, GuildTeam } from '../types';

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
 * Normalizes schedule time for time-slot comparison across boards:
 * e.g. "MON 20:30", "mon 20:30  " -> "mon 20:30"
 */
export const normalizeSchedule = (time?: string): string => {
  if (!time) return '';
  return time.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Finds all duplicate Ingame names among members within a single board.
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
 * Finds all duplicate Logged by names among members within a single board.
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

// ==========================================
// Cross-Board Schedule Conflict Detection
// ==========================================

export interface BoardScheduleConflict {
  key: string;
  originalName: string;
  type: 'ingame' | 'loggedBy';
  scheduleTime: string;
  currentBoardStts: number[];
  otherBoardTitle: string;
  otherBoardId: string;
  otherBoardStts: number[];
}

/**
 * Finds personnel assigned to 2 or more boards that share the EXACT SAME schedule time.
 * e.g., both RAID 1 and RAID 2 are scheduled for "MON 20:30", and member "O&&" is placed in both!
 */
export const findScheduleConflictsForBoard = (
  targetBoard: RaidBoard,
  allBoards: RaidBoard[]
): BoardScheduleConflict[] => {
  const targetSchedule = normalizeSchedule(targetBoard.scheduleTime);
  if (!targetSchedule) return [];

  const coScheduledBoards = allBoards.filter(
    (b) => b.id !== targetBoard.id && normalizeSchedule(b.scheduleTime) === targetSchedule
  );
  if (coScheduledBoards.length === 0) return [];

  const conflicts: BoardScheduleConflict[] = [];

  // 1. Ingame cross-board conflict
  const ingameMap = new Map<string, { originalName: string; stts: number[] }>();
  (targetBoard.members || []).forEach((m) => {
    const key = normalizeName(m.ingame);
    if (!key) return;
    const existing = ingameMap.get(key);
    if (existing) {
      existing.stts.push(m.stt);
    } else {
      ingameMap.set(key, { originalName: m.ingame.trim(), stts: [m.stt] });
    }
  });

  ingameMap.forEach((val, key) => {
    coScheduledBoards.forEach((otherBoard) => {
      const otherStts: number[] = [];
      (otherBoard.members || []).forEach((om) => {
        if (normalizeName(om.ingame) === key) {
          otherStts.push(om.stt);
        }
      });
      if (otherStts.length > 0) {
        conflicts.push({
          key,
          originalName: val.originalName,
          type: 'ingame',
          scheduleTime: targetBoard.scheduleTime,
          currentBoardStts: val.stts,
          otherBoardTitle: otherBoard.titlePrefix,
          otherBoardId: otherBoard.id,
          otherBoardStts: otherStts,
        });
      }
    });
  });

  // 2. LoggedBy cross-board conflict
  const loggedByMap = new Map<string, { originalName: string; stts: number[] }>();
  (targetBoard.members || []).forEach((m) => {
    const key = normalizeName(m.loggedBy);
    if (!key) return;
    const existing = loggedByMap.get(key);
    if (existing) {
      existing.stts.push(m.stt);
    } else {
      loggedByMap.set(key, { originalName: m.loggedBy.trim(), stts: [m.stt] });
    }
  });

  loggedByMap.forEach((val, key) => {
    coScheduledBoards.forEach((otherBoard) => {
      const otherStts: number[] = [];
      (otherBoard.members || []).forEach((om) => {
        if (normalizeName(om.loggedBy) === key) {
          otherStts.push(om.stt);
        }
      });
      if (otherStts.length > 0) {
        conflicts.push({
          key,
          originalName: val.originalName,
          type: 'loggedBy',
          scheduleTime: targetBoard.scheduleTime,
          currentBoardStts: val.stts,
          otherBoardTitle: otherBoard.titlePrefix,
          otherBoardId: otherBoard.id,
          otherBoardStts: otherStts,
        });
      }
    });
  });

  return conflicts;
};

/**
 * Returns quick lookup maps for row-level schedule conflict highlighting in RaidTable.
 */
export const getScheduleConflictLookupForBoard = (
  targetBoard: RaidBoard,
  allBoards: RaidBoard[]
): {
  ingameConflictStts: Set<number>;
  loggedByConflictStts: Set<number>;
  conflictingIngameStts: Set<number>;
  conflictingLoggedByStts: Set<number>;
  conflictsByStt: Map<number, BoardScheduleConflict[]>;
} => {
  const conflicts = findScheduleConflictsForBoard(targetBoard, allBoards || []);
  const ingameConflictStts = new Set<number>();
  const loggedByConflictStts = new Set<number>();
  const conflictsByStt = new Map<number, BoardScheduleConflict[]>();

  conflicts.forEach((c) => {
    (c.currentBoardStts || []).forEach((stt) => {
      if (c.type === 'ingame') {
        ingameConflictStts.add(stt);
      } else {
        loggedByConflictStts.add(stt);
      }
      const list = conflictsByStt.get(stt) || [];
      list.push(c);
      conflictsByStt.set(stt, list);
    });
  });

  return {
    ingameConflictStts,
    loggedByConflictStts,
    conflictingIngameStts: ingameConflictStts,
    conflictingLoggedByStts: loggedByConflictStts,
    conflictsByStt,
  };
};

// ==========================================
// Guild War Duplicate Detection
// ==========================================

export interface GuildWarDuplicateGroup {
  key: string;
  originalName: string;
  count: number;
  members: Array<{
    id: string;
    ingame: string;
    team: GuildTeam;
    party?: number;
    slot?: number;
    stt: number;
  }>;
}

/**
 * Finds all duplicate Ingame names among Guild War members (across teams, parties, and roster).
 */
export const findGuildWarDuplicates = (members: GuildMember[]): GuildWarDuplicateGroup[] => {
  const map = new Map<string, GuildWarDuplicateGroup>();

  members.forEach((m) => {
    const key = normalizeName(m.ingame);
    if (!key) return;

    const existing = map.get(key);
    const memberInfo = {
      id: m.id,
      ingame: m.ingame.trim(),
      team: (m.team || 'Chưa xếp') as GuildTeam,
      party: m.party,
      slot: m.slot,
      stt: m.stt,
    };

    if (existing) {
      existing.count += 1;
      existing.members.push(memberInfo);
    } else {
      map.set(key, {
        key,
        originalName: m.ingame.trim(),
        count: 1,
        members: [memberInfo],
      });
    }
  });

  return Array.from(map.values()).filter((g) => g.count > 1);
};

