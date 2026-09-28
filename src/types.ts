export type RaidClass =
  | 'Huyết Hà'
  | 'Thiết Y'
  | 'Toái Mộng'
  | 'Thần Tương'
  | 'Long Ngâm'
  | 'Cửu Linh'
  | 'Triều Quang'
  | 'Huyền Cơ'
  | 'Tố Vấn'
  | 'Thương Lan'
  | 'Thiên Vấn'
  | 'Hồng Âm';

export type RaidRole = 'Tank' | 'Healer' | 'DPS';

export interface ClassMetadata {
  name: RaidClass;
  shortName: string;
  role: RaidRole;
  bgColor: string; // Hex color for CSS & Sheets
  textColor: string; // '#ffffff' or '#000000'
  rgb: { r: number; g: number; b: number }; // For Google Sheets formatting (0-1 float)
  description: string;
}

export interface RaidMember {
  id: string;
  stt: number;
  ingame: string;
  className: RaidClass;
  loggedBy: string;
  party?: number; // 1, 2, 3... (PT 1, PT 2)
  checked?: boolean; // Attendance / present status
}

export interface RaidParty {
  id: number;
  name: string; // e.g. "PT 1", "PT 2"
}

export interface RaidConfig {
  id: string;
  title: string;
  scheduleTime: string;
  bossName: string;
  members: RaidMember[];
}

export interface RaidBoard {
  id: string;
  titlePrefix: string;
  scheduleTime: string;
  bossName: string;
  members: RaidMember[];
  parties: RaidParty[];
  createdAt: number;
}

export interface PersonnelMember {
  id: string;
  ingame: string;
  className: RaidClass;
  loggedBy: string;
  note?: string;
  checked?: boolean; // Attendance / present checkmark
  createdAt?: number;
}

export type CustomClassColors = Partial<Record<RaidClass, string>>;

export type GuildRole =
  | 'Bang Chủ'
  | 'Phó Bang'
  | 'Trưởng Lão'
  | 'Đường Chủ'
  | 'Tinh Anh'
  | 'Lead Tổng'
  | 'Lead Team'
  | 'Thành Viên'
  | 'Học Đồ';

export type GuildParticipation = 'Cả hai' | 'Bang chiến' | 'Raid' | 'Dự bị';

export type GuildTeam = 'Mid' | 'Cơ động' | 'Đẩy trụ' | 'Chưa xếp' | 'Top' | 'Bot';

export interface GuildMember {
  id: string;
  stt?: number;
  ingame: string;
  className: RaidClass;
  guildRole: GuildRole;
  participation: GuildParticipation;
  discord?: string;
  team: GuildTeam; // 'Cơ động' | 'Đẩy trụ' | 'Mid' | 'Chưa xếp'
  party?: number; // 1, 2, 3, 4 (PT-1, PT-2, PT-3, PT-4)
  slot?: number; // 1 to 6
  attendance: Record<string, boolean>; // key: sessionId (e.g. "s1"), value: boolean
  note?: string;
  updatedAt?: string;
}

export interface GuildWarSession {
  id: string; // e.g. "s1", "s2"
  label: string; // e.g. "Tuần 1/T1", "Tuần 1/T2", "Tuần 2", "Tuần 3/T1", "Tuần 3/T2", "Tuần 4"
  date?: string;
}

export interface GuildWarBoard {
  id: string;
  title: string; // e.g. "BANG CHIẾN TUẦN 1"
  scheduleTime: string; // e.g. "T7 20:30 & CN 20:30"
  targetName: string; // e.g. "Chiếm Thành / Đẩy Trụ"
  sessions: GuildWarSession[];
  members: GuildMember[];
  minAttendanceRequired: number; // Default 4
  reportDate?: string; // e.g. "30/08/2026"
  createdAt: number;
}
