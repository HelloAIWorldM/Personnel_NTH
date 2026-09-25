import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'firebase/auth';
import { initAuth } from './services/auth';
import {
  createEmptyBoard,
  CLASS_LIST,
  DEFAULT_RAID_PARTIES,
  getEffectiveClassMeta,
} from './constants/classes';
import {
  RaidMember,
  RaidClass,
  CustomClassColors,
  RaidParty,
  RaidBoard,
  PersonnelMember,
} from './types';
import { normalizeName } from './utils/duplicates';
import { RaidTable } from './components/RaidTable';
import { PersonnelStorage } from './components/PersonnelStorage';
import { PartyManager } from './components/PartyManager';
import { ClassStatsBar } from './components/ClassStatsBar';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ExportModal } from './components/ExportModal';
import { ColorCustomizerModal } from './components/ColorCustomizerModal';
import { CreateBoardModal } from './components/CreateBoardModal';
import {
  FileSpreadsheet,
  Share2,
  Users,
  Info,
  Palette,
  Table as TableIcon,
  Sun,
  Moon,
  Plus,
  Copy,
  Trash2,
  FolderPlus,
  Sparkles,
  ChevronRight,
  LayoutGrid,
  PanelRightClose,
  PanelRightOpen,
  Check,
  Calendar,
} from 'lucide-react';

const STORAGE_KEY_BOARDS = 'raid_roster_boards_v2';
const STORAGE_KEY_ACTIVE_BOARD = 'raid_roster_active_board_id_v2';
const STORAGE_KEY_PERSONNEL = 'raid_roster_personnel_pool_v2';
const STORAGE_KEY_COLORS = 'raid_roster_custom_colors_v1';
const STORAGE_KEY_THEME = 'raid_roster_theme_mode_v1';

// Legacy keys for migration
const LEGACY_STORAGE_KEY_MEMBERS = 'raid_roster_members_v1';
const LEGACY_STORAGE_KEY_CONFIG = 'raid_roster_config_v1';
const LEGACY_STORAGE_KEY_PARTIES = 'raid_roster_parties_v1';

// Blacklist of sample/mock names to purge from any browser cache
const LEAKED_SAMPLE_NAMES = new Set([
  'minos k',
  'nim k',
  'bún piu piuuu',
  'bún',
  'ferrijit',
  'back code thin',
  'syk yuuk',
  'dạ du',
  'vivy',
  'tố linhhh',
  'souu',
  'libra',
  'cửu u vương',
  'thỏbạolực',
  'hanemeii',
  'kuroba',
  'băng nhi',
  'gia cát',
  'quang minh',
]);

const isLeakedSampleName = (name?: string): boolean => {
  if (!name) return false;
  return LEAKED_SAMPLE_NAMES.has(name.trim().toLowerCase());
};

const sanitizeMember = (m: RaidMember): RaidMember => {
  return {
    ...m,
    ingame: isLeakedSampleName(m.ingame) ? '' : (m.ingame || ''),
    loggedBy: isLeakedSampleName(m.loggedBy) ? '' : (m.loggedBy || ''),
  };
};

const sanitizeBoard = (board: RaidBoard): RaidBoard => {
  return {
    ...board,
    members: (board.members || []).map(sanitizeMember),
  };
};

export default function App() {
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

  // Multiple Raid Boards State - Default clean empty boards
  const [boards, setBoards] = useState<RaidBoard[]>(() => {
    try {
      const savedBoards = localStorage.getItem(STORAGE_KEY_BOARDS);
      if (savedBoards) {
        const parsed = JSON.parse(savedBoards);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeBoard);
        }
      }
      // Migrate from legacy single-board storage if available
      const legacyMembers = localStorage.getItem(LEGACY_STORAGE_KEY_MEMBERS);
      const legacyConfig = localStorage.getItem(LEGACY_STORAGE_KEY_CONFIG);
      const legacyParties = localStorage.getItem(LEGACY_STORAGE_KEY_PARTIES);
      if (legacyMembers) {
        const parsedMembers: RaidMember[] = JSON.parse(legacyMembers);
        const parsedConfig = legacyConfig ? JSON.parse(legacyConfig) : {};
        const parsedParties: RaidParty[] = legacyParties
          ? JSON.parse(legacyParties)
          : DEFAULT_RAID_PARTIES;
        return [
          {
            id: 'board_1',
            titlePrefix: parsedConfig.titlePrefix || 'RAID 1',
            scheduleTime: parsedConfig.scheduleTime || 'MON 20:30',
            bossName: parsedConfig.bossName || 'NIÊN DU',
            members: parsedMembers.map(sanitizeMember),
            parties: parsedParties,
            createdAt: Date.now(),
          },
        ];
      }
    } catch (e) {
      console.error('Failed to load initial boards:', e);
    }
    // Default initial board with blank Ingame and Logged by
    return [createEmptyBoard(1)];
  });

  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_BOARD);
      if (savedId) return savedId;
    } catch {}
    return boards[0]?.id || 'board_1';
  });

  // Personnel Storage Pool (Ingame, Class, Logged by) - Default empty
  const [personnelPool, setPersonnelPool] = useState<PersonnelMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PERSONNEL);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(
            (p: PersonnelMember) => !isLeakedSampleName(p.ingame) && !isLeakedSampleName(p.loggedBy)
          );
        }
      }
    } catch (e) {
      console.error('Failed to load personnel pool:', e);
    }
    return [];
  });

  const [customColors, setCustomColors] = useState<CustomClassColors>(() => {
    try {
      const savedColors = localStorage.getItem(STORAGE_KEY_COLORS);
      if (savedColors) {
        return JSON.parse(savedColors);
      }
    } catch {}
    return {};
  });

  const [activeTab, setActiveTab] = useState<'table' | 'parties' | 'personnel'>('table');
  const [isPersonnelSidebarOpen, setIsPersonnelSidebarOpen] = useState<boolean>(true);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<RaidBoard | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const tableRef = useRef<HTMLDivElement | null>(null);

  // Active Board Resolver
  const activeBoard = useMemo(() => {
    return boards.find((b) => b.id === activeBoardId) || boards[0] || createEmptyBoard(1);
  }, [boards, activeBoardId]);

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

  // Save boards to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BOARDS, JSON.stringify(boards));
    } catch (e) {
      console.error('Failed to save boards:', e);
    }
  }, [boards]);

  // Save active board id to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_BOARD, activeBoardId);
    } catch (e) {
      console.error('Failed to save active board ID:', e);
    }
  }, [activeBoardId]);

  // Save personnel pool to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PERSONNEL, JSON.stringify(personnelPool));
    } catch (e) {
      console.error('Failed to save personnel pool:', e);
    }
  }, [personnelPool]);

  // Save custom colors to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLORS, JSON.stringify(customColors));
    } catch (e) {
      console.error('Failed to save custom colors:', e);
    }
  }, [customColors]);

  // Board Mutators
  const updateActiveBoard = (updates: Partial<RaidBoard>) => {
    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoard.id ? { ...b, ...updates } : b))
    );
  };

  const handleUpdateTitle = (titlePrefix: string, scheduleTime: string, bossName: string) => {
    updateActiveBoard({ titlePrefix, scheduleTime, bossName });
  };

  const handleUpdateMembers = (newMembers: RaidMember[]) => {
    updateActiveBoard({ members: newMembers });
  };

  const handleUpdateParties = (newParties: RaidParty[]) => {
    updateActiveBoard({ parties: newParties });
  };

  // Add a clean empty Board
  const handleAddNewSampleBoard = () => {
    handleAddNewEmptyBoard();
  };

  // Add a clean empty Board
  const handleAddNewEmptyBoard = () => {
    const nextNumber = boards.length + 1;
    const newBoard = createEmptyBoard(nextNumber);
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    showToast(`Đã tạo thành công "${newBoard.titlePrefix}"!`);
  };

  // Custom Board creation handler from Modal
  const handleCreateCustomBoard = (newBoard: RaidBoard) => {
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    showToast(`Đã tạo thành công "${newBoard.titlePrefix}"!`);
  };

  // Duplicate current Board
  const handleDuplicateActiveBoard = () => {
    const timestamp = Date.now();
    const nextNumber = boards.length + 1;
    const duplicated: RaidBoard = {
      ...activeBoard,
      id: `board_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      titlePrefix: `${activeBoard.titlePrefix} (Bản sao)`,
      createdAt: timestamp,
      members: activeBoard.members.map((m) => ({
        ...m,
        id: `m_${timestamp}_${m.stt}`,
      })),
    };
    setBoards((prev) => [...prev, duplicated]);
    setActiveBoardId(duplicated.id);
  };

  // Delete Board
  const handleDeleteBoard = (boardId: string) => {
    if (boards.length <= 1) {
      showToast('Cần giữ lại ít nhất 1 bảng Raid!');
      return;
    }
    const target = boards.find((b) => b.id === boardId);
    if (target) {
      setBoardToDelete(target);
    }
  };

  const confirmDeleteBoard = () => {
    if (!boardToDelete) return;
    const boardId = boardToDelete.id;
    const remaining = boards.filter((b) => b.id !== boardId);
    setBoards(remaining);
    if (activeBoardId === boardId) {
      setActiveBoardId(remaining[0].id);
    }
    setBoardToDelete(null);
    showToast(`Đã xoá "${boardToDelete.titlePrefix}"`);
  };

  // Personnel Assignment Handlers
  const handleAssignPersonnelToRaid = (
    person: PersonnelMember,
    targetStt?: number
  ) => {
    const currentMembers = [...activeBoard.members];

    if (targetStt !== undefined) {
      // Assign to specific STT slot
      const updated = currentMembers.map((m) =>
        m.stt === targetStt
          ? {
              ...m,
              ingame: person.ingame,
              className: person.className,
              loggedBy: person.loggedBy || person.ingame,
            }
          : m
      );
      updateActiveBoard({ members: updated });
      return;
    }

    // Find first empty slot (ingame is empty or blank)
    const emptyIndex = currentMembers.findIndex(
      (m) => !m.ingame || m.ingame.trim() === ''
    );

    if (emptyIndex !== -1) {
      currentMembers[emptyIndex] = {
        ...currentMembers[emptyIndex],
        ingame: person.ingame,
        className: person.className,
        loggedBy: person.loggedBy || person.ingame,
      };
      updateActiveBoard({ members: currentMembers });
    } else {
      // Append a new slot to raid
      const nextStt = currentMembers.length + 1;
      const lastParty =
        currentMembers.length > 0
          ? currentMembers[currentMembers.length - 1].party || 1
          : 1;
      const newMember: RaidMember = {
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        stt: nextStt,
        ingame: person.ingame,
        className: person.className,
        loggedBy: person.loggedBy || person.ingame,
        party: lastParty,
      };
      updateActiveBoard({ members: [...currentMembers, newMember] });
    }
  };

  const handleRemoveFromRaid = (ingame: string) => {
    const targetNorm = normalizeName(ingame);
    if (!targetNorm) return;

    // Clear ingame and loggedBy in the slot
    const updated = activeBoard.members.map((m) => {
      if (normalizeName(m.ingame) === targetNorm) {
        return { ...m, ingame: '', loggedBy: '' };
      }
      return m;
    });
    updateActiveBoard({ members: updated });
  };

  const handleSyncFromActiveRaid = () => {
    const currentPoolIngames = new Set(
      personnelPool.map((p) => normalizeName(p.ingame))
    );
    const toAdd: PersonnelMember[] = [];

    activeBoard.members.forEach((m) => {
      const norm = normalizeName(m.ingame);
      if (norm && !currentPoolIngames.has(norm)) {
        currentPoolIngames.add(norm);
        toAdd.push({
          id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          ingame: m.ingame.trim(),
          className: m.className,
          loggedBy: (m.loggedBy || m.ingame).trim(),
          createdAt: Date.now(),
        });
      }
    });

    if (toAdd.length > 0) {
      setPersonnelPool((prev) => [...toAdd, ...prev]);
      showToast(`Đã lưu thêm ${toAdd.length} nhân sự mới từ bảng Raid vào Kho lưu trữ!`);
    } else {
      showToast('Tất cả nhân sự trong bảng Raid hiện tại đã có trong Kho lưu trữ.');
    }
  };

  // Color Customizer Handlers
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

  const handleImportSuccess = (imported: {
    title?: string;
    members: RaidMember[];
  }) => {
    if (imported.members && imported.members.length > 0) {
      const normalized = imported.members.map((m, idx) => ({
        ...m,
        party: m.party || (idx < 6 ? 1 : 2),
      }));
      let newTitlePrefix = activeBoard.titlePrefix;
      let newScheduleTime = activeBoard.scheduleTime;
      let newBossName = activeBoard.bossName;

      if (imported.title) {
        const parts = imported.title.split('-');
        if (parts.length > 1) {
          newTitlePrefix = parts[0].trim();
          const sub = parts[1].trim().split(' ');
          if (sub.length >= 2) {
            newScheduleTime = `${sub[0]} ${sub[1]}`;
            newBossName = sub.slice(2).join(' ') || 'NIÊN DU';
          } else {
            newBossName = parts[1].trim();
          }
        } else {
          newTitlePrefix = imported.title;
        }
      }

      updateActiveBoard({
        titlePrefix: newTitlePrefix,
        scheduleTime: newScheduleTime,
        bossName: newBossName,
        members: normalized,
      });
    }
  };

  const fullRaidTitle = `${activeBoard.titlePrefix} - ${activeBoard.scheduleTime} ${activeBoard.bossName}`;
  const customizedCount = Object.keys(customColors).length;

  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-16">
      {/* Top Header Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950 dark:bg-indigo-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs shrink-0">
              RD
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-base leading-tight truncate">
                Sắp Xếp Nhân Sự Raid
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                {boards.length} bảng Raid • Lưu trữ Ingame, Class & Logged by • Kéo thả xếp vị trí
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              id="btn-toggle-dark-mode"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center justify-center p-2 sm:px-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] min-w-[38px]"
              title={
                isDarkMode
                  ? 'Chuyển sang chế độ sáng'
                  : 'Chuyển sang chế độ tối (giảm mỏi mắt)'
              }
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
              <span className="hidden lg:inline ml-1.5 text-xs">
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
              <span className="hidden sm:inline">Xuất ảnh</span>
              <span className="sm:hidden text-[11px]">Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5">
        {/* Raid Board Selector Bar */}
        <section className="mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-2xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Active Raid Boards Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar flex-1">
              {boards.map((board, idx) => {
                const isActive = board.id === activeBoard.id;
                const filledCount = board.members.filter(
                  (m) => m.ingame && m.ingame.trim() !== ''
                ).length;

                return (
                  <div
                    key={board.id}
                    onClick={() => setActiveBoardId(board.id)}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all shrink-0 select-none ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">
                      {board.titlePrefix} • {board.scheduleTime}
                    </span>

                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {filledCount}/{board.members.length}
                    </span>

                    {/* Delete Board trigger */}
                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBoard(board.id);
                        }}
                        title="Xoá bảng Raid này"
                        className={`p-0.5 rounded hover:bg-black/20 ${
                          isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-red-500'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Inline Add New Board Tab Button */}
              <button
                type="button"
                id="btn-tab-add-board"
                onClick={() => setIsCreateBoardModalOpen(true)}
                title={`Tạo bảng Raid mới (ví dụ RAID ${boards.length + 1})`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-indigo-400 dark:border-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all shrink-0 shadow-2xs hover:scale-105 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>+ Thêm Bảng (Raid {boards.length + 1})</span>
              </button>
            </div>

            {/* Board Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-open-create-board-modal"
                onClick={() => setIsCreateBoardModalOpen(true)}
                title={`Mở hộp thoại tạo bảng Raid mới (ví dụ RAID ${boards.length + 1})`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-xs min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tạo Bảng Raid</span>
              </button>

              <button
                type="button"
                id="btn-duplicate-board"
                onClick={handleDuplicateActiveBoard}
                title="Nhân bản bảng Raid hiện tại"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all min-h-[36px]"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nhân bản</span>
              </button>
            </div>
          </div>
        </section>

        {/* Composition Summary Bar for Active Board */}
        <ClassStatsBar
          members={activeBoard.members}
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

        {/* Navigation Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              id="tab-view-table"
              onClick={() => setActiveTab('table')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                activeTab === 'table'
                  ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <TableIcon className="w-4 h-4 shrink-0" />
              <span>📋 Bảng Xếp Raid</span>
            </button>

            <button
              type="button"
              id="tab-view-personnel"
              onClick={() => setActiveTab('personnel')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                activeTab === 'personnel'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>👥 Kho Nhân Sự</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'personnel'
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {personnelPool.length}
              </span>
            </button>

            <button
              type="button"
              id="tab-view-parties"
              onClick={() => setActiveTab('parties')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                activeTab === 'parties'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>🛡️ Phân Nhóm PT</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'parties'
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {activeBoard.parties?.length || 2}
              </span>
            </button>
          </div>

          {activeTab === 'table' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsPersonnelSidebarOpen(!isPersonnelSidebarOpen)}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                title="Bật/Tắt khung kéo thả Kho Nhân Sự bên cạnh bảng"
              >
                {isPersonnelSidebarOpen ? (
                  <>
                    <PanelRightClose className="w-4 h-4" />
                    <span>Ẩn Kho Nhân Sự</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-4 h-4" />
                    <span>Hiện Kho Nhân Sự để Kéo Thả</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Main Table View with Side-by-Side Drag-Drop Personnel Storage */}
        <div className={activeTab === 'table' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Raid Table Column */}
            <div
              className={`transition-all ${
                isPersonnelSidebarOpen ? 'lg:col-span-7 xl:col-span-7' : 'lg:col-span-12'
              }`}
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col items-center transition-colors">
                <RaidTable
                  titlePrefix={activeBoard.titlePrefix}
                  scheduleTime={activeBoard.scheduleTime}
                  bossName={activeBoard.bossName}
                  members={activeBoard.members}
                  parties={activeBoard.parties || DEFAULT_RAID_PARTIES}
                  customColors={customColors}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateMembers={handleUpdateMembers}
                  onOpenColorCustomizer={() => setIsColorModalOpen(true)}
                  tableRef={tableRef}
                  selectedClassFilter={selectedClassFilter}
                />
              </div>
            </div>

            {/* Draggable Personnel Pool Sidebar Column */}
            {isPersonnelSidebarOpen && (
              <div className="lg:col-span-5 xl:col-span-5 sticky top-20">
                <PersonnelStorage
                  personnelPool={personnelPool}
                  onUpdatePersonnelPool={setPersonnelPool}
                  activeRaidMembers={activeBoard.members}
                  onAssignToRaid={handleAssignPersonnelToRaid}
                  onRemoveFromRaid={handleRemoveFromRaid}
                  onSyncFromActiveRaid={handleSyncFromActiveRaid}
                  customColors={customColors}
                  isCompact={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab 2: Full Personnel Storage View */}
        {activeTab === 'personnel' && (
          <div className="max-w-4xl mx-auto">
            <PersonnelStorage
              personnelPool={personnelPool}
              onUpdatePersonnelPool={setPersonnelPool}
              activeRaidMembers={activeBoard.members}
              onAssignToRaid={handleAssignPersonnelToRaid}
              onRemoveFromRaid={handleRemoveFromRaid}
              onSyncFromActiveRaid={handleSyncFromActiveRaid}
              customColors={customColors}
              isCompact={false}
            />
          </div>
        )}

        {/* Tab 3: Party Manager View */}
        {activeTab === 'parties' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <PartyManager
              members={activeBoard.members}
              parties={activeBoard.parties || DEFAULT_RAID_PARTIES}
              customColors={customColors}
              onUpdateMembers={handleUpdateMembers}
              onUpdateParties={handleUpdateParties}
            />

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sau khi phân bổ xong, bạn có thể chuyển về tab Bảng Xếp Raid để xem và xuất ảnh.
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
        members={activeBoard.members}
        customColors={customColors}
        onImportSuccess={handleImportSuccess}
      />

      {/* Export / Share Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tableRef={tableRef}
        raidTitle={fullRaidTitle}
        members={activeBoard.members}
        customColors={customColors}
      />

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        nextBoardNumber={boards.length + 1}
        currentBoardTitle={activeBoard.titlePrefix}
        currentBoardMembers={activeBoard.members}
        onCreateBoard={handleCreateCustomBoard}
      />

      {/* Delete Board Confirmation Modal */}
      {boardToDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    Xoá Bảng Raid?
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Bạn có chắc muốn xoá bảng{' '}
                    <strong className="text-slate-900 dark:text-white font-black">
                      "{boardToDelete.titlePrefix}"
                    </strong>{' '}
                    ({boardToDelete.scheduleTime}) không?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBoardToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteBoard}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xác nhận xoá</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Floating Toast Notification */}
      {toastMessage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-5 right-5 z-[100] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
