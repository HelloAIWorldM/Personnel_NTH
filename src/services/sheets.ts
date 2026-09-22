import { RAID_CLASSES, getEffectiveClassMeta } from '../constants/classes';
import { CustomClassColors, RaidClass, RaidMember } from '../types';

export interface CreateSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export async function createRaidSpreadsheet(
  accessToken: string,
  raidTitle: string,
  members: RaidMember[],
  customColors?: CustomClassColors
): Promise<CreateSheetResult> {
  const fullTitle = raidTitle.trim() || 'RAID 1 - MON 20:30 NIÊN DU';

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Bảng Nhân Sự - ${fullTitle}`,
      },
      sheets: [
        {
          properties: {
            title: 'Danh Sách Raid',
            gridProperties: {
              rowCount: Math.max(members.length + 10, 30),
              columnCount: 6,
              frozenRowCount: 2,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Không thể tạo Google Sheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const sheetId = sheetData.sheets?.[0]?.properties?.sheetId ?? 0;

  // 2. Prepare Cell Data with Values and Styles (batchUpdate)
  const rowsPayload: any[] = [];

  // Row 0: Title Banner "RAID 1 - MON 20:30 NIÊN DU"
  rowsPayload.push({
    values: [
      {
        userEnteredValue: { stringValue: fullTitle },
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: {
            fontSize: 14,
            bold: true,
            foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 },
          },
        },
      },
      {},
      {},
      {},
    ],
  });

  // Row 1: Header Row: STT | Ingame | Class | Logged by
  rowsPayload.push({
    values: [
      {
        userEnteredValue: { stringValue: 'STT' },
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { bold: true, fontSize: 11 },
          backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
        },
      },
      {
        userEnteredValue: { stringValue: 'Ingame' },
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { bold: true, fontSize: 11 },
          backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
        },
      },
      {
        userEnteredValue: { stringValue: 'Class' },
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { bold: true, fontSize: 11 },
          backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
        },
      },
      {
        userEnteredValue: { stringValue: 'Logged by' },
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { bold: true, fontSize: 11 },
          backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
        },
      },
    ],
  });

  // Data rows
  for (const m of members) {
    const classMeta = getEffectiveClassMeta(m.className, customColors);
    const isTextWhite = classMeta.textColor === '#FFFFFF';

    rowsPayload.push({
      values: [
        {
          userEnteredValue: { numberValue: m.stt },
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            textFormat: { bold: true, fontSize: 11 },
          },
        },
        {
          userEnteredValue: { stringValue: m.ingame },
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            textFormat: { fontSize: 11 },
          },
        },
        {
          userEnteredValue: { stringValue: m.className },
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            backgroundColor: {
              red: classMeta.rgb.r,
              green: classMeta.rgb.g,
              blue: classMeta.rgb.b,
            },
            textFormat: {
              bold: true,
              fontSize: 11,
              foregroundColor: isTextWhite
                ? { red: 1, green: 1, blue: 1 }
                : { red: 0, green: 0, blue: 0 },
            },
          },
        },
        {
          userEnteredValue: { stringValue: m.loggedBy || m.ingame },
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            textFormat: { fontSize: 11 },
          },
        },
      ],
    });
  }

  // 3. Batch Update for Data, Borders, Merging & Column Widths
  const requests: any[] = [
    // Update Cells
    {
      updateCells: {
        range: {
          sheetId: sheetId,
          startRowIndex: 0,
          endRowIndex: members.length + 2,
          startColumnIndex: 0,
          endColumnIndex: 4,
        },
        rows: rowsPayload,
        fields: 'userEnteredValue,userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,backgroundColor)',
      },
    },
    // Merge Title row A1:D1
    {
      mergeCells: {
        range: {
          sheetId: sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 4,
        },
        mergeType: 'MERGE_ALL',
      },
    },
    // Set Crisp Borders for all table cells
    {
      updateBorders: {
        range: {
          sheetId: sheetId,
          startRowIndex: 0,
          endRowIndex: members.length + 2,
          startColumnIndex: 0,
          endColumnIndex: 4,
        },
        top: { style: 'SOLID', width: 1, color: { red: 0.1, green: 0.1, blue: 0.1 } },
        bottom: { style: 'SOLID', width: 1, color: { red: 0.1, green: 0.1, blue: 0.1 } },
        left: { style: 'SOLID', width: 1, color: { red: 0.1, green: 0.1, blue: 0.1 } },
        right: { style: 'SOLID', width: 1, color: { red: 0.1, green: 0.1, blue: 0.1 } },
        innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.2, green: 0.2, blue: 0.2 } },
        innerVertical: { style: 'SOLID', width: 1, color: { red: 0.2, green: 0.2, blue: 0.2 } },
      },
    },
    // Resize column widths
    {
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 70 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: 1,
          endIndex: 2,
        },
        properties: { pixelSize: 180 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: 2,
          endIndex: 3,
        },
        properties: { pixelSize: 150 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: 3,
          endIndex: 4,
        },
        properties: { pixelSize: 180 },
        fields: 'pixelSize',
      },
    },
    // Set row height for title
    {
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'ROWS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 46 },
        fields: 'pixelSize',
      },
    },
    // Set row height for header
    {
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'ROWS',
          startIndex: 1,
          endIndex: members.length + 2,
        },
        properties: { pixelSize: 38 },
        fields: 'pixelSize',
      },
    },
  ];

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!batchRes.ok) {
    console.warn('Batch update formatting warning:', await batchRes.text());
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

export async function readSpreadsheetRaid(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title?: string; members: RaidMember[] }> {
  const cleanId = spreadsheetId.trim().replace(/[^a-zA-Z0-9-_]/g, '');
  if (!cleanId) {
    throw new Error('Mã Google Sheet (Spreadsheet ID) không hợp lệ.');
  }

  // First fetch spreadsheet metadata to get sheet name
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json();
    throw new Error(err.error?.message || 'Không thể đọc thông tin Google Sheet');
  }

  const metaData = await metaRes.json();
  const sheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

  // Read values
  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(sheetTitle)}!A1:D50`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!valuesRes.ok) {
    const err = await valuesRes.json();
    throw new Error(err.error?.message || 'Không thể đọc dữ liệu Google Sheet');
  }

  const valuesData = await valuesRes.json();
  const rows: string[][] = valuesData.values || [];

  if (rows.length === 0) {
    throw new Error('Google Sheet chưa có dữ liệu');
  }

  let raidTitle = metaData.properties?.title || 'RAID 1';
  let startIndex = 0;

  // Check if first row is title
  if (rows[0] && rows[0].length >= 1 && (!rows[0][1] || rows[0][0].toLowerCase().includes('raid'))) {
    raidTitle = rows[0][0];
    startIndex = 1;
  }

  // Check if next row is header
  if (
    rows[startIndex] &&
    rows[startIndex][0] &&
    (rows[startIndex][0].toLowerCase().includes('stt') || rows[startIndex][1]?.toLowerCase().includes('ingame'))
  ) {
    startIndex += 1;
  }

  const importedMembers: RaidMember[] = [];
  let currentStt = 1;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const ingame = (row[1] || '').trim();
    if (!ingame && !row[2]) continue;

    const rawClass = (row[2] || '').trim();
    // Match to known classes
    const matchedClass = matchClass(rawClass);
    const loggedBy = (row[3] || ingame).trim();

    importedMembers.push({
      id: 'import_' + Date.now() + '_' + i,
      stt: currentStt++,
      ingame: ingame || `Thành viên ${currentStt - 1}`,
      className: matchedClass,
      loggedBy: loggedBy || ingame,
    });
  }

  return {
    title: raidTitle,
    members: importedMembers,
  };
}

function matchClass(input: string): RaidClass {
  const norm = input.toLowerCase().trim();
  if (norm.includes('huyết hà') || norm === 'hh') return 'Huyết Hà';
  if (norm.includes('thiết y') || norm === 'ty') return 'Thiết Y';
  if (norm.includes('thương lan') || norm === 'tl') return 'Thương Lan';
  if (norm.includes('toái mộng') || norm === 'tm') return 'Toái Mộng';
  if (norm.includes('thần tương') || norm === 'tt') return 'Thần Tương';
  if (norm.includes('cửu linh') || norm === 'cl') return 'Cửu Linh';
  if (norm.includes('long ngâm') || norm === 'ln') return 'Long Ngâm';
  if (norm.includes('thiên vấn') || norm === 'thv') return 'Thiên Vấn';
  if (norm.includes('tố vấn') || norm === 'tv') return 'Tố Vấn';
  if (norm.includes('triều quang') || norm === 'tq') return 'Triều Quang';
  if (norm.includes('huyền cơ') || norm === 'hc') return 'Huyền Cơ';
  return 'Toái Mộng';
}
