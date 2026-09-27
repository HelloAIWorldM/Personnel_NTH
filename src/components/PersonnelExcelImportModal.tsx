import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { PersonnelMember, RaidClass, CustomClassColors } from '../types';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { normalizeName } from '../utils/duplicates';
import {
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  Check,
  AlertCircle,
  X,
  Download,
  Trash2,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';

interface PersonnelExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newMembers: PersonnelMember[], mode: 'APPEND' | 'OVERWRITE') => void;
  existingPersonnel: PersonnelMember[];
  customColors?: CustomClassColors;
}

interface ParsedRow {
  id: string;
  ingame: string;
  className: RaidClass;
  loggedBy: string;
  isValid: boolean;
  error?: string;
  isExisting: boolean;
}

export const PersonnelExcelImportModal: React.FC<PersonnelExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingPersonnel,
  customColors,
}) => {
  const [importTab, setImportTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'APPEND' | 'OVERWRITE'>('APPEND');
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to match text to a valid RaidClass
  const matchClass = (input: string): RaidClass => {
    if (!input) return 'Toái Mộng';
    const norm = input.trim().toLowerCase();

    // Direct match
    for (const c of CLASS_LIST) {
      if (c.toLowerCase() === norm) return c;
    }

    // Fuzzy & common alias match
    if (norm.includes('cửu') || norm.includes('cuu') || norm.includes('9 linh')) return 'Cửu Linh';
    if (norm.includes('toái') || norm.includes('toai') || norm.includes('tm')) return 'Toái Mộng';
    if (norm.includes('huyết') || norm.includes('huyet') || norm.includes('hh')) return 'Huyết Hà';
    if (norm.includes('thiết') || norm.includes('thiet') || norm.includes('ty')) return 'Thiết Y';
    if (norm.includes('thần') || norm.includes('than') || norm.includes('tt')) return 'Thần Tương';
    if (norm.includes('long') || norm.includes('ngâm') || norm.includes('ln')) return 'Long Ngâm';
    if (norm.includes('tố') || norm.includes('to van') || norm.includes('tv') || norm.includes('buff')) return 'Tố Vấn';
    if (norm.includes('thiên') || norm.includes('thien van') || norm.includes('dps y')) return 'Thiên Vấn';
    if (norm.includes('huyền') || norm.includes('huyen co') || norm.includes('hc')) return 'Huyền Cơ';
    if (norm.includes('triều') || norm.includes('trieu quang') || norm.includes('tq')) return 'Triều Quang';
    if (norm.includes('hồng') || norm.includes('hong am') || norm.includes('ha')) return 'Hồng Âm';
    if (norm.includes('thương') || norm.includes('thuong lan') || norm.includes('tl')) return 'Thương Lan';

    return 'Toái Mộng';
  };

  // Convert raw 2D array of data into parsed rows
  const processRawData = (data: any[][], sourceName: string) => {
    setParseError(null);
    if (!data || data.length === 0) {
      setParseError('Không tìm thấy dữ liệu trong file hoặc văn bản dán.');
      return;
    }

    // Look for header row index
    let headerRowIdx = -1;
    let colIngame = 0;
    let colClass = 1;
    let colLoggedBy = 2;

    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i].map((cell) => String(cell || '').toLowerCase().trim());
      const ingameIdx = row.findIndex(
        (c) => c.includes('ingame') || c.includes('tên') || c.includes('nhân sự') || c.includes('name')
      );
      const classIdx = row.findIndex(
        (c) => c.includes('phái') || c.includes('class') || c.includes('môn phái') || c.includes('hệ')
      );
      const logIdx = row.findIndex(
        (c) => c.includes('log') || c.includes('chủ') || c.includes('người')
      );

      if (ingameIdx !== -1 || classIdx !== -1) {
        headerRowIdx = i;
        if (ingameIdx !== -1) colIngame = ingameIdx;
        if (classIdx !== -1) colClass = classIdx;
        if (logIdx !== -1) colLoggedBy = logIdx;
        break;
      }
    }

    // If no header detected, check if row 0 has STT in col 0
    let startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

    // Check if col 0 has numbers (STT) and col 1 has text (Ingame)
    if (headerRowIdx === -1 && data.length > 0) {
      const firstRow = data[0];
      if (firstRow.length >= 3 && !isNaN(Number(firstRow[0])) && isNaN(Number(firstRow[1]))) {
        colIngame = 1;
        colClass = 2;
        colLoggedBy = firstRow.length > 3 ? 3 : 1;
      }
    }

    const existingNames = new Set(existingPersonnel.map((p) => normalizeName(p.ingame)));
    const rows: ParsedRow[] = [];
    const seenInImport = new Set<string>();

    for (let r = startIdx; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const rawIngame = String(row[colIngame] || '').trim();
      if (!rawIngame || rawIngame.toLowerCase() === 'ingame' || rawIngame.toLowerCase() === 'tên') {
        continue;
      }

      const rawClass = String(row[colClass] || '').trim();
      const matchedClass = matchClass(rawClass);
      const rawLogged = String(row[colLoggedBy] || '').trim() || rawIngame;

      const norm = normalizeName(rawIngame);
      const isDupInFile = seenInImport.has(norm);
      seenInImport.add(norm);

      rows.push({
        id: `import-${Date.now()}-${r}`,
        ingame: rawIngame,
        className: matchedClass,
        loggedBy: rawLogged,
        isValid: !isDupInFile && rawIngame.length > 0,
        error: isDupInFile ? 'Trùng tên trong danh sách nhập' : undefined,
        isExisting: existingNames.has(norm),
      });
    }

    if (rows.length === 0) {
      setParseError('Không trích xuất được dòng nhân sự hợp lệ nào từ dữ liệu.');
      return;
    }

    setParsedRows(rows);
    setFileName(sourceName);
  };

  // Handle Excel file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        processRawData(data, file.name);
      } catch (err) {
        console.error('Lỗi khi đọc file Excel:', err);
        setParseError('Không thể đọc file Excel này. Vui lòng kiểm tra định dạng .xlsx, .xls hoặc .csv');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle Paste from Clipboard / Excel
  const handleParsePasteText = () => {
    if (!pasteText.trim()) {
      setParseError('Vui lòng dán dữ liệu từ bảng tính vào ô bên dưới.');
      return;
    }

    const lines = pasteText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const data: string[][] = lines.map((line) => {
      if (line.includes('\t')) return line.split('\t');
      if (line.includes(',')) return line.split(',');
      if (line.includes('|')) return line.split('|');
      return line.split(/\s{2,}/); // 2 or more spaces
    });

    processRawData(data, 'Dữ liệu dán từ bộ nhớ tạm');
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      ['STT', 'Ingame', 'Class', 'Logged by'],
      [1, 'Tiêu Niên', 'Toái Mộng', 'Tiêu Niên'],
      [2, 'Chiiyaki', 'Tố Vấn', 'Chiiyaki'],
      [3, 'KVK', 'Thiết Y', 'KVK'],
      [4, 'Cửu U Vương', 'Cửu Linh', 'Cửu U Vương'],
      [5, 'Vy Lì', 'Thần Tương', 'Vy Lì'],
      [6, 'ViVy', 'Long Ngâm', 'ViVy'],
      [7, 'Rannn', 'Huyết Hà', 'Rannn'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhan_Su');
    XLSX.writeFile(wb, 'Mau_Nhap_Kho_Nhan_Su.xlsx');
  };

  // Execute Import
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid && r.ingame.trim().length > 0);
    if (validRows.length === 0) return;

    const newPersonnelList: PersonnelMember[] = validRows.map((r, idx) => ({
      id: `p-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      ingame: r.ingame.trim(),
      className: r.className,
      loggedBy: r.loggedBy.trim() || r.ingame.trim(),
      createdAt: Date.now(),
    }));

    onImport(newPersonnelList, importMode);
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 via-teal-50/30 to-white dark:from-slate-850 dark:to-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Nhập Kho Nhân Sự Từ Excel</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  .xlsx / .xls / Copy-Paste
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thêm hàng loạt thành viên vào kho nhân sự nhanh chóng
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Method Selector Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setImportTab('FILE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                importTab === 'FILE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>1. Tải file Excel (.xlsx, .xls)</span>
            </button>

            <button
              type="button"
              onClick={() => setImportTab('PASTE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                importTab === 'PASTE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>2. Dán trực tiếp từ bảng tính</span>
            </button>

            <div className="ml-auto">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg border border-emerald-300 dark:border-emerald-800 transition-colors"
                title="Tải mẫu file Excel chuẩn"
              >
                <Download className="w-3 h-3" />
                <span>Tải file mẫu Excel</span>
              </button>
            </div>
          </div>

          {/* Tab 1: File Upload */}
          {importTab === 'FILE' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-emerald-50/20 dark:bg-emerald-950/20 hover:bg-emerald-50/40 transition-colors group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {fileName ? (
                    <span className="text-emerald-700 dark:text-emerald-300 font-black">
                      Đã chọn: {fileName} (Nhấp để chọn file khác)
                    </span>
                  ) : (
                    'Nhấp vào đây hoặc kéo thả file Excel (.xlsx, .xls, .csv)'
                  )}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                  File có các cột: Ingame, Class (Môn phái), Logged by
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Direct Paste */}
          {importTab === 'PASTE' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                  Sao chép các dòng trong Excel / Google Sheets rồi dán (Ctrl+V) vào ô dưới:
                </span>
                <span className="text-slate-400 text-[11px]">Định dạng: Ingame [Tab] Phái [Tab] Log by</span>
              </div>
              <textarea
                rows={5}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Ví dụ copy từ Excel:\nTiêu Niên\tToái Mộng\tTiêu Niên\nChiiyaki\tTố Vấn\tChiiyaki\nKVK\tThiết Y\tKVK`}
                className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleParsePasteText}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Phân tích dữ liệu vừa dán</span>
              </button>
            </div>
          )}

          {/* Parse Error Notification */}
          {parseError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview Parsed Data */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Xem trước danh sách ({validCount}/{parsedRows.length} hợp lệ)</span>
                </h3>

                {/* Import Mode Options */}
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'APPEND'}
                      onChange={() => setImportMode('APPEND')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Gộp thêm vào kho</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'OVERWRITE'}
                      onChange={() => setImportMode('OVERWRITE')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Ghi đè toàn bộ kho</span>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2 text-center w-12">#</th>
                      <th className="p-2 text-left">Tên Ingame</th>
                      <th className="p-2 text-center w-36">Môn phái</th>
                      <th className="p-2 text-left">Logged by</th>
                      <th className="p-2 text-center w-28">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((row, idx) => {
                      const meta = getEffectiveClassMeta(row.className, customColors);
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            !row.isValid ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900 dark:text-white">
                            {row.ingame}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs inline-block"
                              style={{
                                backgroundColor: meta.bgColor,
                                color: meta.textColor,
                              }}
                            >
                              {row.className}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">
                            {row.loggedBy}
                          </td>
                          <td className="p-2 text-center">
                            {row.isExisting ? (
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                                Đã có trong kho
                              </span>
                            ) : row.isValid ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                Sẵn sàng nạp
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                                {row.error || 'Lỗi'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl transition-colors"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={validCount === 0}
            onClick={handleConfirmImport}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Nạp {validCount} nhân sự vào Kho</span>
          </button>
        </div>
      </div>
    </div>
  );
};
