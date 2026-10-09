import { createWorker } from 'tesseract.js';
import { RaidMember, RaidClass, CustomClassColors, RaidParty } from '../types';
import { RAID_CLASSES, CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';

export interface ParsedRaidData {
  titlePrefix: string;
  scheduleTime: string;
  bossName: string;
  members: RaidMember[];
  parties: RaidParty[];
  previewUrl: string;
}

export interface ParseProgress {
  status: string;
  progress: number; // 0 to 1
}

// Convert hex color (#RRGGBB) to { r, g, b }
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16) || 0,
    g: parseInt(clean.substring(2, 4), 16) || 0,
    b: parseInt(clean.substring(4, 6), 16) || 0,
  };
}

// Calculate color distance in RGB space
function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) * 2 +
    Math.pow(c1.g - c2.g, 2) * 4 +
    Math.pow(c1.b - c2.b, 2) * 3
  );
}

/**
 * Determine the closest RaidClass based on a sampled RGB color
 */
export function matchClassByColor(
  rgb: { r: number; g: number; b: number },
  customColors?: CustomClassColors
): { className: RaidClass; distance: number } {
  let closestClass: RaidClass = 'Trống';
  let minDistance = Infinity;

  CLASS_LIST.forEach((cls) => {
    const meta = getEffectiveClassMeta(cls, customColors);
    const targetRgb = hexToRgb(meta.bgColor);
    const dist = colorDistance(rgb, targetRgb);
    if (dist < minDistance) {
      minDistance = dist;
      closestClass = cls;
    }
  });

  return { className: closestClass, distance: minDistance };
}

/**
 * Clean OCR text by removing noise, placeholders, and excess spaces
 */
export function cleanOcrText(raw: string, isLoggedBy = false): string {
  if (!raw) return '';
  let str = raw.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');

  // Common OCR artifacts / placeholder strings
  const lower = str.toLowerCase();
  if (
    lower === 'ingame...' ||
    lower === 'ingame' ||
    lower === 'log by...' ||
    lower === 'log by' ||
    lower === 'logby...' ||
    lower === 'logby' ||
    lower === '---' ||
    lower === '...' ||
    lower === '..' ||
    lower === '.'
  ) {
    return '';
  }

  // Remove leading numbers or punctuation if accidentally grabbed from STT
  str = str.replace(/^[:;|\-_.~, ]+/, '').replace(/[:;|\-_.~, ]+$/, '');
  return str.trim();
}

/**
 * Main function: Clone/Parse Raid Data from an uploaded image file or blob
 */
export async function parseRaidImage(
  imageSource: File | Blob | string,
  options?: {
    customColors?: CustomClassColors;
    onProgress?: (p: ParseProgress) => void;
  }
): Promise<ParsedRaidData> {
  const { customColors, onProgress } = options || {};

  const notify = (status: string, progress: number) => {
    if (onProgress) onProgress({ status, progress });
  };

  notify('Đang tải ảnh và chuẩn bị bộ giải mã...', 0.05);

  // 1. Load image into an HTMLImageElement
  const img = new Image();
  img.crossOrigin = 'anonymous';

  let previewUrl = '';
  if (typeof imageSource === 'string') {
    img.src = imageSource;
    previewUrl = imageSource;
  } else {
    previewUrl = URL.createObjectURL(imageSource);
    img.src = previewUrl;
  }

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Không thể đọc dữ liệu file ảnh'));
  });

  notify('Đang phân tích bố cục khung bảng Raid...', 0.15);

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  // Offscreen canvas for pixel reading and image slicing
  const canvas = document.createElement('canvas');
  canvas.width = naturalWidth;
  canvas.height = naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Không thể tạo canvas context');

  ctx.drawImage(img, 0, 0);

  // 2. Relative layout coordinates matching the Raid Table export framework
  // Expected Logical Dimensions:
  // Banner: 0% to ~9.5%
  // Header: ~9.5% to ~16.5%
  // Rows: ~16.5% to ~98% (12 member rows)
  // Columns:
  // STT: 0% -> 12%
  // Ingame: 12% -> 43.5%
  // Class: 43.5% -> 71%
  // Logged by: 71% -> 100%

  const bannerHeightRatio = 52 / (52 + 40 + 12 * 42); // ~0.087
  const headerHeightRatio = 40 / (52 + 40 + 12 * 42); // ~0.067
  const rowsStartRatio = bannerHeightRatio + headerHeightRatio; // ~0.154
  const rowHeightRatio = 42 / (52 + 40 + 12 * 42); // ~0.070

  const colRatios = {
    stt: { left: 0, right: 0.12 },
    ingame: { left: 0.12, right: 0.435 },
    class: { left: 0.435, right: 0.71 },
    loggedBy: { left: 0.71, right: 1.0 },
  };

  // 3. Initialize Tesseract Worker
  notify('Khởi động mô hình nhận diện ký tự quang học (OCR)...', 0.25);
  let worker: any = null;
  try {
    worker = await createWorker('vie+eng');
  } catch (err) {
    console.warn('Cannot load vie+eng OCR, falling back to eng:', err);
    try {
      worker = await createWorker('eng');
    } catch (e) {
      console.error('Failed to init Tesseract worker:', e);
    }
  }

  // Helper to crop a sub-region to a data URL for OCR
  const cropToDataUrl = (x: number, y: number, w: number, h: number): string => {
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, Math.round(w));
    cropCanvas.height = Math.max(1, Math.round(h));
    const cropCtx = cropCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(
        canvas,
        Math.round(x),
        Math.round(y),
        Math.round(w),
        Math.round(h),
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );
    }
    return cropCanvas.toDataURL('image/png');
  };

  // 4. OCR Banner (Title, Schedule, Boss)
  notify('Đang nhận diện tiêu đề Raid, giờ đi và Boss...', 0.35);

  let detectedTitlePrefix = 'RAID 1';
  let detectedScheduleTime = 'MON 20:30';
  let detectedBossName = 'NIÊN DU';

  try {
    if (worker) {
      const bannerUrl = cropToDataUrl(
        0,
        0,
        naturalWidth,
        naturalHeight * (bannerHeightRatio + 0.02)
      );
      const bannerRes = await worker.recognize(bannerUrl);
      const bannerText = (bannerRes.data.text || '').trim();

      if (bannerText) {
        // Match Prefix: e.g. "RAID 1", "RAID 2", "RAID B", "BẢNG 1"
        const prefixMatch = bannerText.match(/(?:RAID|BẢNG|BANG)\s*([0-9A-Z]+)/i);
        if (prefixMatch) {
          detectedTitlePrefix = `RAID ${prefixMatch[1].toUpperCase()}`;
        }

        // Match Schedule: e.g. "MON 20:30", "THU 20:30", "T2 20:30"
        const scheduleMatch = bannerText.match(
          /(MON|TUE|WED|THU|FRI|SAT|SUN|THỨ [2-7]|CN|[2-7])\s*([0-2]?[0-9]:[0-5][0-9])/i
        );
        if (scheduleMatch) {
          detectedScheduleTime = `${scheduleMatch[1].toUpperCase()} ${scheduleMatch[2]}`;
        }

        // Match Boss
        if (/NIÊN\s*DU/i.test(bannerText)) {
          detectedBossName = 'NIÊN DU';
        } else if (/THƯỢNG\s*TRẦN/i.test(bannerText)) {
          detectedBossName = 'THƯỢNG TRẦN';
        } else if (/VÂN\s*TIÊU/i.test(bannerText)) {
          detectedBossName = 'VÂN TIÊU';
        }
      }
    }
  } catch (err) {
    console.warn('Error reading banner OCR:', err);
  }

  // 5. Read 12 Member Rows
  const members: RaidMember[] = [];
  const totalSlots = 12;

  for (let i = 0; i < totalSlots; i++) {
    const rowProgress = 0.4 + (i / totalSlots) * 0.55;
    notify(`Đang phân tích vị trí #${i + 1} (${i < 6 ? 'PT 1' : 'PT 2'})...`, rowProgress);

    const rowY = naturalHeight * (rowsStartRatio + i * rowHeightRatio);
    const rowH = naturalHeight * rowHeightRatio;

    // A. Detect Class by Background Color sampling
    const classX = naturalWidth * colRatios.class.left;
    const classW = naturalWidth * (colRatios.class.right - colRatios.class.left);

    // Sample median color inside the class badge area (middle 50% to avoid borders and text)
    let bestClass: RaidClass = 'Toái Mộng';
    try {
      const sampleX = Math.round(classX + classW * 0.25);
      const sampleY = Math.round(rowY + rowH * 0.25);
      const sampleW = Math.max(1, Math.round(classW * 0.5));
      const sampleH = Math.max(1, Math.round(rowH * 0.5));

      const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
      const pixels = imgData.data;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let p = 0; p < pixels.length; p += 4) {
        const r = pixels[p];
        const g = pixels[p + 1];
        const b = pixels[p + 2];
        const a = pixels[p + 3];

        // Filter out extreme dark or bright text pixels
        const brightness = (r + g + b) / 3;
        if (a > 150 && brightness > 25 && brightness < 240) {
          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }
      }

      if (count > 0) {
        const avgRgb = {
          r: Math.round(rSum / count),
          g: Math.round(gSum / count),
          b: Math.round(bSum / count),
        };
        const matchResult = matchClassByColor(avgRgb, customColors);
        bestClass = matchResult.className;
      }
    } catch (err) {
      console.warn(`Error sampling color for row ${i + 1}:`, err);
    }

    // B. OCR Ingame Name
    let ingameName = '';
    const ingameX = naturalWidth * colRatios.ingame.left;
    const ingameW = naturalWidth * (colRatios.ingame.right - colRatios.ingame.left);

    if (worker) {
      try {
        const ingameDataUrl = cropToDataUrl(
          ingameX + ingameW * 0.05,
          rowY + rowH * 0.15,
          ingameW * 0.9,
          rowH * 0.7
        );
        const res = await worker.recognize(ingameDataUrl);
        ingameName = cleanOcrText(res.data.text || '');
      } catch (err) {
        console.warn(`Error OCR ingame row ${i + 1}:`, err);
      }
    }

    // C. OCR Logged by
    let loggedByName = '';
    const logX = naturalWidth * colRatios.loggedBy.left;
    const logW = naturalWidth * (colRatios.loggedBy.right - colRatios.loggedBy.left);

    if (worker) {
      try {
        const logDataUrl = cropToDataUrl(
          logX + logW * 0.05,
          rowY + rowH * 0.15,
          logW * 0.9,
          rowH * 0.7
        );
        const res = await worker.recognize(logDataUrl);
        loggedByName = cleanOcrText(res.data.text || '', true);
      } catch (err) {
        console.warn(`Error OCR loggedBy row ${i + 1}:`, err);
      }
    }

    const party = i < 6 ? 1 : 2;
    members.push({
      id: `clone_m_${Date.now()}_${i + 1}_${Math.random().toString(36).substring(2, 6)}`,
      stt: i + 1,
      ingame: ingameName,
      className: bestClass,
      loggedBy: loggedByName,
      party,
    });
  }

  // Terminate Tesseract worker to free memory
  if (worker) {
    try {
      await worker.terminate();
    } catch {}
  }

  notify('Hoàn tất nhận diện bảng Raid!', 1.0);

  return {
    titlePrefix: detectedTitlePrefix,
    scheduleTime: detectedScheduleTime,
    bossName: detectedBossName,
    members,
    parties: [
      { id: 1, name: 'PT 1' },
      { id: 2, name: 'PT 2' },
    ],
    previewUrl,
  };
}
