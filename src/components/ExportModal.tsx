import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { CustomClassColors, RaidMember } from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
import {
  Download,
  Copy,
  Check,
  FileText,
  X,
  Share2,
  ExternalLink,
  Table as TableIcon,
  AlertCircle,
  FileSpreadsheet,
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
  const [copiedTextSuccess, setCopiedTextSuccess] = useState(false);
  const [downloadExcelSuccess, setDownloadExcelSuccess] = useState(false);
  const [downloadCsvSuccess, setDownloadCsvSuccess] = useState(false);

  // Fallback preview when iframe prevents direct clipboard write
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showClipboardFallback, setShowClipboardFallback] = useState(false);

  if (!isOpen) return null;

  // Format text for Discord / Game chat
  const generateFormattedText = () => {
    let text = `⚔️ ${raidTitle.toUpperCase()} ⚔️\n`;
    text += `STT | Ingame | Phái | Logged by | PT\n`;
    text += `------------------------------------\n`;
    members.forEach((m) => {
      const sttStr = m.stt < 10 ? `0${m.stt}` : `${m.stt}`;
      const ptStr = m.party ? `PT ${m.party}` : '';
      text += `${sttStr}. ${m.ingame || '---'} | ${m.className} | ${m.loggedBy || m.ingame || '---'} | ${ptStr}\n`;
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

  // Modern robust copy image to clipboard with Promise-based ClipboardItem + iframe fallback
  const handleCopyImageToClipboard = async () => {
    if (!tableRef.current) return;
    setCopyingImage(true);
    setShowClipboardFallback(false);

    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      setPreviewImageUrl(dataUrl);

      // Try promise-based ClipboardItem if supported
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          const blobPromise = new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas blob is null'));
            }, 'image/png');
          });

          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blobPromise }),
          ]);

          setCopiedImageSuccess(true);
          setTimeout(() => setCopiedImageSuccess(false), 2500);
          return;
        } catch (clipErr) {
          console.warn('Direct clipboard.write failed (likely iframe permission restriction):', clipErr);
          setShowClipboardFallback(true);
        }
      } else {
        setShowClipboardFallback(true);
      }
    } catch (err) {
      console.error('Error generating canvas:', err);
      setShowClipboardFallback(true);
    } finally {
      setCopyingImage(false);
    }
  };

  // Open fallback image in new tab so user can easily save or copy without iframe sandbox restrictions
  const handleOpenImageInNewTab = () => {
    if (!previewImageUrl) return;
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(
        `<!DOCTYPE html><html><head><title>Bảng Raid - ${raidTitle}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;background:#1e293b;min-height:100vh;}img{max-width:95%;height:auto;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:2px solid black;}</style></head><body><img src="${previewImageUrl}" alt="Raid Table" /></body></html>`
      );
      newTab.document.close();
    }
  };

  // Download styled Excel HTML table with intact colors and borders matching the original photo
  const handleExportStyledExcel = () => {
    let rowsHtml = '';
    members.forEach((m) => {
      const meta = getEffectiveClassMeta(m.className, customColors);
      const ptStr = m.party ? `PT ${m.party}` : '';
      rowsHtml += `
        <tr>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 13pt; padding: 6px 10px;">${m.stt}</td>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 13pt; padding: 6px 14px;">${m.ingame || ''}</td>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 13pt; background-color: ${meta.bgColor}; color: ${meta.textColor}; padding: 6px 14px;">${m.className}</td>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 13pt; padding: 6px 14px;">${m.loggedBy || m.ingame || ''}</td>
          <td style="border: 2px solid #000000; text-align: center; font-weight: bold; font-size: 12pt; padding: 6px 10px;">${ptStr}</td>
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
              ${raidTitle.replace('-', ' - ')}
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
    let csv = `STT,Ingame,Class,Logged by,Party\n`;
    members.forEach((m) => {
      const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
      const ptStr = m.party ? `PT ${m.party}` : '';
      csv += `${m.stt},${escape(m.ingame)},${escape(m.className)},${escape(m.loggedBy || m.ingame)},${escape(ptStr)}\n`;
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
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
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
              <div className="mt-3 p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                    <span className="font-bold">Ảnh bảng Raid đã được tạo!</span> Do giới hạn bảo mật iframe trình duyệt, hãy{' '}
                    <strong>Click chuột phải (hoặc chạm giữ trên điện thoại)</strong> vào ảnh bên dưới rồi chọn{' '}
                    <strong>&quot;Sao chép hình ảnh&quot; (Copy image)</strong>:
                  </div>
                </div>

                <div className="relative group max-h-48 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center">
                  <img
                    src={previewImageUrl}
                    alt="Bảng Raid preview"
                    className="w-full h-auto object-contain cursor-pointer"
                    title="Click chuột phải -> Chọn Sao chép hình ảnh"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Mẹo: Chạm giữ hoặc chuột phải vào ảnh &gt; Copy image
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenImageInNewTab}
                    className="flex items-center justify-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 min-h-[36px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở ảnh tab mới để copy</span>
                  </button>
                </div>
              </div>
            )}
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
