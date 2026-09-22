import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { initAuth } from './services/auth';
import {
  INITIAL_MEMBERS_FROM_IMAGE,
  CLASS_LIST,
  DEFAULT_RAID_PARTIES,
  getEffectiveClassMeta,
} from './constants/classes';
import { RaidMember, RaidClass, CustomClassColors, RaidParty } from './types';
import { RaidTable } from './components/RaidTable';
import { PartyManager } from './components/PartyManager';
import { ClassStatsBar } from './components/ClassStatsBar';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ExportModal } from './components/ExportModal';
import { ColorCustomizerModal } from './components/ColorCustomizerModal';
import {
  FileSpreadsheet,
  Share2,
  Users,
  Info,
  Palette,
  Table as TableIcon,
  Sun,
  Moon,
} from 'lucide-react';

const STORAGE_KEY_MEMBERS = 'raid_roster_members_v1';
const STORAGE_KEY_CONFIG = 'raid_roster_config_v1';
const STORAGE_KEY_COLORS = 'raid_roster_custom_colors_v1';
const STORAGE_KEY_PARTIES = 'raid_roster_parties_v1';
const STORAGE_KEY_THEME = 'raid_roster_theme_mode_v1';

export default function App() {
  const [titlePrefix, setTitlePrefix] = useState<string>('RAID 1');
  const [scheduleTime, setScheduleTime] = useState<string>('MON 20:30');
  const [bossName, setBossName] = useState<string>('NIÊN DU');
  const [members, setMembers] = useState<RaidMember[]>(INITIAL_MEMBERS_FROM_IMAGE);
  const [parties, setParties] = useState<RaidParty[]>(DEFAULT_RAID_PARTIES);
  const [customColors, setCustomColors] = useState<CustomClassColors>({});
  const [activeTab, setActiveTab] = useState<'table' | 'parties'>('table');

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved !== null) {
        return saved === 'dark';
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | null>(null);

  const tableRef = useRef<HTMLDivElement | null>(null);

  // Sync Dark Mode with document.documentElement
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem(STORAGE_KEY_THEME, 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(STORAGE_KEY_THEME, 'light');
      }
    } catch (e) {
      console.error('Failed to sync dark mode:', e);
    }
  }, [isDarkMode]);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load from localStorage if present
  useEffect(() => {
    try {
      const savedMembers = localStorage.getItem(STORAGE_KEY_MEMBERS);
      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      const savedColors = localStorage.getItem(STORAGE_KEY_COLORS);
      const savedParties = localStorage.getItem(STORAGE_KEY_PARTIES);

      if (savedParties) {
        setParties(JSON.parse(savedParties));
      }

      if (savedMembers) {
        const parsed: RaidMember[] = JSON.parse(savedMembers);
        // Normalize party field
        const normalized = parsed.map((m, idx) => ({
          ...m,
          party: m.party || (idx < 6 ? 1 : 2),
        }));
        setMembers(normalized);
      }
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.titlePrefix) setTitlePrefix(config.titlePrefix);
        if (config.scheduleTime) setScheduleTime(config.scheduleTime);
        if (config.bossName) setBossName(config.bossName);
      }
      if (savedColors) {
        setCustomColors(JSON.parse(savedColors));
      }
    } catch (e) {
      console.error('Failed to load saved roster:', e);
    }
  }, []);

  // Save members and config to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
      localStorage.setItem(
        STORAGE_KEY_CONFIG,
        JSON.stringify({ titlePrefix, scheduleTime, bossName })
      );
    } catch (e) {
      console.error('Failed to save roster:', e);
    }
  }, [members, titlePrefix, scheduleTime, bossName]);

  // Save parties to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PARTIES, JSON.stringify(parties));
    } catch (e) {
      console.error('Failed to save parties:', e);
    }
  }, [parties]);

  // Save custom colors to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLORS, JSON.stringify(customColors));
    } catch (e) {
      console.error('Failed to save custom colors:', e);
    }
  }, [customColors]);

  const handleUpdateTitle = (prefix: string, sched: string, boss: string) => {
    setTitlePrefix(prefix);
    setScheduleTime(sched);
    setBossName(boss);
  };

  const handleUpdateColor = (className: RaidClass, hex: string) => {
    setCustomColors((prev) => ({
      ...prev,
      [className]: hex,
    }));
  };

  const handleResetColor = (className: RaidClass) => {
    setCustomColors((prev) => {
      const updated = { ...prev };
      delete updated[className];
      return updated;
    });
  };

  const handleResetAllColors = () => {
    setCustomColors({});
  };

  const handleApplyPreset = (preset: CustomClassColors) => {
    setCustomColors(preset);
  };

  const handleImportSuccess = (imported: { title?: string; members: RaidMember[] }) => {
    if (imported.members && imported.members.length > 0) {
      // Normalize imported members with party
      const normalized = imported.members.map((m, idx) => ({
        ...m,
        party: m.party || (idx < 6 ? 1 : 2),
      }));
      setMembers(normalized);
    }
    if (imported.title) {
      // Parse "RAID 1 - MON 20:30 NIÊN DU"
      const parts = imported.title.split('-');
      if (parts.length > 1) {
        setTitlePrefix(parts[0].trim());
        const sub = parts[1].trim().split(' ');
        if (sub.length >= 2) {
          setScheduleTime(`${sub[0]} ${sub[1]}`);
          setBossName(sub.slice(2).join(' ') || 'NIÊN DU');
        } else {
          setBossName(parts[1].trim());
        }
      } else {
        setTitlePrefix(imported.title);
      }
    }
  };

  const fullRaidTitle = `${titlePrefix} - ${scheduleTime} ${bossName}`;
  const customizedCount = Object.keys(customColors).length;

  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-16">
      {/* Top Header Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-xs transition-colors">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950 dark:bg-indigo-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs shrink-0">
              RD
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-base leading-tight truncate">
                Sắp Xếp Nhân Sự Raid
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Chuẩn theo bảng mẫu • 11 môn phái • Phân chia nhóm PT linh hoạt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              id="btn-toggle-dark-mode"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center justify-center p-2 sm:px-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] min-w-[38px]"
              title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối (giảm mỏi mắt)'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
              <span className="hidden md:inline ml-1.5 text-xs">
                {isDarkMode ? 'Sáng' : 'Tối'}
              </span>
            </button>

            {/* Color Customizer Button */}
            <button
              type="button"
              id="btn-open-color-customizer"
              onClick={() => setIsColorModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all shadow-2xs relative min-h-[38px]"
              title="Đổi màu sắc môn phái bất kỳ"
            >
              <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Đổi màu</span>
              {customizedCount > 0 && (
                <span className="px-1.5 py-0.2 bg-purple-600 dark:bg-purple-500 text-white text-[10px] rounded-full font-bold">
                  {customizedCount}
                </span>
              )}
            </button>

            {/* Google Sheets Action Button */}
            <button
              type="button"
              id="btn-open-sheets-modal"
              onClick={() => setIsSheetsModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Sheets</span>
              {currentUser && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-0.5" />
              )}
            </button>

            {/* Export / Share Modal Button */}
            <button
              type="button"
              id="btn-open-export-modal"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs min-h-[38px]"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Xuất ảnh / File</span>
              <span className="sm:hidden text-[11px]">Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* Composition Summary Bar */}
        <ClassStatsBar
          members={members}
          customColors={customColors}
          onSelectFilter={setSelectedClassFilter}
          selectedFilter={selectedClassFilter}
        />

        {/* Selected Filter Notice */}
        {selectedClassFilter && (
          <div className="flex items-center justify-between mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200">
            <span>
              Đang lọc theo môn phái: <strong>{selectedClassFilter}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedClassFilter(null)}
              className="font-bold underline text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
            >
              Hiện tất cả
            </button>
          </div>
        )}

        {/* Tab Switcher: Bảng Nhân Sự vs Phân Bổ Nhóm PT */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="tab-view-table"
              onClick={() => setActiveTab('table')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] ${
                activeTab === 'table'
                  ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <TableIcon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Bảng Nhân Sự (Ảnh Mẫu)</span>
              <span className="sm:hidden">📋 Bảng Raid</span>
            </button>

            <button
              type="button"
              id="tab-view-parties"
              onClick={() => setActiveTab('parties')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] ${
                activeTab === 'parties'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Kéo Thả Phân Nhóm PT</span>
              <span className="sm:hidden">🛡️ Phân Nhóm PT</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'parties'
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {parties.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
            {activeTab === 'table'
              ? 'Bảng chuẩn xuất ảnh • Có thể bật "Hiện chia PT"'
              : 'Kéo thả người chơi giữa các nhóm PT'}
          </div>
        </div>

        {/* View Mode 1: Table (Always kept in DOM for html2canvas export) */}
        <div
          className={`bg-white dark:bg-slate-900 rounded-2xl p-2 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center transition-colors ${
            activeTab === 'table' ? 'block' : 'hidden'
          }`}
        >
          <RaidTable
            titlePrefix={titlePrefix}
            scheduleTime={scheduleTime}
            bossName={bossName}
            members={members}
            parties={parties}
            customColors={customColors}
            onUpdateTitle={handleUpdateTitle}
            onUpdateMembers={setMembers}
            onOpenColorCustomizer={() => setIsColorModalOpen(true)}
            tableRef={tableRef}
            selectedClassFilter={selectedClassFilter}
          />
        </div>

        {/* View Mode 2: Party Manager (Drag-and-Drop PT columns) */}
        {activeTab === 'parties' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <PartyManager
              members={members}
              parties={parties}
              customColors={customColors}
              onUpdateMembers={setMembers}
              onUpdateParties={setParties}
            />

            {/* Quick Switch Helper */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sau khi phân bổ xong, bạn có thể chuyển về tab Bảng Nhân Sự để xem và xuất ảnh.
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 min-h-[40px]"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Xem Bảng Raid</span>
              </button>
            </div>
          </div>
        )}

        {/* Classes Quick Legend */}
        <div className="mt-8 bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                Danh Sách {CLASS_LIST.length} Môn Phái & Mã Màu Hiện Tại
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsColorModalOpen(true)}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-xs font-bold flex items-center gap-1"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Tùy chỉnh màu phái</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2">
            {CLASS_LIST.map((cls) => {
              const meta = getEffectiveClassMeta(cls, customColors);
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setIsColorModalOpen(true)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-center group"
                  title="Click để đổi màu môn phái này"
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-black/20 group-hover:scale-110 transition-transform mb-1"
                    style={{ backgroundColor: meta.bgColor }}
                  />
                  <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate w-full">
                    {cls}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">
                    {meta.shortName}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Color Customizer Modal */}
      <ColorCustomizerModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        customColors={customColors}
        onUpdateColor={handleUpdateColor}
        onResetColor={handleResetColor}
        onResetAllColors={handleResetAllColors}
        onApplyPreset={handleApplyPreset}
      />

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={setCurrentUser}
        raidTitle={fullRaidTitle}
        members={members}
        customColors={customColors}
        onImportSuccess={handleImportSuccess}
      />

      {/* Export / Share Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tableRef={tableRef}
        raidTitle={fullRaidTitle}
        members={members}
        customColors={customColors}
      />
    </div>
  );
}
