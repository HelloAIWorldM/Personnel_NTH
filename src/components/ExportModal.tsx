import React, { useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { CustomClassColors, RaidMember } from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
import { PrivacyMode, maskSensitiveText, filterMembersForExport } from '../utils/security';
import {
  Download,
  Copy,
  Check,
  FileText,
  X,
  Share2,
  Table as TableIcon,
  AlertCircle,
  FileSpreadsheet,
  Image as ImageIcon,
  Shield,
  Lock,
  Eye,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
  raidTitle: string;
  members: RaidMember[];
  customColors?: CustomClassColors;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tableRef,
  raidTitle,
  members,
  customColors,
}) => {
  const [copyingImage, setCopyingImage] = useState(false);
  const [copiedImageSuccess, setCopiedImageSuccess] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [downloadImageSuccess, setDownloadImageSuccess] = useState(false);
  const [copiedTextSuccess, setCopiedTextSuccess] = useState(false);
  const [downloadExcelSuccess, setDownloadExcelSuccess] = useState(false);
  const [downloadCsvSuccess, setDownloadCsvSuccess] = useState(false);

  // Privacy & Data Masking Mode ('NONE' = Raw, 'MASK' = Che ký tự, 'HIDE' = Ẩn hẳn)
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('NONE');

  // Fallback preview when iframe prevents direct clipboard write
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showClipboardFallback, setShowClipboardFallback] = useState(false);

  const handlePrivacyModeChange = (mode: PrivacyMode) => {
    setPrivacyMode(mode);
    setPreviewImageUrl(null); // Reset preview so fresh canvas generates with new privacy settings
    setShowClipboardFallback(false);
  };

  if (!isOpen) return null;

  // Format text for Discord / Game chat
  const generateFormattedText = () => {
    const safeMembers = filterMembersForExport(members, privacyMode);
    let text = `⚔️ ${raidTitle.toUpperCase()} ⚔️\n`;
    text += `STT | Ingame | Phái | Logged by | PT\n`;
    text += `------------------------------------\n`;
    safeMembers.forEach((m) => {
      const sttStr = m.stt < 10 ? `0${m.stt}` : `${m.stt}`;
      const ptStr = m.party ? `PT ${m.party}` : '';
      text += `${sttStr}. ${m.ingame || '---'} | ${m.className} | ${m.loggedBy || '---'} | ${ptStr}\n`;
    });
    return text;
  };

  const handleCopyText = async () => {
    const text = generateFormattedText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTextSuccess(true);
      setTimeout(() => setCopiedTextSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to generate canvas using html2canvas-pro (full support for oklch colors & Tailwind v4)
  const generateCanvas = async () => {
    if (!tableRef.current) {
      throw new Error('Bảng Raid chưa sẵn sàng để chụp');
    }

    const originalTable = tableRef.current;
    // Determine darkness based strictly on the table itself, NOT on document.documentElement dark mode
    const isDark =
      originalTable.getAttribute('data-table-theme') === 'dark' ||
      originalTable.classList.contains('bg-slate-900');

    const textColor = isDark ? '#ffffff' : '#000000';
    const bgColor = isDark ? '#0f172a' : '#ffffff';

    return await html2canvas(originalTable, {
      scale: 2,
      useCORS: true,
      backgroundColor: bgColor,
      logging: false,
      onclone: (clonedDoc: Document) => {
        const table =
          clonedDoc.getElementById('raid-capture-canvas') ||
          clonedDoc.querySelector('#raid-capture-canvas') ||
          clonedDoc.body;

        // 1. Remove all elements with data-html2canvas-ignore to avoid layout shift/interference
        const ignored = table.querySelectorAll('[data-html2canvas-ignore="true"]');
        ignored.forEach((el) => el.remove());

        // 2. Query original inputs from the live DOM before cloning to guarantee accurate values
        const originalInputs = originalTable.querySelectorAll('input');

        // 3. Replace all interactive inputs with static centered text blocks
        // (html2canvas has a known bug misaligning text-align inside <input> elements)
        const inputs = table.querySelectorAll('input');
        inputs.forEach((input, index) => {
          const htmlInput = input as HTMLInputElement;
          const parent = htmlInput.parentElement;
          if (!parent) return;

          // Priority 1: data-text-value attribute (preserved across cloneNode)
          // Priority 2: original live DOM input.value
          // Priority 3: cloned input.value or getAttribute('value')
          // Priority 4: placeholder
          const originalInput = originalInputs[index] as HTMLInputElement | undefined;
          let textValue =
            htmlInput.getAttribute('data-text-value') ||
            originalInput?.value ||
            htmlInput.value ||
            htmlInput.getAttribute('value') ||
            '';

          textValue = textValue.trim();

          // Fallback to placeholder if it was a non-generic placeholder (e.g. member.ingame as fallback for loggedBy)
          if (
            !textValue &&
            htmlInput.placeholder &&
            htmlInput.placeholder !== 'Ingame...' &&
            htmlInput.placeholder !== 'Log by...'
          ) {
            textValue = htmlInput.placeholder.trim();
          }

          // Apply privacy masking if this is the logged-by column
          const colType =
            htmlInput.getAttribute('data-column-type') ||
            originalInput?.getAttribute('data-column-type');
          if (
            privacyMode !== 'NONE' &&
            (colType === 'logged-by' || htmlInput.placeholder?.includes('Log by'))
          ) {
            textValue = maskSensitiveText(textValue, privacyMode);
          }

          const textDiv = clonedDoc.createElement('div');
          // Use non-breaking space if empty so the div doesn't collapse height
          textDiv.textContent = textValue || '\u00A0';

          // Pure block styling with bulletproof center alignment and sharp high-contrast text color
          textDiv.setAttribute(
            'style',
            `text-align: center !important; width: 100% !important; display: block !important; margin: 0 auto !important; padding: 2px 0 !important; font-weight: 700 !important; font-size: 15px !important; line-height: 1.35 !important; color: ${textColor} !important; font-family: 'Be Vietnam Pro', system-ui, -apple-system, sans-serif !important; box-sizing: border-box !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;`
          );

          parent.style.textAlign = 'center';
          parent.style.width = '100%';
          parent.style.display = 'block';

          parent.replaceChild(textDiv, htmlInput);
        });

        // 4. Ensure all table cells TD and TH enforce text-align: center
        const cells = table.querySelectorAll('th, td');
        cells.forEach((cell) => {
          const htmlCell = cell as HTMLElement;
          htmlCell.style.textAlign = 'center';
        });
      },
    });
  };

  // Direct high-res PNG image download
  const handleDownloadImagePng = async (existingUrl?: string) => {
    setDownloadingImage(true);
    try {
      let dataUrl = existingUrl || previewImageUrl;
      if (!dataUrl) {
        const canvas = await generateCanvas();
        dataUrl = canvas.toDataURL('image/png');
        setPreviewImageUrl(dataUrl);
      }

      const link = document.createElement('a');
      const safeTitle = raidTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      link.href = dataUrl;
      link.download = `${safeTitle}_bang_raid.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadImageSuccess(true);
      setTimeout(() => setDownloadImageSuccess(false), 2500);
    } catch (err) {
      console.error('Lỗi khi tải ảnh PNG:', err);
    } finally {
      setDownloadingImage(false);
    }
  };

  // Robust copy image to clipboard with real Blob and fallback for iframe restrictions
  const handleCopyImageToClipboard = async () => {
    if (!tableRef.current) return;
    setCopyingImage(true);
    setShowClipboardFallback(false);

    try {
      const canvas = await generateCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewImageUrl(dataUrl);

      // Convert canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) {
        throw new Error('Canvas blob is null');
      }

      let writeSuccess = false;

      // Try promise/blob ClipboardItem
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          writeSuccess = true;
        } catch (err1) {
          try {
            const item = new ClipboardItem({ 'image/png': Promise.resolve(blob) });
            await navigator.clipboard.write([item]);
            writeSuccess = true;
          } catch (err2) {
            console.warn('Direct clipboard.write failed (likely iframe permission restriction):', err2);
          }
        }
      }

      if (writeSuccess) {
        setCopiedImageSuccess(true);
        setShowClipboardFallback(false);
        setTimeout(() => setCopiedImageSuccess(false), 3000);
      } else {
        // Fallback preview shown when iframe restricts direct clipboard write
        setShowClipboardFallback(true);
      }
    } catch (err) {
      console.error('Error generating canvas:', err);
      setShowClipboardFallback(true);
    } finally {
      setCopyingImage(false);
    }
  };

  const escapeHtml = (str: string): string => {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Download styled Excel HTML table with intact colors and borders matching the original photo
  const handleExportStyledExcel = () => {
    const safeMembers = filterMembersForExport(members, privacyMode);
    let rowsHtml = '';
    safeMembers.forEach((m) => {
      const meta = getEffectiveClassMeta(m.className, customColors);
      const ptStr = m.party ? `PT ${m.party}` : '';
      rowsHtml += `
        <tr>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 13pt; padding: 6px 10px;">${m.stt}</td>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 13pt; padding: 6px 14px;">${escapeHtml(m.ingame || '')}</td>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 13pt; background-color: ${meta.bgColor}; color: ${meta.textColor}; padding: 6px 14px;">${escapeHtml(m.className)}</td>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 13pt; padding: 6px 14px;">${escapeHtml(m.loggedBy || '')}</td>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 12pt; padding: 6px 10px;">${escapeHtml(ptStr)}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Raid Roster</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; }
          th { border: 2px solid #000000; background-color: #ffffff; color: #000000; font-size: 14pt; font-weight: 900; text-align: center; padding: 8px; }
          .title-row { border: 2px solid #000000; text-align: center; font-size: 18pt; font-weight: 900; background-color: #ffffff; padding: 12px; }
          .schedule-text { color: #e50000; font-weight: 900; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="5" class="title-row">
              ${escapeHtml(raidTitle.replace('-', ' - '))}
            </td>
          </tr>
          <tr>
            <th style="width: 70px;">STT</th>
            <th style="width: 200px;">Ingame</th>
            <th style="width: 170px;">Class</th>
            <th style="width: 180px;">Logged by</th>
            <th style="width: 90px;">Nhóm</th>
          </tr>
          ${rowsHtml}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = raidTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    link.href = url;
    link.download = `${safeTitle}_styled_roster.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadExcelSuccess(true);
    setTimeout(() => setDownloadExcelSuccess(false), 2500);
  };

  // Plain CSV export option for raw data parsing
  const handleExportPlainCsv = () => {
    const safeMembers = filterMembersForExport(members, privacyMode);
    let csv = `STT,Ingame,Class,Logged by,Party\n`;
    safeMembers.forEach((m) => {
      const escape = (val: string) => {
        let str = val || '';
        // Mitigate CSV Formula Injection (CWE-1236)
        if (/^[=+\-@\t\r]/.test(str)) {
          str = "'" + str;
        }
        return `"${str.replace(/"/g, '""')}"`;
      };
      const ptStr = m.party ? `PT ${m.party}` : '';
      csv += `${m.stt},${escape(m.ingame)},${escape(m.className)},${escape(m.loggedBy)},${escape(ptStr)}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = raidTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    link.href = url;
    link.download = `${safeTitle}_members.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadCsvSuccess(true);
    setTimeout(() => setDownloadCsvSuccess(false), 2500);
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[100] animate-in fade-in"
    >
      <div
        id="export-modal-card"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                Xuất Bảng Raid & Chia Sẻ
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lưu ảnh, sao chép hoặc tải bảng tính Excel có khung và màu chuẩn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy & Anti-Leak Mode Selector */}
        <div className="mt-4 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
              <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Chế độ bảo mật thông tin (Privacy Mode)</span>
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
              Chống rò rỉ PII
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
            Ẩn hoặc làm mờ thông tin người cầm acc (Logged by) khi chia sẻ ảnh/file lên mạng xã hội hoặc nhóm chat:
          </p>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handlePrivacyModeChange('NONE')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                privacyMode === 'NONE'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-2xs border border-indigo-300 dark:border-indigo-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Đầy đủ</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrivacyModeChange('MASK')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                privacyMode === 'MASK'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-2xs border border-amber-300 dark:border-amber-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Che (Tr***ng)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrivacyModeChange('HIDE')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                privacyMode === 'HIDE'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-2xs border border-rose-300 dark:border-rose-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ẩn hẳn (---)</span>
            </button>
          </div>
        </div>

        {/* Action Options List */}
        <div className="mt-4 space-y-3">
          {/* Action 1: Copy Image to Clipboard */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-3.5">
            <button
              type="button"
              id="btn-copy-image-clipboard"
              onClick={handleCopyImageToClipboard}
              disabled={copyingImage}
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Chụp & Sao chép ảnh (Copy Image)</span>
                    <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded">
                      Khuyên dùng
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Chụp bảng Raid để dán (Ctrl+V) ngay vào Discord, Zalo, Messenger
                  </div>
                </div>
              </div>

              <div className="sm:shrink-0 flex justify-end">
                {copiedImageSuccess ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-4 h-4" />
                    <span>Đã copy ảnh!</span>
                  </span>
                ) : (
                  <span className="w-full sm:w-auto text-center text-xs text-slate-700 dark:text-slate-200 font-bold bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 shadow-2xs group-hover:bg-slate-50 dark:group-hover:bg-slate-650 min-h-[38px] flex items-center justify-center">
                    {copyingImage ? 'Đang chụp ảnh...' : 'Copy ảnh'}
                  </span>
                )}
              </div>
            </button>

            {/* Fallback Image Preview if iframe prevents direct clipboard write */}
            {showClipboardFallback && previewImageUrl && (
              <div className="mt-3 p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                    <span className="font-bold">Ảnh bảng Raid đã được tạo thành công!</span> Do trình duyệt/iframe hạn chế quyền ghi bộ nhớ tạm tự động, bạn có thể:
                  </div>
                </div>

                <div className="relative group max-h-52 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center">
                  <img
                    src={previewImageUrl}
                    alt="Bảng Raid preview"
                    className="w-full h-auto object-contain cursor-pointer"
                    title="Click chuột phải -> Chọn Sao chép hình ảnh (Copy image)"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-600 dark:text-slate-300">
                    💡 <strong>Cách 1:</strong> Chuột phải vào ảnh &gt; <em>Sao chép hình ảnh</em> (Copy image)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadImagePng(previewImageUrl)}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-2xs min-h-[36px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cách 2: Tải file ảnh PNG</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action 2: Direct High-Quality PNG Download */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Tải ảnh PNG (Chất lượng cao)</span>
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                      Sắc nét
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lưu file hình ảnh .png về máy tính hoặc điện thoại với độ phân giải cao
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-download-image-png"
                onClick={() => handleDownloadImagePng()}
                disabled={downloadingImage}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg shadow-2xs transition-colors shrink-0 min-h-[40px]"
              >
                {downloadImageSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã tải ảnh!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{downloadingImage ? 'Đang tạo ảnh...' : 'Tải ảnh PNG'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action 2: Download Formatted Excel / CSV with Highlight colors and frames */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Tải bảng tính Excel (Có màu & Khung)</span>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                      Chuẩn ảnh
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mở bằng Excel hiển thị đầy đủ màu sắc môn phái và khung viền đen bản gốc
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-download-excel-styled"
                onClick={handleExportStyledExcel}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg shadow-2xs transition-colors shrink-0 min-h-[40px]"
              >
                {downloadExcelSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã tải file!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Tải Excel (.xls)</span>
                  </>
                )}
              </button>
            </div>

            {/* Sub-option: Plain CSV */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <TableIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Hoặc lưu định dạng CSV văn bản:</span>
              </span>
              <button
                type="button"
                id="btn-download-plain-csv"
                onClick={handleExportPlainCsv}
                className="font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline text-left sm:text-right"
              >
                {downloadCsvSuccess ? '✓ Đã tải CSV' : 'Tải file .CSV'}
              </button>
            </div>
          </div>

          {/* Action 3: Copy Formatted Text */}
          <button
            type="button"
            id="btn-copy-formatted-text"
            onClick={handleCopyText}
            className="w-full flex items-center justify-between p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition-colors group min-h-[48px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Sao chép dạng văn bản (Text)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Định dạng danh sách số thứ tự cho chat ingame hoặc Discord
                </div>
              </div>
            </div>
            {copiedTextSuccess ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
                <Check className="w-4 h-4" />
                <span>Đã copy!</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-300 font-bold bg-white dark:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600 shrink-0">
                Copy text
              </span>
            )}
          </button>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl min-h-[38px]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
