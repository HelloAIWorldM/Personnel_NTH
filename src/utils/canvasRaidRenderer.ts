import { RaidMember, CustomClassColors, RaidParty, GuildMember, GuildTeam } from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
import { PrivacyMode, maskSensitiveText } from './security';

export interface RenderOptions {
  raidTitle: string;
  members: RaidMember[];
  customColors?: CustomClassColors;
  isDark?: boolean;
  privacyMode?: PrivacyMode;
  titlePrefix?: string;
  scheduleTime?: string;
  bossName?: string;
  parties?: RaidParty[];
  showPartyDividers?: boolean;
}

export function drawRaidTableToCanvas({
  raidTitle,
  members,
  customColors,
  isDark = false,
  privacyMode = 'NONE',
  titlePrefix,
  scheduleTime,
  bossName,
  parties,
  showPartyDividers = false,
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
  const dividerHeight = 30;

  // Check how many party dividers to draw
  const hasParties = Boolean(parties && parties.length > 1);
  const shouldRenderDividers = showPartyDividers && hasParties;
  let dividerCount = 0;

  if (shouldRenderDividers) {
    for (let i = 0; i < members.length; i++) {
      const curParty = members[i].party || 1;
      const prevParty = i > 0 ? members[i - 1].party || 1 : null;
      if (i === 0 || curParty !== prevParty) {
        dividerCount++;
      }
    }
  }

  const totalHeight = Math.max(
    bannerHeight + headerHeight + 50,
    bannerHeight + headerHeight + members.length * rowHeight + dividerCount * dividerHeight
  );

  // Hi-DPI Retina scale factor (2x) for razor-sharp rendering
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
  ctx.font = "bold 20px 'Lexend', system-ui, -apple-system, sans-serif";
  ctx.textBaseline = 'middle';

  const titleY = bannerHeight / 2;

  // Resolve prefix, schedule and boss name
  let prefix = titlePrefix;
  let schedule = scheduleTime;
  let boss = bossName;

  if (!prefix && !schedule && !boss) {
    const titleParts = raidTitle.split(' - ');
    if (titleParts.length >= 2) {
      prefix = titleParts[0].trim();
      const rest = titleParts.slice(1).join(' - ').trim();
      const restTokens = rest.split(' ');
      schedule = restTokens[0] || '';
      boss = restTokens.slice(1).join(' ') || '';
    } else {
      prefix = raidTitle.trim();
      schedule = '';
      boss = '';
    }
  }

  if (schedule || boss) {
    const pfxText = prefix ? `${prefix.toUpperCase()} - ` : '';
    const schText = schedule ? schedule.toUpperCase() : '';
    const bossText = boss ? ` ${boss.toUpperCase()}` : '';

    const pfxWidth = ctx.measureText(pfxText).width;
    const schWidth = ctx.measureText(schText).width;
    const bossWidth = ctx.measureText(bossText).width;
    const totalTitleWidth = pfxWidth + schWidth + bossWidth;

    let startX = (width - totalTitleWidth) / 2;

    // Draw prefix
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.fillText(pfxText, startX, titleY);
    startX += pfxWidth;

    // Draw schedule (vibrant red #e50000)
    ctx.fillStyle = '#e50000';
    ctx.fillText(schText, startX, titleY);
    startX += schWidth;

    // Draw boss name
    ctx.fillStyle = textColor;
    ctx.fillText(bossText, startX, titleY);
  } else {
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText((prefix || raidTitle).toUpperCase(), width / 2, titleY);
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
  ctx.font = "bold 15px 'Lexend', system-ui, -apple-system, sans-serif";
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

  // 5. Member Rows and Party Dividers
  let curY = bannerHeight + headerHeight;

  members.forEach((member, idx) => {
    const currentPartyId = member.party || 1;
    const prevMember = idx > 0 ? members[idx - 1] : null;
    const prevPartyId = prevMember ? prevMember.party || 1 : null;
    const isPartyStart = idx === 0 || currentPartyId !== prevPartyId;

    // Draw Party Divider if enabled
    if (shouldRenderDividers && isPartyStart) {
      const partyObj = parties?.find((p) => p.id === currentPartyId) || {
        id: currentPartyId,
        name: `PT ${currentPartyId}`,
      };

      const partyMems = members.filter((m) => (m.party || 1) === currentPartyId);
      let pTanks = 0;
      let pHealers = 0;
      let pDps = 0;

      partyMems.forEach((m) => {
        const meta = getEffectiveClassMeta(m.className, customColors);
        if (meta.role === 'Tank') pTanks++;
        else if (meta.role === 'Healer') pHealers++;
        else pDps++;
      });

      // Divider background
      ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
      ctx.fillRect(0, curY, width, dividerHeight);

      // Divider text (Party Name)
      ctx.font = "bold 13px 'Lexend', system-ui, sans-serif";
      ctx.fillStyle = isDark ? '#93c5fd' : '#1e3a8a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const divMidY = curY + dividerHeight / 2;
      ctx.fillText(`🛡️ ${partyObj.name.toUpperCase()}`, 14, divMidY);

      // Party stats on the right
      ctx.font = "bold 12px 'Lexend', system-ui, sans-serif";
      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${pTanks} Tank  ${pHealers} Healer  ${pDps} DPS (${partyMems.length} người)`,
        width - 14,
        divMidY
      );

      // Divider bottom line
      ctx.strokeStyle = borderColor;
      ctx.beginPath();
      ctx.moveTo(0, curY + dividerHeight);
      ctx.lineTo(width, curY + dividerHeight);
      ctx.stroke();

      curY += dividerHeight;
    }

    const rowY = curY;
    const midY = rowY + rowHeight / 2;
    const meta = getEffectiveClassMeta(member.className, customColors);

    // Column 0: STT
    ctx.font = "bold 15px 'Lexend', system-ui, sans-serif";
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
    ctx.font = "bold 15px 'Lexend', system-ui, sans-serif";
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

export interface GuildTeamsRenderOptions {
  members: GuildMember[];
  customColors?: CustomClassColors;
  isDark?: boolean;
}

export function drawGuildTeamsToCanvas({
  members,
  customColors,
  isDark = true,
}: GuildTeamsRenderOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  const TEAMS = [
    { id: 'Cơ động' as GuildTeam, title: 'TEAM FLEX' },
    { id: 'Mid' as GuildTeam, title: 'TEAM MID' },
    { id: 'Đẩy trụ' as GuildTeam, title: 'TEAM ĐẨY TRỤ' },
  ];

  // Grid builder
  const getGrid = (teamId: GuildTeam) => {
    const teamMems = members.filter((m) => m.team === teamId);
    const grid: Record<number, Record<number, GuildMember | null>> = {
      1: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    };
    teamMems.forEach((m) => {
      if (
        m.party &&
        m.slot &&
        m.party >= 1 &&
        m.party <= 4 &&
        m.slot >= 1 &&
        m.slot <= 6 &&
        grid[m.party][m.slot] === null
      ) {
        grid[m.party][m.slot] = m;
      }
    });
    return grid;
  };

  // Dimensions
  const teamColWidth = 140;
  const nameColWidth = 160;
  const classColWidth = 150;
  const ptWidth = nameColWidth + classColWidth; // 310
  const width = teamColWidth + ptWidth * 4; // 1380
  const bannerHeight = 44;
  const headerHeight = 36;
  const rowHeight = 40;
  const teamHeight = headerHeight + 6 * rowHeight; // 36 + 240 = 276
  const totalHeight = bannerHeight + TEAMS.length * teamHeight; // 44 + 828 = 872

  const scale = 2;
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${totalHeight}px`;
  ctx.scale(scale, scale);

  // Theme colors matching dark/light mode
  const bgColor = isDark ? '#0b1329' : '#ffffff';
  const cardBg = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';
  const emptyTextColor = isDark ? '#475569' : '#94a3b8';
  const borderColor = isDark ? '#334155' : '#cbd5e1';
  const darkBorder = isDark ? '#475569' : '#1e293b';
  const headerBg = isDark ? '#1e293b' : '#f1f5f9';

  // 1. Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, totalHeight);

  // 2. Outer Border (2px)
  ctx.strokeStyle = darkBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, totalHeight - 2);

  // 3. Top Banner: BANG CHIẾN
  ctx.fillStyle = cardBg;
  ctx.fillRect(2, 2, width - 4, bannerHeight - 2);

  ctx.font = "900 18px 'Lexend', system-ui, sans-serif";
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BANG CHIẾN', width / 2, bannerHeight / 2);

  // Banner bottom line (2px)
  ctx.strokeStyle = darkBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, bannerHeight);
  ctx.lineTo(width, bannerHeight);
  ctx.stroke();

  let curY = bannerHeight;

  TEAMS.forEach((team, teamIdx) => {
    const grid = getGrid(team.id);
    let placedCount = 0;
    for (let p = 1; p <= 4; p++) {
      for (let s = 1; s <= 6; s++) {
        if (grid[p][s]) placedCount++;
      }
    }

    // PT Header Row
    ctx.fillStyle = headerBg;
    ctx.fillRect(0, curY, width, headerHeight);

    // Left empty cell border
    ctx.strokeStyle = darkBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(teamColWidth, curY);
    ctx.lineTo(teamColWidth, curY + headerHeight);
    ctx.stroke();

    // 4 PT Headers
    for (let p = 1; p <= 4; p++) {
      const ptStartX = teamColWidth + (p - 1) * ptWidth;
      ctx.font = "bold 13px 'Lexend', system-ui, sans-serif";
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PT-${p}`, ptStartX + ptWidth / 2, curY + headerHeight / 2);

      if (p < 4) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ptStartX + ptWidth, curY);
        ctx.lineTo(ptStartX + ptWidth, curY + headerHeight);
        ctx.stroke();
      }
    }

    // Header bottom line
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, curY + headerHeight);
    ctx.lineTo(width, curY + headerHeight);
    ctx.stroke();

    curY += headerHeight;

    // 6 Slot Rows
    const slotsStartY = curY;

    // Draw Left Team Box (spanning 6 rows)
    const teamBoxHeight = 6 * rowHeight;
    ctx.fillStyle = cardBg;
    ctx.fillRect(1, slotsStartY, teamColWidth - 1, teamBoxHeight);

    ctx.font = "900 14px 'Lexend', system-ui, sans-serif";
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(team.title, teamColWidth / 2, slotsStartY + teamBoxHeight / 2 - 10);

    ctx.font = "bold 11px 'Lexend', system-ui, sans-serif";
    ctx.fillStyle = subTextColor;
    ctx.fillText(`(${placedCount}/24)`, teamColWidth / 2, slotsStartY + teamBoxHeight / 2 + 12);

    // Left team box right vertical border (2px)
    ctx.strokeStyle = darkBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(teamColWidth, slotsStartY);
    ctx.lineTo(teamColWidth, slotsStartY + teamBoxHeight);
    ctx.stroke();

    // Render each slot row
    for (let s = 1; s <= 6; s++) {
      const rowY = curY;
      const midY = rowY + rowHeight / 2;

      for (let p = 1; p <= 4; p++) {
        const mem = grid[p][s];
        const ptStartX = teamColWidth + (p - 1) * ptWidth;
        const nameStartX = ptStartX;
        const classStartX = ptStartX + nameColWidth;

        // Subcolumn 1: Member Name
        if (mem && mem.ingame) {
          ctx.font = "bold 13px 'Lexend', system-ui, sans-serif";
          ctx.fillStyle = textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(mem.ingame, nameStartX + nameColWidth / 2, midY);
        } else {
          ctx.font = "italic 11px 'Lexend', system-ui, sans-serif";
          ctx.fillStyle = emptyTextColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('(Trống)', nameStartX + nameColWidth / 2, midY);
        }

        // Subcolumn 1 right border (internal to PT)
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(classStartX, rowY);
        ctx.lineTo(classStartX, rowY + rowHeight);
        ctx.stroke();

        // Subcolumn 2: Class Badge
        if (mem && mem.className) {
          const meta = getEffectiveClassMeta(mem.className, customColors);
          const pillW = 104;
          const pillH = 26;
          const pillX = classStartX + (classColWidth - pillW) / 2;
          const pillY = midY - pillH / 2;

          // Draw rounded pill
          ctx.fillStyle = meta.bgColor;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(0,0,0,0.18)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Pill text
          ctx.font = "bold 12px 'Lexend', system-ui, sans-serif";
          ctx.fillStyle = meta.textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(meta.name, pillX + pillW / 2, midY);
        }

        // PT right divider (2px between parties, except the very right edge)
        if (p < 4) {
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ptStartX + ptWidth, rowY);
          ctx.lineTo(ptStartX + ptWidth, rowY + rowHeight);
          ctx.stroke();
        }
      }

      // Row bottom border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(teamColWidth, rowY + rowHeight);
      ctx.lineTo(width, rowY + rowHeight);
      ctx.stroke();

      curY += rowHeight;
    }

    // Divider between teams (2px dark border)
    if (teamIdx < TEAMS.length - 1) {
      ctx.strokeStyle = darkBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(width, curY);
      ctx.stroke();
    }
  });

  return canvas;
}
