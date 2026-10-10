import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Plus,
  RefreshCw,
  FileCheck,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { RaidBoard, RaidMember, RaidClass, CustomClassColors } from '../types';
import { CLASS_LIST, getEffectiveClassMeta } from '../constants/classes';
import { parseRaidImage, ParsedRaidData, ParseProgress } from '../utils/imageRaidParser';

interface ImportRaidImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextBoardNumber: number;
  customColors?: CustomClassColors;
  currentActiveBoard?: RaidBoard;
  onCreateNewBoard: (newBoard: RaidBoard) => void;
  onOverwriteCurrentBoard?: (updatedBoard: Partial<RaidBoard>) => void;
  showToast: (msg: string) => void;
}

export const ImportRaidImageModal: React.FC<ImportRaidImageModalProps> = ({
  isOpen,
  onClose,
  nextBoardNumber,
  customColors,
  currentActiveBoard,
  onCreateNewBoard,
  onOverwriteCurrentBoard,
  showToast,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ParseProgress>({ status: '', progress: 0 });
  const [parsedData, setParsedData] = useState<ParsedRaidData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setParsedData(null);
      setIsProcessing(false);
      setErrorMsg(null);
      setProgress({ status: '', progress: 0 });
    }
  }, [isOpen]);

  // Support Ctrl+V paste from clipboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, isProcessing]);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh (PNG, JPG, WEBP).');
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsProcessing(true);
    setProgress({ status: 'Bắt đầu xử lý ảnh...', progress: 0.05 });

    try {
      const result = await parseRaidImage(file, {
        customColors,
        onProgress: (p) => setProgress(p),
      });

      // Default prefix to nextBoardNumber if OCR didn't catch a valid number
      if (!result.titlePrefix || result.titlePrefix === 'RAID') {
        result.titlePrefix = `RAID ${nextBoardNumber}`;
      }

      setParsedData(result);
      showToast('Nhận diện cấu trúc bảng Raid từ ảnh thành công!');
    } catch (err: any) {
      console.error('Failed to parse raid image:', err);
      setErrorMsg(err.message || 'Không thể trích xuất dữ liệu từ ảnh. Vui lòng thử lại với ảnh rõ nét hơn.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Editing handlers for parsed preview data
  const handleUpdateMember = (index: number, field: keyof RaidMember, value: any) => {
    if (!parsedData) return;
    const updated = [...parsedData.members];
    updated[index] = { ...updated[index], [field]: value };
    setParsedData({ ...parsedData, members: updated });
  };

  // Create new Raid Board
  const handleExecuteCreateNew = () => {
    if (!parsedData) return;
    const timestamp = Date.now();
    const newBoard: RaidBoard = {
      id: `board_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: timestamp,
      titlePrefix: parsedData.titlePrefix.trim() || `RAID ${nextBoardNumber}`,
      scheduleTime: parsedData.scheduleTime.trim() || 'MON 20:30',
      bossName: parsedData.bossName.trim() || 'NIÊN DU',
      members: parsedData.members,
      parties: parsedData.parties || [
        { id: 1, name: 'PT 1' },
        { id: 2, name: 'PT 2' },
      ],
    };

    onCreateNewBoard(newBoard);
    showToast(`Đã tạo bảng "${newBoard.titlePrefix}" từ ảnh thành công!`);
    onClose();
  };

  // Overwrite current active board
  const handleExecuteOverwrite = () => {
    if (!parsedData || !onOverwriteCurrentBoard || !currentActiveBoard) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn ghi đè toàn bộ dữ liệu từ ảnh vào bảng "${currentActiveBoard.titlePrefix}"?`
      )
    ) {
      return;
    }

    onOverwriteCurrentBoard({
      titlePrefix: parsedData.titlePrefix.trim() || currentActiveBoard.titlePrefix,
      scheduleTime: parsedData.scheduleTime.trim() || currentActiveBoard.scheduleTime,
      bossName: parsedData.bossName.trim() || currentActiveBoard.bossName,
      members: parsedData.members,
    });
    showToast(`Đã cập nhật bảng "${currentActiveBoard.titlePrefix}" từ ảnh!`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#0E1722] border border-sky-300 dark:border-[#1F3347] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#38BDF8] to-[#88DCFA] text-slate-950 flex items-center justify-center font-black shadow-md shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Import Dữ Liệu Raid Từ Ảnh
                <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-700 dark:text-[#88DCFA] border border-sky-400/40 rounded-full">
                  AI & OCR Visual
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động nhận diện môn phái, ingame, người log & tạo thành bảng Raid hoàn chỉnh
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 rounded-2xl flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Drop Zone when no data parsed yet */}
          {!parsedData && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-[#38BDF8] bg-sky-50 dark:bg-sky-950/30 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50/60 dark:bg-slate-900/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {isProcessing ? (
                  <div className="space-y-4 max-w-md w-full">
                    <Loader2 className="w-12 h-12 text-[#38BDF8] animate-spin mx-auto" />
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                        {progress.status || 'Đang phân tích bảng Raid...'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Hệ thống đang quét các ô màu môn phái và chữ ingame...
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-300 dark:border-slate-700">
                      <div
                        className="bg-gradient-to-r from-sky-400 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round(progress.progress * 100)}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-bold text-sky-600 dark:text-[#88DCFA]">
                      {Math.round(progress.progress * 100)}% hoàn thành
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-[#88DCFA] flex items-center justify-center mb-4 shadow-inner">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                      Kéo thả ảnh bảng Raid vào đây hoặc Click để chọn
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                      Hỗ trợ chụp màn hình và dán trực tiếp bằng phím tắt <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-bold">Ctrl + V</kbd>
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-400 to-[#88DCFA] text-slate-950 font-black text-xs rounded-xl shadow-md hover:opacity-95 transition-all">
                      <Upload className="w-4 h-4" />
                      <span>Chọn file từ máy</span>
                    </div>
                  </>
                )}
              </div>

              {/* Guide tips */}
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Mẹo để nhận diện chính xác 100%:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-800/90 dark:text-amber-300/80 pl-1">
                  <li>Ảnh xuất từ nút "Xuất ảnh" của web cho độ chính xác cao nhất (màu phái & chữ sắc nét).</li>
                  <li>Nếu là ảnh chụp màn hình, hãy đảm bảo chụp bao quát đủ 12 hàng STT và cột Môn phái.</li>
                  <li>Sau khi nhận diện, bạn có thể chỉnh sửa lại bất kỳ tên ingame hoặc môn phái nào trước khi lưu.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Parsed Result Preview & Edit Table */}
          {parsedData && (
            <div className="space-y-6">
              {/* Top Bar Info (Title Prefix, Schedule, Boss) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    Thông Tin Bảng Nhận Diện Được
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedData(null);
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-xs font-bold text-sky-600 dark:text-[#88DCFA] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Chọn ảnh khác
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Tiêu đề Bảng (Prefix):
                    </label>
                    <input
                      type="text"
                      value={parsedData.titlePrefix}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, titlePrefix: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Giờ đi Raid:
                    </label>
                    <input
                      type="text"
                      value={parsedData.scheduleTime}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, scheduleTime: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Tên Boss:
                    </label>
                    <input
                      type="text"
                      value={parsedData.bossName}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, bossName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Members Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 dark:bg-slate-800/90 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                  <span>DANH SÁCH 12 VỊ TRÍ (STT 1 - 12)</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    Bạn có thể chỉnh sửa trực tiếp vào các ô bên dưới
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-[380px] overflow-y-auto custom-scrollbar">
                  {parsedData.members.map((m, idx) => {
                    const classMeta = getEffectiveClassMeta(m.className, customColors);
                    const isPtDivider = idx === 6;

                    return (
                      <React.Fragment key={m.id || idx}>
                        {isPtDivider && (
                          <div className="bg-sky-50/90 dark:bg-sky-950/40 px-4 py-1.5 text-[11px] font-extrabold text-sky-800 dark:text-sky-300 border-y border-sky-200 dark:border-sky-800/60 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <span>PT 2 (VỊ TRÍ 7 - 12)</span>
                          </div>
                        )}

                        <div className="p-2 sm:p-2.5 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          {/* STT & PT Badge */}
                          <div className="flex items-center gap-1.5 w-16 shrink-0">
                            <span className="font-mono font-black text-xs text-slate-500 dark:text-slate-400 w-5 text-right">
                              #{m.stt}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateMember(idx, 'party', m.party === 1 ? 2 : 1)
                              }
                              className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
                                m.party === 1
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              }`}
                              title="Nhấp để đổi PT 1 / PT 2"
                            >
                              PT {m.party}
                            </button>
                          </div>

                          {/* Ingame Input */}
                          <div className="flex-1 min-w-[120px]">
                            <input
                              type="text"
                              value={m.ingame}
                              onChange={(e) => handleUpdateMember(idx, 'ingame', e.target.value)}
                              placeholder="Ingame..."
                              className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
                            />
                          </div>

                          {/* Class Select Dropdown */}
                          <div className="w-[140px] sm:w-[160px] shrink-0">
                            <select
                              value={m.className}
                              onChange={(e) =>
                                handleUpdateMember(idx, 'className', e.target.value as RaidClass)
                              }
                              style={{
                                backgroundColor: classMeta.bgColor,
                                color: classMeta.textColor,
                              }}
                              className="w-full px-2.5 py-1 text-xs font-black rounded-lg border border-black/20 shadow-2xs cursor-pointer focus:outline-none"
                            >
                              {CLASS_LIST.map((cls) => (
                                <option
                                  key={cls}
                                  value={cls}
                                  className="bg-slate-900 text-white font-bold"
                                >
                                  {cls}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Logged by Input */}
                          <div className="w-[120px] sm:w-[150px] shrink-0">
                            <input
                              type="text"
                              value={m.loggedBy || ''}
                              onChange={(e) => handleUpdateMember(idx, 'loggedBy', e.target.value)}
                              placeholder="Logged by..."
                              className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {parsedData
              ? `Đã nhận diện đủ ${parsedData.members.length} vị trí từ ảnh.`
              : 'Chọn ảnh bảng Raid bất kỳ để bắt đầu import.'}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Hủy
            </button>

            {parsedData && (
              <>
                {currentActiveBoard && onOverwriteCurrentBoard && (
                  <button
                    type="button"
                    onClick={handleExecuteOverwrite}
                    className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors"
                  >
                    Ghi đè Bảng hiện tại
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExecuteCreateNew}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-400 to-[#88DCFA] hover:from-sky-500 hover:to-[#68CEF6] text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Tạo Bảng Raid Mới ({parsedData.titlePrefix})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
