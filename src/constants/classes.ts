import { ClassMetadata, RaidClass, RaidMember, RaidParty, PersonnelMember, RaidBoard } from '../types';

export const DEFAULT_RAID_PARTIES: RaidParty[] = [
  { id: 1, name: 'PT 1' },
  { id: 2, name: 'PT 2' },
];

export const RAID_CLASSES: Record<RaidClass, ClassMetadata> = {
  'Toái Mộng': {
    name: 'Toái Mộng',
    shortName: 'TM',
    role: 'DPS',
    bgColor: '#52B3F7', // Sky Blue in image
    textColor: '#000000',
    rgb: { r: 0.32, g: 0.70, b: 0.97 },
    description: 'Sát thủ cơ động cao, bạo kích mạnh',
  },
  'Huyết Hà': {
    name: 'Huyết Hà',
    shortName: 'HH',
    role: 'DPS',
    bgColor: '#BF1E1E', // Crimson Red in image
    textColor: '#FFFFFF',
    rgb: { r: 0.75, g: 0.12, b: 0.12 },
    description: 'Thương kỵ dũng mãnh, sinh lực dồi dào',
  },
  'Thiết Y': {
    name: 'Thiết Y',
    shortName: 'TY',
    role: 'Tank',
    bgColor: '#EFA00B', // Golden Yellow in image
    textColor: '#000000',
    rgb: { r: 0.94, g: 0.63, b: 0.04 },
    description: 'Đỡ đòn vững chãi, kiểm soát khống chế',
  },
  'Thần Tương': {
    name: 'Thần Tương',
    shortName: 'TT',
    role: 'DPS',
    bgColor: '#1B5DCE', // Deep Royal Blue in image
    textColor: '#FFFFFF',
    rgb: { r: 0.11, g: 0.36, b: 0.81 },
    description: 'Cầm kiếm tầm xa, sát thương diện rộng',
  },
  'Cửu Linh': {
    name: 'Cửu Linh',
    shortName: 'CL',
    role: 'DPS',
    bgColor: '#6B2495', // Deep Purple in image
    textColor: '#FFFFFF',
    rgb: { r: 0.42, g: 0.14, b: 0.58 },
    description: 'Triệu hồi dược sư, khống chế và debuff',
  },
  'Long Ngâm': {
    name: 'Long Ngâm',
    shortName: 'LN',
    role: 'DPS',
    bgColor: '#1B929A', // Teal / Blue-green in image
    textColor: '#FFFFFF',
    rgb: { r: 0.11, g: 0.57, b: 0.60 },
    description: 'Kiếm khí linh hoạt, dồn sát thương bùng nổ',
  },
  'Tố Vấn': {
    name: 'Tố Vấn',
    shortName: 'TV',
    role: 'Healer',
    bgColor: '#75CD8D', // Soft Mint Green in image
    textColor: '#000000',
    rgb: { r: 0.46, g: 0.80, b: 0.55 },
    description: 'Trị liệu thần thánh, hỗ trợ sinh tồn',
  },
  'Triều Quang': {
    name: 'Triều Quang',
    shortName: 'TQ',
    role: 'DPS',
    bgColor: '#F45D78', // Coral / Salmon pink
    textColor: '#FFFFFF',
    rgb: { r: 0.96, g: 0.36, b: 0.47 },
    description: 'Hệ phái mới ánh sáng, tương trợ toàn diện',
  },
  'Huyền Cơ': {
    name: 'Huyền Cơ',
    shortName: 'HC',
    role: 'DPS',
    bgColor: '#4A6984', // Steel mechanic blue
    textColor: '#FFFFFF',
    rgb: { r: 0.29, g: 0.41, b: 0.52 },
    description: 'Cơ quan bí thuật, phi thiên linh xảo',
  },
  'Thương Lan': {
    name: 'Thương Lan',
    shortName: 'TL',
    role: 'Tank',
    bgColor: '#0A74B7', // Deep Ocean Cobalt
    textColor: '#FFFFFF',
    rgb: { r: 0.04, g: 0.45, b: 0.72 },
    description: 'Thương thuẫn dũng mãnh, thiết giáp hộ vệ',
  },
  'Thiên Vấn': {
    name: 'Thiên Vấn',
    shortName: 'ThV',
    role: 'DPS',
    bgColor: '#25A26B', // Jade Silk Green
    textColor: '#FFFFFF',
    rgb: { r: 0.15, g: 0.64, b: 0.42 },
    description: 'Tố Vấn tư thái bạo kích, vũ lụa xuất kích',
  },
};

export const CLASS_LIST: RaidClass[] = [
  'Huyết Hà',
  'Thiết Y',
  'Thương Lan',
  'Toái Mộng',
  'Thần Tương',
  'Long Ngâm',
  'Cửu Linh',
  'Triều Quang',
  'Huyền Cơ',
  'Tố Vấn',
  'Thiên Vấn',
];

// Exact sample data from the user uploaded photo:
export const INITIAL_MEMBERS_FROM_IMAGE: RaidMember[] = [
  { id: 'm1', stt: 1, ingame: 'Minos K', className: 'Toái Mộng', loggedBy: 'Nim K', party: 1 },
  { id: 'm2', stt: 2, ingame: 'Bún Piu Piuuu', className: 'Huyết Hà', loggedBy: 'Bún', party: 1 },
  { id: 'm3', stt: 3, ingame: 'Ferrijit', className: 'Thiết Y', loggedBy: 'Ferrijit', party: 1 },
  { id: 'm4', stt: 4, ingame: 'Back Code Thin', className: 'Thần Tương', loggedBy: 'Back Code Thin', party: 1 },
  { id: 'm5', stt: 5, ingame: 'Syk Yuuk', className: 'Cửu Linh', loggedBy: 'Syk Yuuk', party: 1 },
  { id: 'm6', stt: 6, ingame: 'Dạ Du', className: 'Thiết Y', loggedBy: 'Dạ Du', party: 1 },
  { id: 'm7', stt: 7, ingame: 'Vivy', className: 'Long Ngâm', loggedBy: 'Vivy', party: 2 },
  { id: 'm8', stt: 8, ingame: 'Tố Linhhh', className: 'Tố Vấn', loggedBy: 'Souu', party: 2 },
  { id: 'm9', stt: 9, ingame: 'Libra', className: 'Thần Tương', loggedBy: 'Libra', party: 2 },
  { id: 'm10', stt: 10, ingame: 'Cửu U Vương', className: 'Cửu Linh', loggedBy: 'Cửu U Vương', party: 2 },
  { id: 'm11', stt: 11, ingame: 'Thỏbạolực', className: 'Tố Vấn', loggedBy: 'Thỏbạolực', party: 2 },
  { id: 'm12', stt: 12, ingame: 'HaneMeii', className: 'Tố Vấn', loggedBy: 'HaneMeii', party: 2 },
];

export const INITIAL_PERSONNEL_POOL: PersonnelMember[] = [
  { id: 'p_1', ingame: 'Minos K', className: 'Toái Mộng', loggedBy: 'Nim K' },
  { id: 'p_2', ingame: 'Bún Piu Piuuu', className: 'Huyết Hà', loggedBy: 'Bún' },
  { id: 'p_3', ingame: 'Ferrijit', className: 'Thiết Y', loggedBy: 'Ferrijit' },
  { id: 'p_4', ingame: 'Back Code Thin', className: 'Thần Tương', loggedBy: 'Back Code Thin' },
  { id: 'p_5', ingame: 'Syk Yuuk', className: 'Cửu Linh', loggedBy: 'Syk Yuuk' },
  { id: 'p_6', ingame: 'Dạ Du', className: 'Thiết Y', loggedBy: 'Dạ Du' },
  { id: 'p_7', ingame: 'Vivy', className: 'Long Ngâm', loggedBy: 'Vivy' },
  { id: 'p_8', ingame: 'Tố Linhhh', className: 'Tố Vấn', loggedBy: 'Souu' },
  { id: 'p_9', ingame: 'Libra', className: 'Thần Tương', loggedBy: 'Libra' },
  { id: 'p_10', ingame: 'Cửu U Vương', className: 'Cửu Linh', loggedBy: 'Cửu U Vương' },
  { id: 'p_11', ingame: 'Thỏbạolực', className: 'Tố Vấn', loggedBy: 'Thỏbạolực' },
  { id: 'p_12', ingame: 'HaneMeii', className: 'Tố Vấn', loggedBy: 'HaneMeii' },
  { id: 'p_13', ingame: 'Kuroba', className: 'Thương Lan', loggedBy: 'Kuroba' },
  { id: 'p_14', ingame: 'Băng Nhi', className: 'Thiên Vấn', loggedBy: 'Băng Nhi' },
  { id: 'p_15', ingame: 'Gia Cát', className: 'Huyền Cơ', loggedBy: 'Gia Cát' },
  { id: 'p_16', ingame: 'Quang Minh', className: 'Triều Quang', loggedBy: 'Quang Minh' },
];

export function createSampleBoardFromImage(boardNumber: number = 1): RaidBoard {
  const timestamp = Date.now();
  return {
    id: `board_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    titlePrefix: `RAID ${boardNumber}`,
    scheduleTime: boardNumber === 1 ? 'MON 20:30' : `THU 20:30`,
    bossName: 'NIÊN DU',
    parties: [
      { id: 1, name: 'PT 1' },
      { id: 2, name: 'PT 2' },
    ],
    members: INITIAL_MEMBERS_FROM_IMAGE.map((m, idx) => ({
      ...m,
      id: `m_${timestamp}_${idx + 1}`,
    })),
    createdAt: timestamp,
  };
}

export function createEmptyBoard(boardNumber: number = 1): RaidBoard {
  const timestamp = Date.now();
  return {
    id: `board_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    titlePrefix: `RAID ${boardNumber}`,
    scheduleTime: 'MON 20:30',
    bossName: 'NIÊN DU',
    parties: [
      { id: 1, name: 'PT 1' },
      { id: 2, name: 'PT 2' },
    ],
    members: Array.from({ length: 12 }, (_, i) => ({
      id: `m_${timestamp}_${i + 1}`,
      stt: i + 1,
      ingame: '',
      className: 'Toái Mộng' as RaidClass,
      loggedBy: '',
      party: i < 6 ? 1 : 2,
    })),
    createdAt: timestamp,
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return { r: 0.5, g: 0.5, b: 0.5 };
  return {
    r: Math.round(((num >> 16) & 255) / 255 * 100) / 100,
    g: Math.round(((num >> 8) & 255) / 255 * 100) / 100,
    b: Math.round((num & 255) / 255 * 100) / 100,
  };
}

export function getContrastTextColor(hex: string): '#FFFFFF' | '#000000' {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return '#FFFFFF';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  // Standard perceptual luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#000000' : '#FFFFFF';
}

export function getEffectiveClassMeta(
  className: RaidClass,
  customColors?: Partial<Record<RaidClass, string>>
): ClassMetadata {
  const base = RAID_CLASSES[className] || RAID_CLASSES['Toái Mộng'];
  const customHex = customColors?.[className];
  if (!customHex) return base;

  return {
    ...base,
    bgColor: customHex,
    textColor: getContrastTextColor(customHex),
    rgb: hexToRgb(customHex),
  };
}
