import { RaidMember, CustomClassColors } from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
import { PrivacyMode, maskSensitiveText } from './security';

interface RenderOptions {
  raidTitle: string;
  members: RaidMember[];
  customColors?: CustomClassColors;
  isDark?: boolean;
  privacyMode?: PrivacyMode;
}

export function drawRaidTableToCanvas({
  raidTitle,
  members,
  customColors,
  isDark = false,
  privacyMode = 'NONE',
}: RenderOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // Base dimensions (logical pixels)
  const width = 640;
  const bannerHeight = 52;
  const headerHeight = 40;
  const rowHeight = 42;
  const totalHeight = bannerHeight + headerHeight + members.length * rowHeight;

  // Hi-DPI Retina scale factor (2x)
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${totalHeight}px`;

  ctx.scale(scale, scale);

  // Theme colors
  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#000000';
  const borderColor = isDark ? '#334155' : '#000000';
  const headerBgColor = isDark ? '#1e293b' : '#f8fafc';

  // 1. Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, totalHeight);

  // 2. Draw outer border (2px)
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, totalHeight - 2);

  // 3. Banner Title (e.g. "RAID 1 - MON 20:30 NIÊN DU")
  ctx.font = "bold 20px 'Be Vietnam Pro', system-ui, -apple-system, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Parse title into parts if available: "PREFIX - SCHEDULE BOSS"
  const titleY = bannerHeight / 2;
  const titleParts = raidTitle.split(' - ');
  if (titleParts.length >= 2) {
    const prefix = `${titleParts[0].trim()} - `;
    const rest = titleParts.slice(1).join(' - ').trim();
    const restTokens = rest.split(' ');
    const schedule = restTokens[0] || '';
    const boss = restTokens.slice(1).join(' ');

    const fullMeasure = ctx.measureText(`${prefix}${schedule} ${boss}`).width;
    let startX = (width - fullMeasure) / 2;

    // Draw prefix
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.fillText(prefix, startX, titleY);
    startX += ctx.measureText(prefix).width;

    // Draw schedule (in vibrant red #e50000)
    ctx.fillStyle = '#e50000';
    ctx.fillText(schedule, startX, titleY);
    startX += ctx.measureText(schedule).width;

    // Draw boss name
    ctx.fillStyle = textColor;
    ctx.fillText(` ${boss}`, startX, titleY);
  } else {
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(raidTitle.toUpperCase(), width / 2, titleY);
  }

  // Divider under Banner
  ctx.beginPath();
  ctx.moveTo(0, bannerHeight);
  ctx.lineTo(width, bannerHeight);
  ctx.stroke();

  // 4. Column definitions
  // Total width: 640px. Columns: STT (75px), Ingame (200px), Class (175px), Logged by (190px)
  const cols = [
    { label: 'STT', width: 75 },
    { label: 'Ingame', width: 200 },
    { label: 'Class', width: 175 },
    { label: 'Logged by', width: 190 },
  ];

  // Header row background
  ctx.fillStyle = headerBgColor;
  ctx.fillRect(1, bannerHeight + 1, width - 2, headerHeight - 1);

  // Header text & vertical borders
  ctx.fillStyle = textColor;
  ctx.font = "bold 15px 'Be Vietnam Pro', system-ui, -apple-system, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let curX = 0;
  cols.forEach((col, idx) => {
    const colCenterX = curX + col.width / 2;
    ctx.fillText(col.label, colCenterX, bannerHeight + headerHeight / 2);

    curX += col.width;
    if (idx < cols.length - 1) {
      ctx.beginPath();
      ctx.moveTo(curX, bannerHeight);
      ctx.lineTo(curX, bannerHeight + headerHeight);
      ctx.stroke();
    }
  });

  // Divider under Header
  ctx.beginPath();
  ctx.moveTo(0, bannerHeight + headerHeight);
  ctx.lineTo(width, bannerHeight + headerHeight);
  ctx.stroke();

  // 5. Member Rows
  let curY = bannerHeight + headerHeight;

  members.forEach((member) => {
    const rowY = curY;
    const midY = rowY + rowHeight / 2;
    const meta = getEffectiveClassMeta(member.className, customColors);

    // Column 0: STT
    ctx.font = "bold 15px 'Be Vietnam Pro', system-ui, sans-serif";
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(member.stt), cols[0].width / 2, midY);

    // Column 1: Ingame
    let ingameText = member.ingame || '';
    if (privacyMode !== 'NONE' && ingameText) {
      ingameText = maskSensitiveText(ingameText, privacyMode);
    }
    ctx.fillText(ingameText, cols[0].width + cols[1].width / 2, midY);

    // Column 2: Class (with full background fill)
    const classStartX = cols[0].width + cols[1].width;
    const classWidth = cols[2].width;
    ctx.fillStyle = meta.bgColor;
    ctx.fillRect(classStartX, rowY, classWidth, rowHeight);

    ctx.fillStyle = meta.textColor;
    ctx.font = "bold 15px 'Be Vietnam Pro', system-ui, sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(meta.name, classStartX + classWidth / 2, midY);

    // Column 3: Logged by
    let loggedText = member.loggedBy || '';
    if (privacyMode !== 'NONE' && loggedText) {
      loggedText = maskSensitiveText(loggedText, privacyMode);
    }
    const loggedStartX = classStartX + classWidth;
    ctx.fillStyle = textColor;
    ctx.fillText(loggedText, loggedStartX + cols[3].width / 2, midY);

    // Vertical column dividers for this row
    let xLine = cols[0].width;
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.moveTo(xLine, rowY);
    ctx.lineTo(xLine, rowY + rowHeight);
    ctx.stroke();

    xLine += cols[1].width;
    ctx.beginPath();
    ctx.moveTo(xLine, rowY);
    ctx.lineTo(xLine, rowY + rowHeight);
    ctx.stroke();

    xLine += cols[2].width;
    ctx.beginPath();
    ctx.moveTo(xLine, rowY);
    ctx.lineTo(xLine, rowY + rowHeight);
    ctx.stroke();

    // Horizontal bottom divider
    ctx.beginPath();
    ctx.moveTo(0, rowY + rowHeight);
    ctx.lineTo(width, rowY + rowHeight);
    ctx.stroke();

    curY += rowHeight;
  });

  return canvas;
}
