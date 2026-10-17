import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  Database,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Cloud,
  Calendar,
  Sparkles,
  RefreshCw,
  HardDrive,
  FileJson,
} from 'lucide-react';
import { RaidBoard, PersonnelMember, CustomClassColors, GuildWarBoard } from '../types';
import { CloudGuildData } from '../services/cloudSync';
import {
  AutoSnapshot,
  getAutoSnapshots,
  downloadBackupFile,
  parseBackupFile,
} from '../utils/storageBackup';
import {
  DailyBackupRecord,
  getTodayDateString,
  formatDisplayDate,
  listAllDailyBackups,
  createDailyBackup,
  fetchDailyBackupData,
  downloadBackupJsonFile,
  STORAGE_KEY_LAST_DAILY_BACKUP,
} from '../services/backupService';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: RaidBoard[];
  personnelPool: PersonnelMember[];
  customColors?: CustomClassColors;
  guildWarBoards?: GuildWarBoard[];
  updateBoards?: RaidBoard[];
  updatePersonnelPool?: PersonnelMember[];
  diBuiPersonnelPool?: PersonnelMember[];
  masterPersonnelPool?: PersonnelMember[];
  guildWarPersonnelPool?: PersonnelMember[];
  activeBoardId?: string;
  activeGuildWarBoardId?: string;
  activeUpdateBoardId?: string;
  onRestoreData: (restored: Partial<CloudGuildData>) => void;
  onShowToast: (msg: string) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  boards,
  personnelPool,
  customColors = {},
  guildWarBoards = [],
  updateBoards = [],
  updatePersonnelPool = [],
  diBuiPersonnelPool = [],
  masterPersonnelPool = [],
  guildWarPersonnelPool = [],
  activeBoardId = 'board_1',
  activeGuildWarBoardId = 'gw_board_1',
  activeUpdateBoardId = '',
  onRestoreData,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'snapshots'>('daily');
  const [dailyBackups, setDailyBackups] = useState<DailyBackupRecord[]>([]);
  const [snapshots, setSnapshots] = useState<AutoSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackingUpNow, setIsBackingUpNow] = useState<boolean>(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const todayStr = getTodayDateString();
  const isTodayBackedUp =
    localStorage.getItem(STORAGE_KEY_LAST_DAILY_BACKUP) === todayStr ||
    dailyBackups.some((b) => b.dateStr === todayStr);

  const currentPayload: CloudGuildData = {
    boards,
    personnelPool,
    customColors,
    guildWarBoards,
    updateBoards,
    updatePersonnelPool,
    diBuiPersonnelPool,
    masterPersonnelPool,
    guildWarPersonnelPool,
    activeBoardId,
    activeGuildWarBoardId,
    activeUpdateBoardId,
    updatedAt: Date.now(),
  };

  // Load backups when opened
  useEffect(() => {
    if (!isOpen) return;
    setSnapshots(getAutoSnapshots());
    loadDailyList();
  }, [isOpen]);

  const loadDailyList = async () => {
    setIsLoading(true);
    try {
      const list = await listAllDailyBackups();
      setDailyBackups(list);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Manual Trigger: Sao lưu ngay hôm nay
  const handleBackupNow = async () => {
    setIsBackingUpNow(true);
    try {
      const res = await createDailyBackup(currentPayload, true, todayStr);
      if (res.success) {
        onShowToast('Đã tạo bản sao lưu hôm nay thành công lên Đám mây & Bộ nhớ máy!');
        await loadDailyList();
      } else {
        onShowToast(`Lỗi sao lưu: ${res.error || 'Thử lại sau'}`);
      }
    } finally {
      setIsBackingUpNow(false);
    }
  };

  // Download entire current state to JSON
  const handleDownloadCurrentJson = () => {
    try {
      downloadBackupJsonFile(currentPayload, todayStr);
      onShowToast('Đã tải xuống file sao lưu (.json) thành công!');
    } catch {
      onShowToast('Có lỗi khi tạo file sao lưu.');
    }
  };

  // Download specific daily backup to JSON
  const handleDownloadDailyJson = async (record: DailyBackupRecord) => {
    try {
      const data = await fetchDailyBackupData(record);
      if (data) {
        downloadBackupJsonFile(data, record.dateStr);
        onShowToast(`Đã tải file sao lưu ngày ${formatDisplayDate(record.dateStr)}!`);
      } else {
        onShowToast('Không thể lấy chi tiết bản sao lưu này.');
      }
    } catch {
      onShowToast('Lỗi khi tải file sao lưu.');
    }
  };

  // Restore from a Daily Backup Record
  const handleRestoreDailyBackup = async (record: DailyBackupRecord) => {
    const confirmText =
      `Xác nhận phục hồi dữ liệu về bản sao lưu "${formatDisplayDate(record.dateStr)}"?\n\n` +
      `- Tổng kho nhân sự: ${record.masterPersonnelCount} người\n` +
      `- Thành viên Raid có tên: ${record.raidMembersCount} người (${record.raidBoardsCount} bảng)\n` +
      `- Thành viên Bang chiến: ${record.guildWarMembersCount} người (${record.guildWarBoardsCount} bảng)\n` +
      `- Nguồn lưu: ${record.source === 'both' ? 'Đám mây & Bộ nhớ máy' : record.source === 'cloud' ? 'Đám mây Cloud' : 'Bộ nhớ máy'}\n\n` +
      `Thao tác này sẽ áp dụng toàn bộ dữ liệu của ngày này vào web và cập nhật lên máy chủ. Bạn có muốn tiếp tục?`;

    if (!window.confirm(confirmText)) {
      return;
    }

    setRestoringId(record.id);
    try {
      const fullData = await fetchDailyBackupData(record);
      if (!fullData) {
        alert('Không thể tải chi tiết dữ liệu của bản sao lưu này. Vui lòng kiểm tra kết nối mạng.');
        return;
      }

      onRestoreData(fullData);
      onShowToast(`Đã khôi phục dữ liệu thành công về ngày ${formatDisplayDate(record.dateStr)}!`);
      onClose();
    } catch (err: any) {
      alert(`Lỗi phục hồi: ${err?.message || 'Thử lại sau'}`);
    } finally {
      setRestoringId(null);
    }
  };

  // Restore from an Auto Snapshot
  const handleRestoreSnapshot = (snap: AutoSnapshot) => {
    if (
      window.confirm(
        `Bạn có chắc muốn khôi phục lại "${snap.label}"?\n\n- ${snap.boardCount} bảng Raid (${snap.totalMembersWithData} thành viên có tên)\n- ${snap.personnelCount} người trong kho Raid\n${snap.masterPersonnelPool ? `- ${snap.masterPersonnelPool.length} người Tổng kho\n` : ''}`
      )
    ) {
      onRestoreData({
        boards: snap.boards,
        personnelPool: snap.personnelPool,
        customColors: snap.customColors,
        guildWarBoards: snap.guildWarBoards,
        diBuiPersonnelPool: snap.diBuiPersonnelPool,
        masterPersonnelPool: snap.masterPersonnelPool,
        guildWarPersonnelPool: snap.guildWarPersonnelPool,
      });
      onShowToast('Đã khôi phục dữ liệu từ bản lưu tự động!');
      onClose();
    }
  };

  // Upload JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const restored = parseBackupFile(text);

        if (
          window.confirm(
            `Xác nhận nạp dữ liệu từ file sao lưu?\n` +
            `- Số bảng Raid: ${restored.boards.length}\n` +
            `- Số bảng Bang chiến: ${restored.guildWarBoards?.length || 0}\n` +
            `- Tổng kho nhân sự: ${restored.masterPersonnelPool?.length || 0} người\n` +
            `- Kho Raid: ${restored.personnelPool.length} người\n\n` +
            `Dữ liệu sẽ được nạp vào máy và cập nhật lên hệ thống.`
          )
        ) {
          onRestoreData(restored);
          onShowToast('Khôi phục dữ liệu thành công từ file sao lưu JSON!');
          onClose();
        }
      } catch (err: any) {
        alert(err.message || 'Lỗi khi đọc file sao lưu.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-teal-500/10 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4D8] to-[#0369A1] text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  Sao Lưu Dữ Liệu Mỗi Ngày
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Daily Backup
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bảo vệ toàn bộ bảng Raid, Bang Chiến & Kho nhân sự – Tự động lưu theo từng ngày
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {/* Today Backup Status Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-sky-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    isTodayBackedUp
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                    <span>Hôm nay ({formatDisplayDate(todayStr)})</span>
                    {isTodayBackedUp ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã có bản sao lưu
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Chưa tạo bản sao lưu mới
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hệ thống tự động sao lưu toàn bộ kho ({masterPersonnelPool.length} nhân sự) và các bảng mỗi ngày
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleBackupNow}
                  disabled={isBackingUpNow}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00B4D8] hover:bg-[#0284C7] active:bg-[#0369A1] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer text-xs"
                >
                  {isBackingUpNow ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Sao lưu ngay</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCurrentJson}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-100 font-bold rounded-xl border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer text-xs"
                  title="Tải toàn bộ dữ liệu hiện tại về máy (.json)"
                >
                  <Download className="w-3.5 h-3.5 text-sky-500" />
                  <span className="hidden sm:inline">Tải JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-100 font-bold rounded-xl border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer text-xs"
                  title="Nạp file JSON từ máy tính"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Nạp JSON</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'daily'
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-400/30'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Bản sao lưu mỗi ngày ({dailyBackups.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('snapshots')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'snapshots'
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-400/30'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Bản lưu tức thời ({snapshots.length})</span>
              </button>
            </div>

            {activeTab === 'daily' && (
              <button
                type="button"
                onClick={loadDailyList}
                disabled={isLoading}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            )}
          </div>

          {/* Tab 1: Daily Backups List */}
          {activeTab === 'daily' && (
            <div className="space-y-2">
              {isLoading && dailyBackups.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-500" />
                  <div>Đang tải danh sách bản sao lưu từ Cloud & Bộ nhớ máy...</div>
                </div>
              ) : dailyBackups.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-500 space-y-2">
                  <div>Chưa có bản sao lưu ngày nào.</div>
                  <button
                    type="button"
                    onClick={handleBackupNow}
                    className="px-3 py-1.5 bg-[#00B4D8] text-white font-bold rounded-lg text-xs"
                  >
                    Tạo bản sao lưu ngay hôm nay
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {dailyBackups.map((bak) => {
                    const isToday = bak.dateStr === todayStr;
                    const isRestoringThis = restoringId === bak.id;

                    return (
                      <div
                        key={bak.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isToday
                            ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800/70'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                              {formatDisplayDate(bak.dateStr)}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-sky-500/20 text-sky-600 dark:text-sky-300 rounded-md">
                                Hôm nay
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {new Date(bak.timestamp).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            {/* Storage Source Badges */}
                            <div className="flex items-center gap-1">
                              {(bak.source === 'both' || bak.source === 'cloud') && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-300 flex items-center gap-0.5">
                                  <Cloud className="w-2.5 h-2.5" />
                                  Cloud
                                </span>
                              )}
                              {(bak.source === 'both' || bak.source === 'local') && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center gap-0.5">
                                  <HardDrive className="w-2.5 h-2.5" />
                                  Máy
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sky-600 dark:text-sky-400 font-semibold">
                              Tổng kho: {bak.masterPersonnelCount}
                            </span>
                            <span>•</span>
                            <span>Raid: {bak.raidMembersCount} thành viên ({bak.raidBoardsCount} bảng)</span>
                            {bak.guildWarBoardsCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-purple-600 dark:text-purple-400">
                                  Bang chiến: {bak.guildWarMembersCount} ({bak.guildWarBoardsCount} bảng)
                                </span>
                              </>
                            )}
                            {bak.diBuiCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                  Đi bụi: {bak.diBuiCount}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadDailyJson(bak)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Tải file JSON của ngày này"
                          >
                            <FileJson className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRestoreDailyBackup(bak)}
                            disabled={isRestoringThis}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 border border-sky-300 dark:border-sky-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isRestoringThis ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Phục hồi</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Auto Snapshots */}
          {activeTab === 'snapshots' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Các mốc ghi nhận tự động tức thì khi bạn hoặc thành viên thao tác chỉnh sửa:
              </div>

              {snapshots.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-500">
                  Chưa có mốc lưu tức thời nào.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-indigo-400 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {new Date(snap.timestamp).toLocaleString('vi-VN')}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{snap.boardCount} bảng Raid</span>
                          <span>•</span>
                          <span className="text-sky-600 dark:text-sky-400 font-medium">
                            {snap.totalMembersWithData} thành viên Raid
                          </span>
                          <span>•</span>
                          <span>Kho Raid: {snap.personnelCount}</span>
                          {snap.masterPersonnelPool && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                Tổng kho: {snap.masterPersonnelPool.length}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Khôi phục</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Informational Banner */}
          <div className="p-3 bg-sky-50 dark:bg-slate-800/60 rounded-xl border border-sky-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#00B4D8]" />
            <div className="space-y-1">
              <span className="font-bold block text-slate-900 dark:text-white">
                Bảo Vệ Đa Tầng An Toàn Tuyệt Đối:
              </span>
              <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                Mỗi ngày, web tự động tạo một snapshot độc lập lưu lên cả <strong>Cloud Firestore</strong> và <strong>IndexedDB</strong>. Bản sao lưu ngày này sẽ không bao giờ bị ghi đè bởi ngày khác, cho phép bạn xem lại hoặc phục hồi lịch sử bất cứ lúc nào!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
