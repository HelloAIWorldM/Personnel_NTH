import { GuildWarBoard, GuildMember, GuildWarSession } from '../types';

export const DEFAULT_GUILD_SESSIONS: GuildWarSession[] = [
  { id: 's1', label: 'Tuần 1/T1' },
  { id: 's2', label: 'Tuần 1/T2' },
  { id: 's3', label: 'Tuần 2' },
  { id: 's4', label: 'Tuần 3/T1' },
  { id: 's5', label: 'Tuần 3/T2' },
  { id: 's6', label: 'Tuần 4' },
];

// Clean empty guild members list (no sample dummy data)
export const INITIAL_GUILD_MEMBERS: Omit<GuildMember, 'id'>[] = [];

export function createSampleGuildWarBoard(boardNumber: number = 1): GuildWarBoard {
  return createEmptyGuildWarBoard(boardNumber);
}

export function createEmptyGuildWarBoard(
  boardNumber: number = 1,
  title?: string,
  scheduleTime: string = 'T7 20:00 & CN 20:00',
  targetName: string = 'Công Thành / Đẩy Trụ'
): GuildWarBoard {
  const timestamp = Date.now();
  return {
    id: `gw_board_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    title: title?.trim() || `BANG CHIẾN TUẦN ${boardNumber}`,
    scheduleTime: scheduleTime.trim() || 'T7 20:00 & CN 20:00',
    targetName: targetName.trim() || 'Công Thành / Đẩy Trụ',
    sessions: DEFAULT_GUILD_SESSIONS.map((s) => ({ ...s })),
    members: [],
    minAttendanceRequired: 4,
    reportDate: new Date().toLocaleDateString('vi-VN'),
    createdAt: timestamp,
    partyNotes: {},
  };
}
