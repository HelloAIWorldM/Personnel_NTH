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
  | 'Thiên Vấn';

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
