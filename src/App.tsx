import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'firebase/auth';
import { initAuth } from './services/auth';
import {
  createEmptyBoard,
  RAID1_DEFAULT_EMPTY_MEMBERS,
  INITIAL_PERSONNEL_POOL,
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
  GuildWarBoard,
  GuildMember,
  AppMode,
  PersonnelSubPool,
} from './types';
import { createEmptyGuildWarBoard } from './constants/guildWarDefaults';
import { CreateGuildWarModal } from './components/GuildWar/CreateGuildWarModal';
import { GuildWarBoardView } from './components/GuildWar/GuildWarBoardView';
import { normalizeName, deduplicatePersonnelList } from './utils/duplicates';
import { RaidTable } from './components/RaidTable';
import { PersonnelStorage } from './components/PersonnelStorage';
import { SharePersonnelModal } from './components/SharePersonnelModal';
import { PartyManager } from './components/PartyManager';
import { ClassStatsBar } from './components/ClassStatsBar';
import { DolphinAquaBackground } from './components/DolphinAquaBackground';
import { DolphinLogo } from './components/DolphinLogo';
import { CowStrawberryBackground } from './components/CowStrawberryBackground';
import { CowLogo } from './components/CowLogo';
import { FrogPondBackground } from './components/FrogPondBackground';
import { FrogLogo } from './components/FrogLogo';
import { ThemeModal, AppThemeKey } from './components/ThemeModal';
import { FeedbackChatbox } from './components/FeedbackChatbox';
import { ExportModal } from './components/ExportModal';
import { CreateBoardModal } from './components/CreateBoardModal';
import { AllBoardsOverview } from './components/AllBoardsOverview';
import { CopyPersonnelToUpdateModal } from './components/CopyPersonnelToUpdateModal';
import { VerticalBoardList } from './components/VerticalBoardList';
import { DiBuiStorage } from './components/DiBuiStorage';
import {
  Share2,
  Users,
  Info,
  ShieldCheck,
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
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Check,
  Calendar,
  Swords,
  Coffee,
  Cloud,
  Image as ImageIcon,
  AlertTriangle,
  Database,
  X,
} from 'lucide-react';
import { CloudSyncModal } from './components/CloudSyncModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { DonateModal } from './components/DonateModal';
import { ImportRaidImageModal } from './components/ImportRaidImageModal';
import { checkAndRunAutoDailyBackup } from './services/backupService';
import {
  pushToCloud,
  pullFromCloud,
  subscribeToCloud,
  GLOBAL_GUILD_ID,
  CloudGuildData,
} from './services/cloudSync';
import {
  STORAGE_KEY_BOARDS,
  STORAGE_KEY_ACTIVE_BOARD,
  STORAGE_KEY_PERSONNEL,
  STORAGE_KEY_COLORS,
  STORAGE_KEY_THEME,
  STORAGE_KEY_GUILDWAR_BOARDS,
  STORAGE_KEY_ACTIVE_GUILDWAR,
  STORAGE_KEY_APP_MODE,
  STORAGE_KEY_BOARDS_UPDATE,
  STORAGE_KEY_ACTIVE_BOARD_UPDATE,
  STORAGE_KEY_PERSONNEL_UPDATE,
  STORAGE_KEY_PERSONNEL_DI_BUI,
  STORAGE_KEY_MASTER_PERSONNEL,
  STORAGE_KEY_GUILDWAR_PERSONNEL,
  loadInitialBoards,
  loadInitialPersonnel,
  loadInitialGuildWarBoards,
  loadInitialUpdateBoards,
  loadInitialUpdatePersonnel,
  loadInitialDiBuiPersonnel,
  loadInitialMasterPersonnel,
  loadInitialGuildWarPersonnel,
  saveAutoSnapshot,
  flushAllStorageSync,
  parseShareHash,
  parseGuildWarShareHash,
  saveToIndexedDB,
  recoverAsyncFromIndexedDB,
  countMembersWithData,
  countGuildWarMembers,
  safeLocalStorageSet,
  requestPersistentStorage,
  isSamplePersonnelPool,
  mergePersonnelPools,
  syncGuildWarMembersToMasterPool,
  syncGuildWarMembersToGuildWarPersonnelPool,
} from './utils/storageBackup';

export default function App() {
  // Dark Mode State - Default to false (Frog Lilypond nature theme)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return false; // Default to Frog Lilypond theme
    } catch {
      return false;
    }
  });

  // Mascot Theme Selection State: 'dolphin' | 'cow' | 'frog'
  const [appTheme, setAppTheme] = useState<AppThemeKey>(() => {
    try {
      const saved = localStorage.getItem('nth_app_theme');
      if (saved === 'cow' || saved === 'frog' || saved === 'dolphin') {
        return saved;
      }
    } catch {}
    return 'dolphin';
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  const handleSelectTheme = (theme: AppThemeKey) => {
    setAppTheme(theme);
    safeLocalStorageSet('nth_app_theme', theme);
  };

  // Multiple Raid Boards State - Multi-layer persistence
  const [boards, setBoards] = useState<RaidBoard[]>(() => {
    return loadInitialBoards().boards;
  });

  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    const init = loadInitialBoards();
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_BOARD);
      if (savedId && init.boards.some((b) => b.id === savedId)) return savedId;
    } catch {}
    return init.activeBoardId;
  });

  // Master Personnel Storage Pool (Tổng Kho Nhân Sự) - Multi-layer persistence
  const [masterPersonnelPool, setMasterPersonnelPool] = useState<PersonnelMember[]>(() => {
    return loadInitialMasterPersonnel([]);
  });

  // Personnel Storage Pool (Kho con Raid) - Multi-layer persistence
  const [personnelPool, setPersonnelPool] = useState<PersonnelMember[]>(() => {
    return loadInitialPersonnel([]);
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

  const [activeTab, setActiveTab] = useState<'table' | 'parties' | 'personnel' | 'all-boards'>('table');
  const [isPersonnelSidebarOpen, setIsPersonnelSidebarOpen] = useState<boolean>(true);
  const [isBoardNavOpen, setIsBoardNavOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('raid_roster_board_nav_open_v1');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('raid_roster_board_nav_open_v1', String(isBoardNavOpen));
    } catch {}
  }, [isBoardNavOpen]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [isCreateGuildWarModalOpen, setIsCreateGuildWarModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<number | null>(null);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isImportImageModalOpen, setIsImportImageModalOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<RaidBoard | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isRemoteIncomingRef = useRef(false);
  const lastLocalEditTimeRef = useRef(0);

  // App Mode: 'RAID' (Bảng Raid), 'RAID_UPDATE' (Bảng Raid Update), or 'GUILD_WAR' (Bảng Bang Chiến)
  const [appMode, setAppMode] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APP_MODE);
      if (saved === 'GUILD_WAR' || saved === 'RAID' || saved === 'RAID_UPDATE') return saved as AppMode;
    } catch {}
    return 'RAID';
  });

  // Multiple Raid Update Boards State - Multi-layer persistence
  const [updateBoards, setUpdateBoards] = useState<RaidBoard[]>(() => {
    return loadInitialUpdateBoards().boards;
  });

  const [activeUpdateBoardId, setActiveUpdateBoardId] = useState<string>(() => {
    const init = loadInitialUpdateBoards();
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_BOARD_UPDATE);
      if (savedId && init.boards.some((b) => b.id === savedId)) return savedId;
    } catch {}
    return init.activeBoardId;
  });

  // Separate Personnel Pool for Raid Update (Kho con Raid Update)
  const [updatePersonnelPool, setUpdatePersonnelPool] = useState<PersonnelMember[]>(() => {
    return loadInitialUpdatePersonnel([]);
  });

  // Separate Personnel Pool for Kho Đi Bụi (chứa nhân sự tạm nghỉ / chờ quay lại game)
  const [diBuiPersonnelPool, setDiBuiPersonnelPool] = useState<PersonnelMember[]>(() => {
    return loadInitialDiBuiPersonnel([]);
  });

  // Separate Personnel Pool for Bang Chiến (Kho con Bang Chiến)
  const [guildWarPersonnelPool, setGuildWarPersonnelPool] = useState<PersonnelMember[]>(() => {
    return loadInitialGuildWarPersonnel([]);
  });

  // Active pool view in Personnel Storage: 'master' | 'raid' | 'raid_update' | 'guild_war'
  const [activePoolView, setActivePoolView] = useState<'master' | 'raid' | 'raid_update' | 'guild_war'>('master');

  // Share Personnel Modal State
  const [isSharePersonnelModalOpen, setIsSharePersonnelModalOpen] = useState<boolean>(false);
  const [shareModalTargetPool, setShareModalTargetPool] = useState<PersonnelSubPool | undefined>(undefined);

  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Multiple Guild War Boards State - Multi-layer persistence
  const [guildWarBoards, setGuildWarBoards] = useState<GuildWarBoard[]>(() => {
    return loadInitialGuildWarBoards().boards;
  });

  const [activeGuildWarBoardId, setActiveGuildWarBoardId] = useState<string>(() => {
    return loadInitialGuildWarBoards().activeBoardId;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const tableRef = useRef<HTMLDivElement | null>(null);

  const isRaidUpdate = appMode === 'RAID_UPDATE';

  // Active Board Resolver for Standard Raid
  const activeRaidBoard = useMemo(() => {
    return boards.find((b) => b.id === activeBoardId) || boards[0] || createEmptyBoard(1);
  }, [boards, activeBoardId]);

  // Active Board Resolver for Raid Update
  const activeUpdateBoard = useMemo(() => {
    return (
      updateBoards.find((b) => b.id === activeUpdateBoardId) ||
      updateBoards[0] ||
      createEmptyBoard(1)
    );
  }, [updateBoards, activeUpdateBoardId]);

  // Dynamic pointers based on whether we are in Raid or Raid Update
  const activeBoard = isRaidUpdate ? activeUpdateBoard : activeRaidBoard;
  const currentBoards = isRaidUpdate ? updateBoards : boards;

  // Personnel pool currently displayed and operated on in PersonnelStorage
  const currentPersonnelPool = useMemo(() => {
    switch (activePoolView) {
      case 'master':
        return masterPersonnelPool;
      case 'raid':
        return personnelPool;
      case 'raid_update':
        return updatePersonnelPool;
      case 'guild_war':
        return guildWarPersonnelPool;
      default:
        return masterPersonnelPool;
    }
  }, [
    activePoolView,
    masterPersonnelPool,
    personnelPool,
    updatePersonnelPool,
    guildWarPersonnelPool,
  ]);

  const subPoolMembershipMap = useMemo(() => {
    return {
      inRaid: new Set(personnelPool.map((p) => normalizeName(p.ingame)).filter(Boolean)),
      inUpdate: new Set(updatePersonnelPool.map((p) => normalizeName(p.ingame)).filter(Boolean)),
      inGuildWar: new Set(guildWarPersonnelPool.map((p) => normalizeName(p.ingame)).filter(Boolean)),
    };
  }, [personnelPool, updatePersonnelPool, guildWarPersonnelPool]);

  const poolCounts = useMemo(() => {
    return {
      master: masterPersonnelPool.length,
      raid: personnelPool.length,
      update: updatePersonnelPool.length,
      guildWar: guildWarPersonnelPool.length,
    };
  }, [
    masterPersonnelPool.length,
    personnelPool.length,
    updatePersonnelPool.length,
    guildWarPersonnelPool.length,
  ]);

  // Active Guild War Board Resolver
  const activeGuildWarBoard = useMemo(() => {
    return (
      guildWarBoards.find((b) => b.id === activeGuildWarBoardId) ||
      guildWarBoards[0] ||
      createEmptyGuildWarBoard(1)
    );
  }, [guildWarBoards, activeGuildWarBoardId]);

  // Comprehensive boards representation for PersonnelStorage across Raid, Raid Update and Bang Chiến
  const allKnownBoardsForStorage = useMemo(() => {
    // 1. Bảng Raid thường
    const raidList = boards.map((b) => ({
      id: b.id,
      titlePrefix: b.titlePrefix || 'Raid 1',
      createdAt: b.createdAt,
      members: b.members,
      poolType: 'raid' as const,
    }));

    // 2. Bảng Raid Update - phân biệt rõ với Raid thường (ví dụ: Raid Up 1)
    const updateList = updateBoards.map((b) => {
      const raw = b.titlePrefix || 'Raid 1';
      const displayTitle = raw.toLowerCase().startsWith('raid ')
        ? raw.replace(/^raid\s+/i, 'Raid Up ')
        : raw.toLowerCase().includes('up')
        ? raw
        : `Up ${raw}`;
      return {
        id: b.id,
        titlePrefix: displayTitle,
        createdAt: b.createdAt,
        members: b.members,
        poolType: 'raid_update' as const,
      };
    });

    // 3. Bảng Bang Chiến
    const gwList = guildWarBoards.map((b) => ({
      id: b.id,
      titlePrefix: b.title ? b.title.replace(/^(Bang Chiến|BANG CHIẾN)\s*/i, 'BC ') : 'Bang Chiến',
      createdAt: b.createdAt,
      members: (b.members || []) as any,
      poolType: 'guild_war' as const,
    }));

    return [...raidList, ...updateList, ...gwList];
  }, [boards, updateBoards, guildWarBoards]);

  // Dedicated Board representation for PersonnelStorage based on the currently selected activePoolView
  // Ensures that Kho Raid ONLY scans and displays Raid boards, Kho Raid Update ONLY scans Update boards,
  // and Kho Bang Chiến ONLY scans Bang Chiến boards.
  const currentPoolBoardsForStorage = useMemo(() => {
    if (activePoolView === 'raid') {
      return boards.map((b) => ({
        id: b.id,
        titlePrefix: b.titlePrefix || 'Raid 1',
        createdAt: b.createdAt,
        members: b.members,
        poolType: 'raid' as const,
      }));
    }
    if (activePoolView === 'raid_update') {
      return updateBoards.map((b) => {
        const raw = b.titlePrefix || 'Raid 1';
        const displayTitle = raw.toLowerCase().startsWith('raid ')
          ? raw.replace(/^raid\s+/i, 'Raid Up ')
          : raw.toLowerCase().includes('up')
          ? raw
          : `Up ${raw}`;
        return {
          id: b.id,
          titlePrefix: displayTitle,
          createdAt: b.createdAt,
          members: b.members,
          poolType: 'raid_update' as const,
        };
      });
    }
    if (activePoolView === 'guild_war') {
      return guildWarBoards.map((b) => ({
        id: b.id,
        titlePrefix: b.title ? b.title.replace(/^(Bang Chiến|BANG CHIẾN)\s*/i, 'BC ') : 'Bang Chiến',
        createdAt: b.createdAt,
        members: (b.members || []) as any,
        poolType: 'guild_war' as const,
      }));
    }
    // Master pool: show all
    return allKnownBoardsForStorage;
  }, [activePoolView, boards, updateBoards, guildWarBoards, allKnownBoardsForStorage]);

  // Active board ID, title and members corresponding to activePoolView
  const currentPoolActiveBoardId = useMemo(() => {
    if (activePoolView === 'raid') return activeRaidBoard.id;
    if (activePoolView === 'raid_update') return activeUpdateBoard.id;
    if (activePoolView === 'guild_war') return activeGuildWarBoard.id;
    return appMode === 'GUILD_WAR'
      ? activeGuildWarBoard.id
      : isRaidUpdate
      ? activeUpdateBoard.id
      : activeRaidBoard.id;
  }, [activePoolView, activeRaidBoard.id, activeUpdateBoard.id, activeGuildWarBoard.id, appMode, isRaidUpdate]);

  const currentPoolActiveBoardTitle = useMemo(() => {
    if (activePoolView === 'raid') return activeRaidBoard.titlePrefix || 'Raid 1';
    if (activePoolView === 'raid_update') {
      const raw = activeUpdateBoard.titlePrefix || 'Raid 1';
      return raw.toLowerCase().startsWith('raid ')
        ? raw.replace(/^raid\s+/i, 'Raid Up ')
        : raw.toLowerCase().includes('up')
        ? raw
        : `Up ${raw}`;
    }
    if (activePoolView === 'guild_war') {
      return activeGuildWarBoard?.title
        ? activeGuildWarBoard.title.replace(/^(Bang Chiến|BANG CHIẾN)\s*/i, 'BC ')
        : 'Bang Chiến';
    }
    return appMode === 'GUILD_WAR'
      ? (activeGuildWarBoard?.title ? activeGuildWarBoard.title.replace(/^(Bang Chiến|BANG CHIẾN)\s*/i, 'BC ') : 'Bang Chiến')
      : isRaidUpdate
      ? activeUpdateBoard.titlePrefix
      : activeRaidBoard.titlePrefix;
  }, [activePoolView, activeRaidBoard.titlePrefix, activeUpdateBoard.titlePrefix, activeGuildWarBoard?.title, appMode, isRaidUpdate]);

  const currentPoolActiveMembers = useMemo(() => {
    if (activePoolView === 'raid') return activeRaidBoard.members;
    if (activePoolView === 'raid_update') return activeUpdateBoard.members;
    if (activePoolView === 'guild_war') return (activeGuildWarBoard?.members as any) || [];
    return appMode === 'GUILD_WAR'
      ? (activeGuildWarBoard?.members as any) || []
      : isRaidUpdate
      ? activeUpdateBoard.members
      : activeRaidBoard.members;
  }, [activePoolView, activeRaidBoard.members, activeUpdateBoard.members, activeGuildWarBoard?.members, appMode, isRaidUpdate]);

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

  const [isStorageHydrated, setIsStorageHydrated] = useState(false);

  // Helper áp dụng dữ liệu từ Cloud Firestore vào toàn bộ state và storage an toàn
  const applyCloudDataToState = useCallback((cd: CloudGuildData) => {
    isRemoteIncomingRef.current = true;
    try {
      if (cd.boards && cd.boards.length > 0) {
        setBoards(cd.boards);
        safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(cd.boards));
        saveToIndexedDB('boards', cd.boards);
        if (cd.activeBoardId) {
          setActiveBoardId(cd.activeBoardId);
          safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD, cd.activeBoardId);
        }
      }
      if (cd.personnelPool) {
        setPersonnelPool(cd.personnelPool);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(cd.personnelPool));
        saveToIndexedDB('personnelPool', cd.personnelPool);
      }
      if (cd.masterPersonnelPool) {
        setMasterPersonnelPool(cd.masterPersonnelPool);
        safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(cd.masterPersonnelPool));
        saveToIndexedDB('masterPersonnelPool', cd.masterPersonnelPool);
      }
      if (cd.guildWarBoards && cd.guildWarBoards.length > 0) {
        setGuildWarBoards(cd.guildWarBoards);
        safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(cd.guildWarBoards));
        saveToIndexedDB('guildWarBoards', cd.guildWarBoards);
        if (cd.activeGuildWarBoardId) {
          setActiveGuildWarBoardId(cd.activeGuildWarBoardId);
          safeLocalStorageSet(STORAGE_KEY_ACTIVE_GUILDWAR, cd.activeGuildWarBoardId);
        }
      }
      if (cd.guildWarPersonnelPool) {
        setGuildWarPersonnelPool(cd.guildWarPersonnelPool);
        safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(cd.guildWarPersonnelPool));
        saveToIndexedDB('guildWarPersonnelPool', cd.guildWarPersonnelPool);
      }
      if (cd.updateBoards && cd.updateBoards.length > 0) {
        setUpdateBoards(cd.updateBoards);
        safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(cd.updateBoards));
        saveToIndexedDB('updateBoards', cd.updateBoards);
        if (cd.activeUpdateBoardId) {
          setActiveUpdateBoardId(cd.activeUpdateBoardId);
          safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD_UPDATE, cd.activeUpdateBoardId);
          saveToIndexedDB('activeUpdateBoardId', cd.activeUpdateBoardId);
        }
      }
      if (cd.updatePersonnelPool) {
        setUpdatePersonnelPool(cd.updatePersonnelPool);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(cd.updatePersonnelPool));
        saveToIndexedDB('updatePersonnelPool', cd.updatePersonnelPool);
      }
      if (cd.diBuiPersonnelPool) {
        setDiBuiPersonnelPool(cd.diBuiPersonnelPool);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(cd.diBuiPersonnelPool));
        saveToIndexedDB('diBuiPersonnelPool', cd.diBuiPersonnelPool);
      }
      if (cd.customColors && Object.keys(cd.customColors).length > 0) {
        setCustomColors(cd.customColors);
        safeLocalStorageSet(STORAGE_KEY_COLORS, JSON.stringify(cd.customColors));
        saveToIndexedDB('customColors', cd.customColors);
      }
      if (cd.updatedAt) {
        setLastCloudSyncTime(cd.updatedAt);
      }
    } finally {
      setTimeout(() => {
        isRemoteIncomingRef.current = false;
      }, 500);
    }
  }, []);

  // Initialize and recover from IndexedDB if localStorage was cleared, and listen for share links
  useEffect(() => {
    let isMounted = true;

    async function initializeAndRecover() {
      try {
        // 0. Yêu cầu quyền lưu trữ vĩnh viễn (Persistent Storage) từ trình duyệt
        await requestPersistentStorage();

        const hash = typeof window !== 'undefined' ? window.location.hash : '';

        // 1. Kiểm tra link chia sẻ Bang Chiến (#share_gw=...)
        if (hash && hash.includes('#share_gw=')) {
          const sharedGw = parseGuildWarShareHash(hash);
          if (sharedGw && isMounted) {
            setGuildWarBoards((prev) => {
              const exists = prev.find((b) => b.id === sharedGw.id);
              if (exists) return prev;
              return [...prev, sharedGw];
            });
            setActiveGuildWarBoardId(sharedGw.id);
            setAppMode('GUILD_WAR');
            showToast(`Đã nạp bảng Bang Chiến "${sharedGw.title}" từ link chia sẻ!`);
            setIsStorageHydrated(true);
            return;
          }
        }

        // 2. Kiểm tra link chia sẻ Raid (#share=...)
        if (hash && hash.includes('#share=')) {
          const sharedBoard = parseShareHash(hash);
          if (sharedBoard && isMounted) {
            setBoards((prev) => {
              const exists = prev.find((b) => b.id === sharedBoard.id);
              if (exists) return prev;
              return [...prev, sharedBoard];
            });
            setActiveBoardId(sharedBoard.id);
            setAppMode('RAID');
            showToast(`Đã nạp bảng "${sharedBoard.titlePrefix}" từ link chia sẻ!`);
            setIsStorageHydrated(true);
            return;
          }
        }

        // 3. Phục hồi và bảo toàn dữ liệu đa tầng từ IndexedDB
        const recovered = await recoverAsyncFromIndexedDB();
        if (recovered && isMounted) {
          let hasRestoredAny = false;

          // A. Phục hồi / Hợp nhất Kho Nhân Sự:
          if (recovered.personnelPool && recovered.personnelPool.length > 0) {
            setPersonnelPool((currentPool) => {
              const merged = mergePersonnelPools(currentPool, recovered.personnelPool!);
              if (merged.length !== currentPool.length) {
                console.info(
                  '[Storage] Tự động hợp nhất Kho Nhân sự từ IndexedDB & LocalStorage:',
                  merged.length
                );
                safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(merged));
                hasRestoredAny = true;
                return merged;
              }
              return currentPool;
            });
          }

          // B. Phục hồi Bảng Raid nếu LocalStorage hiện rỗng hoặc ít dữ liệu hơn IndexedDB:
          if (recovered.boards && recovered.boards.length > 0) {
            setBoards((currentBoards) => {
              const currentRaidCount = countMembersWithData(currentBoards);
              const idbCount = countMembersWithData(recovered.boards!);
              if (currentRaidCount === 0 && idbCount > 0) {
                console.info('[Storage] Tự động phục hồi Bảng Raid từ IndexedDB:', idbCount, 'thành viên');
                safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(recovered.boards!));
                if (recovered.activeBoardId) {
                  setActiveBoardId(recovered.activeBoardId);
                  safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD, recovered.activeBoardId);
                }
                hasRestoredAny = true;
                return recovered.boards!;
              }
              return currentBoards;
            });
          }

          // C. Phục hồi Bảng Bang Chiến nếu LocalStorage hiện rỗng hoặc ít dữ liệu hơn:
          if (recovered.guildWarBoards && recovered.guildWarBoards.length > 0) {
            setGuildWarBoards((currentGw) => {
              const currentGwCount = countGuildWarMembers(currentGw);
              const idbGwCount = countGuildWarMembers(recovered.guildWarBoards!);
              if (currentGwCount === 0 && idbGwCount > 0) {
                console.info(
                  '[Storage] Tự động phục hồi Bảng Bang Chiến từ IndexedDB:',
                  idbGwCount,
                  'thành viên'
                );
                safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(recovered.guildWarBoards!));
                if (recovered.activeGuildWarBoardId) {
                  setActiveGuildWarBoardId(recovered.activeGuildWarBoardId);
                  safeLocalStorageSet(STORAGE_KEY_ACTIVE_GUILDWAR, recovered.activeGuildWarBoardId);
                }
                hasRestoredAny = true;
                return recovered.guildWarBoards!;
              }
              return currentGw;
            });
          }

          // D. Phục hồi Custom Colors:
          if (
            recovered.customColors &&
            Object.keys(recovered.customColors).length > 0 &&
            Object.keys(customColors).length === 0
          ) {
            setCustomColors(recovered.customColors);
          }

          // E. Phục hồi Bảng Raid Update & Kho Nhân sự Raid Update:
          if (recovered.updateBoards && recovered.updateBoards.length > 0) {
            setUpdateBoards((current) => {
              const curCount = countMembersWithData(current);
              const idbCount = countMembersWithData(recovered.updateBoards!);
              if (curCount === 0 && idbCount > 0) {
                console.info('[Storage] Tự động phục hồi Bảng Raid Update từ IndexedDB:', idbCount, 'thành viên');
                safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(recovered.updateBoards!));
                if (recovered.activeUpdateBoardId) {
                  setActiveUpdateBoardId(recovered.activeUpdateBoardId);
                  safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD_UPDATE, recovered.activeUpdateBoardId);
                }
                hasRestoredAny = true;
                return recovered.updateBoards!;
              }
              return current;
            });
          }
          if (recovered.updatePersonnelPool && recovered.updatePersonnelPool.length > 0) {
            setUpdatePersonnelPool((currentPool) => {
              const merged = mergePersonnelPools(currentPool, recovered.updatePersonnelPool!);
              if (merged.length !== currentPool.length) {
                console.info('[Storage] Tự động phục hồi Kho Nhân sự Raid Update từ IndexedDB:', merged.length);
                safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(merged));
                hasRestoredAny = true;
                return merged;
              }
              return currentPool;
            });
          }
          if (recovered.diBuiPersonnelPool && recovered.diBuiPersonnelPool.length > 0) {
            setDiBuiPersonnelPool((currentPool) => {
              const merged = mergePersonnelPools(currentPool, recovered.diBuiPersonnelPool!);
              if (merged.length !== currentPool.length) {
                console.info('[Storage] Tự động phục hồi Kho Đi Bụi từ IndexedDB:', merged.length);
                safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(merged));
                hasRestoredAny = true;
                return merged;
              }
              return currentPool;
            });
          }

          // F. Phục hồi Tổng Kho Nhân Sự từ IndexedDB nếu LocalStorage hiện rỗng:
          if (recovered.masterPersonnelPool && recovered.masterPersonnelPool.length > 0) {
            setMasterPersonnelPool((currentPool) => {
              if (currentPool.length === 0) {
                console.info('[Storage] Tự động phục hồi Tổng Kho Nhân Sự từ IndexedDB:', recovered.masterPersonnelPool!.length);
                safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(recovered.masterPersonnelPool!));
                hasRestoredAny = true;
                return recovered.masterPersonnelPool!;
              }
              return currentPool;
            });
          }

          // G. Phục hồi Kho Bang Chiến từ IndexedDB nếu LocalStorage hiện rỗng:
          if (recovered.guildWarPersonnelPool && recovered.guildWarPersonnelPool.length > 0) {
            setGuildWarPersonnelPool((currentPool) => {
              if (currentPool.length === 0) {
                console.info('[Storage] Tự động phục hồi Kho Bang Chiến từ IndexedDB:', recovered.guildWarPersonnelPool!.length);
                safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(recovered.guildWarPersonnelPool!));
                hasRestoredAny = true;
                return recovered.guildWarPersonnelPool!;
              }
              return currentPool;
            });
          }

          if (hasRestoredAny) {
            showToast('Đã tự động bảo toàn & phục hồi dữ liệu an toàn từ IndexedDB!');
          }
        }

        // 4. Khôi phục từ Firestore Cloud database duy nhất (GLOBAL_GUILD_ID)
        try {
          const cloudRes = await pullFromCloud(GLOBAL_GUILD_ID);
          if (cloudRes.success && cloudRes.data && isMounted) {
            const cd = cloudRes.data;
            const cloudTotal =
              (cd.masterPersonnelPool?.length || 0) +
              (cd.personnelPool?.length || 0) +
              (cd.boards?.length || 0) +
              (cd.guildWarBoards?.length || 0) +
              (cd.updateBoards?.length || 0);

            if (cloudTotal > 0) {
              applyCloudDataToState(cd);
              console.info('[CloudSync] Đã nạp thành công dữ liệu từ Cloud Master:', cd.updatedAt);
            } else {
              // Cloud chưa có dữ liệu nhưng máy local đang có dữ liệu -> Đẩy dữ liệu khởi tạo lên Cloud
              const localHasData =
                boards.length > 0 ||
                personnelPool.length > 0 ||
                guildWarBoards.length > 0 ||
                masterPersonnelPool.length > 0;
              if (localHasData) {
                console.info('[CloudSync] Khởi tạo dữ liệu Cloud Master từ máy cục bộ...');
                pushToCloud({
                  boards,
                  personnelPool,
                  guildWarBoards,
                  activeBoardId,
                  activeGuildWarBoardId,
                  customColors,
                  updateBoards,
                  updatePersonnelPool,
                  activeUpdateBoardId,
                  diBuiPersonnelPool,
                  masterPersonnelPool,
                  guildWarPersonnelPool,
                }, GLOBAL_GUILD_ID);
              }
            }
          } else if (isMounted) {
            // Trường hợp document chưa tồn tại trên Firestore
            const localHasData =
              boards.length > 0 ||
              personnelPool.length > 0 ||
              guildWarBoards.length > 0 ||
              masterPersonnelPool.length > 0;
            if (localHasData) {
              console.info('[CloudSync] Đẩy dữ liệu ban đầu lên Cloud Master...');
              pushToCloud({
                boards,
                personnelPool,
                guildWarBoards,
                activeBoardId,
                activeGuildWarBoardId,
                customColors,
                updateBoards,
                updatePersonnelPool,
                activeUpdateBoardId,
                diBuiPersonnelPool,
                masterPersonnelPool,
                guildWarPersonnelPool,
              }, GLOBAL_GUILD_ID);
            }
          }
        } catch (cloudErr) {
          console.warn('[CloudSync] Initial check error:', cloudErr);
        }
      } catch (err) {
        console.warn('[Storage] Error during initial recovery:', err);
      } finally {
        if (isMounted) setIsStorageHydrated(true);
      }
    }

    initializeAndRecover();

    return () => {
      isMounted = false;
    };
  }, []);

  // Lắng nghe cập nhật thời gian thực từ Cloud Firestore (Real-time synchronization)
  useEffect(() => {
    if (!isStorageHydrated) return;

    const unsubscribe = subscribeToCloud((incomingData, isLocalWrite) => {
      // Bỏ qua nếu snapshot này xuất phát từ chính lần ghi cục bộ đang pending của máy này
      if (isLocalWrite) return;

      // Bỏ qua nếu người dùng vừa mới gõ/thao tác trong vòng 1.5 giây gần nhất để tránh giật lag con trỏ
      if (Date.now() - lastLocalEditTimeRef.current < 1500) {
        return;
      }

      console.info('[CloudSync] Nhận dữ liệu thời gian thực từ Firestore:', incomingData.updatedAt);
      applyCloudDataToState(incomingData);
    });

    return () => {
      unsubscribe();
    };
  }, [isStorageHydrated, applyCloudDataToState]);

  // Tự động kiểm tra và tạo bản sao lưu ngày mới (Daily Backup) khi mở web hoặc khi có dữ liệu mới
  useEffect(() => {
    if (!isStorageHydrated) return;
    const timer = setTimeout(() => {
      checkAndRunAutoDailyBackup({
        boards,
        personnelPool,
        guildWarBoards,
        updateBoards,
        updatePersonnelPool,
        diBuiPersonnelPool,
        masterPersonnelPool,
        guildWarPersonnelPool,
        customColors,
        activeBoardId,
        activeGuildWarBoardId,
        activeUpdateBoardId,
        updatedAt: Date.now(),
      }).then((didBackup) => {
        if (didBackup) {
          console.info('[DailyBackup] Đã tự động tạo bản sao lưu thành công cho ngày hôm nay');
        }
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [
    isStorageHydrated,
    boards,
    masterPersonnelPool,
    personnelPool,
    guildWarBoards,
  ]);

  // Ghi nhận thời điểm chỉnh sửa gần nhất của người dùng cục bộ
  useEffect(() => {
    if (!isStorageHydrated) return;
    if (isRemoteIncomingRef.current) return;
    lastLocalEditTimeRef.current = Date.now();
  }, [
    boards,
    personnelPool,
    guildWarBoards,
    updateBoards,
    updatePersonnelPool,
    diBuiPersonnelPool,
    masterPersonnelPool,
    guildWarPersonnelPool,
    customColors,
    isStorageHydrated,
  ]);

  // Tự động sửa/phục hồi tên Logged By cho Kho Raid Update nếu trước đó bị lỗi gán tên nguồn (như "Kho Nhân Sự Raid" hay "Bang Chiến")
  useEffect(() => {
    if (!isStorageHydrated || updatePersonnelPool.length === 0) return;
    let hasDirty = false;
    const cleaned = updatePersonnelPool.map((p) => {
      const isDirty =
        p.loggedBy === 'Kho Nhân Sự Raid' ||
        p.loggedBy === 'Bang Chiến' ||
        p.loggedBy?.startsWith('Kho Nhân Sự') ||
        p.loggedBy?.startsWith('Bang Chiến') ||
        p.loggedBy?.startsWith('Bảng ');
      if (isDirty) {
        hasDirty = true;
        const match = personnelPool.find(
          (rp) => normalizeName(rp.ingame) === normalizeName(p.ingame)
        );
        const realLog = (match?.loggedBy && match.loggedBy.trim()) || p.ingame;
        return { ...p, loggedBy: realLog };
      }
      return p;
    });

    if (hasDirty) {
      setUpdatePersonnelPool(cleaned);
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(cleaned));
      saveToIndexedDB('updatePersonnelPool', cleaned);
    }
  }, [isStorageHydrated, personnelPool, updatePersonnelPool]);

  // Tự động đối chiếu & đồng bộ 2 chiều Logged By giữa Kho BC và Bảng Bang Chiến khi có lệch dữ liệu
  useEffect(() => {
    if (!isStorageHydrated || guildWarPersonnelPool.length === 0 || !activeGuildWarBoard?.members?.length) return;

    let poolHasChanges = false;
    let boardHasChanges = false;

    const boardMemberMap = new Map(
      activeGuildWarBoard.members.map((m) => [normalizeName(m.ingame), m])
    );
    const poolMemberMap = new Map(
      guildWarPersonnelPool.map((p) => [normalizeName(p.ingame), p])
    );

    // 1. Cập nhật Kho BC nếu Bảng Bang Chiến có loggedBy chuẩn hơn (ví dụ đã sửa "Lon Ton" trên Bảng nhưng Kho BC vẫn là "Lon")
    const updatedPool = guildWarPersonnelPool.map((p) => {
      const bm = boardMemberMap.get(normalizeName(p.ingame));
      if (!bm) return p;
      const bLog = (bm.loggedBy || bm.discord || '').trim();
      const pLog = (p.loggedBy || '').trim();

      if (bLog && bLog !== pLog) {
        if (!pLog || pLog === p.ingame || bLog.length >= pLog.length || bLog.toLowerCase().includes(pLog.toLowerCase())) {
          poolHasChanges = true;
          return { ...p, loggedBy: bLog, className: bm.className || p.className };
        }
      }
      return p;
    });

    if (poolHasChanges) {
      setGuildWarPersonnelPool(updatedPool);
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(updatedPool));
      saveToIndexedDB('guildWarPersonnelPool', updatedPool);
    }

    // 2. Cập nhật Bảng Bang Chiến nếu Kho BC có loggedBy mà Bảng chỉ có fallback ingame hoặc trống
    const updatedBoardMembers = activeGuildWarBoard.members.map((m) => {
      const p = poolMemberMap.get(normalizeName(m.ingame));
      if (!p) return m;
      const pLog = (p.loggedBy || '').trim();
      const mLog = (m.loggedBy || m.discord || '').trim();
      if (pLog && pLog !== mLog && (!mLog || mLog === m.ingame)) {
        boardHasChanges = true;
        return { ...m, loggedBy: pLog, discord: pLog };
      }
      return m;
    });

    if (boardHasChanges) {
      setGuildWarBoards((curr) =>
        curr.map((b) =>
          b.id === activeGuildWarBoard.id
            ? { ...b, members: updatedBoardMembers }
            : b
        )
      );
    }
  }, [isStorageHydrated, activeGuildWarBoardId]);

  // Synchronous flush on tab close / computer shutdown (beforeunload, pagehide & visibilitychange)
  useEffect(() => {
    const handleFlush = () => {
      // Chỉ flush khi app đã nạp xong (đã hydrate) để không bao giờ flush đè state chưa kịp nạp!
      if (!isStorageHydrated) return;
      flushAllStorageSync({
        boards,
        activeBoardId,
        personnelPool,
        customColors,
        guildWarBoards,
        activeGuildWarBoardId,
        updateBoards,
        activeUpdateBoardId,
        updatePersonnelPool,
        diBuiPersonnelPool,
        masterPersonnelPool,
        guildWarPersonnelPool,
        appMode,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    };

    window.addEventListener('beforeunload', handleFlush);
    window.addEventListener('pagehide', handleFlush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleFlush);
      window.removeEventListener('pagehide', handleFlush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    boards,
    activeBoardId,
    personnelPool,
    customColors,
    guildWarBoards,
    activeGuildWarBoardId,
    updateBoards,
    activeUpdateBoardId,
    updatePersonnelPool,
    diBuiPersonnelPool,
    masterPersonnelPool,
    guildWarPersonnelPool,
    appMode,
    isStorageHydrated,
  ]);

  // Save boards to localStorage, IndexedDB and auto-snapshot
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(boards));
      saveToIndexedDB('boards', boards);
      saveAutoSnapshot(
        boards,
        personnelPool,
        customColors,
        guildWarBoards,
        diBuiPersonnelPool,
        masterPersonnelPool,
        guildWarPersonnelPool
      );
    } catch (e) {
      console.error('Failed to save boards:', e);
    }
  }, [boards, isStorageHydrated]);

  // Save active board id to localStorage
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD, activeBoardId);
      saveToIndexedDB('activeBoardId', activeBoardId);
    } catch (e) {
      console.error('Failed to save active board ID:', e);
    }
  }, [activeBoardId, isStorageHydrated]);

  // Save personnel pool to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(personnelPool));
      saveToIndexedDB('personnelPool', personnelPool);
      saveAutoSnapshot(
        boards,
        personnelPool,
        customColors,
        guildWarBoards,
        diBuiPersonnelPool,
        masterPersonnelPool,
        guildWarPersonnelPool
      );
    } catch (e) {
      console.error('Failed to save personnel pool:', e);
    }
  }, [personnelPool, isStorageHydrated]);

  // Save master personnel pool to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(masterPersonnelPool));
      saveToIndexedDB('masterPersonnelPool', masterPersonnelPool);
      saveAutoSnapshot(
        boards,
        personnelPool,
        customColors,
        guildWarBoards,
        diBuiPersonnelPool,
        masterPersonnelPool,
        guildWarPersonnelPool
      );
    } catch (e) {
      console.error('Failed to save master personnel pool:', e);
    }
  }, [masterPersonnelPool, isStorageHydrated]);

  // Save custom colors to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_COLORS, JSON.stringify(customColors));
      saveToIndexedDB('customColors', customColors);
    } catch (e) {
      console.error('Failed to save custom colors:', e);
    }
  }, [customColors, isStorageHydrated]);

  // Save app mode to localStorage
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_APP_MODE, appMode);
    } catch {}
  }, [appMode, isStorageHydrated]);

  // Save guild war boards to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(
        STORAGE_KEY_GUILDWAR_BOARDS,
        JSON.stringify(guildWarBoards)
      );
      saveToIndexedDB('guildWarBoards', guildWarBoards);
      saveAutoSnapshot(
        boards,
        personnelPool,
        customColors,
        guildWarBoards,
        diBuiPersonnelPool,
        masterPersonnelPool,
        guildWarPersonnelPool
      );
    } catch (e) {
      console.error('Failed to save guild war boards:', e);
    }
  }, [guildWarBoards, isStorageHydrated]);

  // Save active guild war board id to localStorage
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_GUILDWAR, activeGuildWarBoardId);
      saveToIndexedDB('activeGuildWarBoardId', activeGuildWarBoardId);
    } catch {}
  }, [activeGuildWarBoardId, isStorageHydrated]);

  // Save update boards to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(updateBoards));
      saveToIndexedDB('updateBoards', updateBoards);
    } catch (e) {
      console.error('Failed to save update boards:', e);
    }
  }, [updateBoards, isStorageHydrated]);

  // Save active update board id to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD_UPDATE, activeUpdateBoardId);
      saveToIndexedDB('activeUpdateBoardId', activeUpdateBoardId);
    } catch (e) {
      console.error('Failed to save active update board ID:', e);
    }
  }, [activeUpdateBoardId, isStorageHydrated]);

  // Save update personnel pool to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(updatePersonnelPool));
      saveToIndexedDB('updatePersonnelPool', updatePersonnelPool);
    } catch (e) {
      console.error('Failed to save update personnel pool:', e);
    }
  }, [updatePersonnelPool, isStorageHydrated]);

  // Save Di Bui personnel pool to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(diBuiPersonnelPool));
      saveToIndexedDB('diBuiPersonnelPool', diBuiPersonnelPool);
    } catch (e) {
      console.error('Failed to save di bui personnel pool:', e);
    }
  }, [diBuiPersonnelPool, isStorageHydrated]);

  // Save Guild War personnel pool to localStorage and IndexedDB
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(guildWarPersonnelPool));
      saveToIndexedDB('guildWarPersonnelPool', guildWarPersonnelPool);
      saveAutoSnapshot(
        boards,
        personnelPool,
        customColors,
        guildWarBoards,
        diBuiPersonnelPool,
        masterPersonnelPool,
        guildWarPersonnelPool
      );
    } catch (e) {
      console.error('Failed to save guild war personnel pool:', e);
    }
  }, [guildWarPersonnelPool, isStorageHydrated]);

  // Debounced Auto-sync to Firebase Firestore Cloud (Thời gian thực)
  useEffect(() => {
    if (!isStorageHydrated) return;
    if (isRemoteIncomingRef.current) return;

    const hasData =
      boards.length > 0 ||
      personnelPool.length > 0 ||
      guildWarBoards.length > 0 ||
      updateBoards.length > 0 ||
      updatePersonnelPool.length > 0 ||
      diBuiPersonnelPool.length > 0 ||
      masterPersonnelPool.length > 0 ||
      guildWarPersonnelPool.length > 0;
    if (!hasData) return;

    const timer = setTimeout(async () => {
      try {
        setIsCloudSyncing(true);
        const res = await pushToCloud({
          boards,
          personnelPool,
          guildWarBoards,
          activeBoardId,
          activeGuildWarBoardId,
          customColors,
          updateBoards,
          updatePersonnelPool,
          activeUpdateBoardId,
          diBuiPersonnelPool,
          masterPersonnelPool,
          guildWarPersonnelPool,
        }, GLOBAL_GUILD_ID);
        if (res.success) {
          setLastCloudSyncTime(Date.now());
        }
      } catch (err) {
        console.warn('[CloudSync] Debounced auto-push error:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    boards,
    personnelPool,
    guildWarBoards,
    activeBoardId,
    activeGuildWarBoardId,
    customColors,
    updateBoards,
    updatePersonnelPool,
    activeUpdateBoardId,
    diBuiPersonnelPool,
    masterPersonnelPool,
    guildWarPersonnelPool,
    isStorageHydrated,
  ]);

  const handlePushToCloudManual = async () => {
    setIsCloudSyncing(true);
    try {
      const res = await pushToCloud({
        boards,
        personnelPool,
        guildWarBoards,
        activeBoardId,
        activeGuildWarBoardId,
        customColors,
        updateBoards,
        updatePersonnelPool,
        activeUpdateBoardId,
        diBuiPersonnelPool,
        masterPersonnelPool,
        guildWarPersonnelPool,
      }, GLOBAL_GUILD_ID);
      if (res.success) {
        setLastCloudSyncTime(Date.now());
      }
      return res;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handlePullFromCloudManual = async () => {
    setIsCloudSyncing(true);
    try {
      const res = await pullFromCloud(GLOBAL_GUILD_ID);
      if (res.success && res.data) {
        applyCloudDataToState(res.data);
      }
      return res;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleRestoreBackupData = (restored: Partial<CloudGuildData>) => {
    applyCloudDataToState(restored as CloudGuildData);
    // Đồng bộ ngay lên Cloud Master để các máy khác cùng cập nhật
    pushToCloud(restored as any, GLOBAL_GUILD_ID);
    showToast('Đã khôi phục dữ liệu bản sao lưu thành công!');
  };

  // Guild War Board Handlers
  const handleCreateGuildWarBoard = (newBoard: GuildWarBoard) => {
    setGuildWarBoards((prev) => [...prev, newBoard]);
    setActiveGuildWarBoardId(newBoard.id);
    setAppMode('GUILD_WAR');
    showToast(`Đã tạo bảng "${newBoard.title}" thành công!`);
  };

  // Helper đồng bộ dữ liệu giữa Kho BC và Bảng Bang Chiến hiện tại (Cả thêm và bớt)
  const syncGuildWarPoolToBoard = useCallback(
    (
      newPool: PersonnelMember[],
      type: 'add' | 'delete' | 'auto',
      removedNorms?: Set<string>
    ) => {
      setGuildWarBoards((currBoards) => {
        const targetId = currBoards.some((b) => b.id === activeGuildWarBoardId)
          ? activeGuildWarBoardId
          : currBoards[0]?.id;
        if (!targetId) return currBoards;

        const updatedBoards = currBoards.map((b) => {
          if (b.id !== targetId) return b;

          let updatedMembers = [...b.members];

          // 1. Nếu có xoá (bớt), lọc bỏ khỏi bảng Bang Chiến
          if (type === 'delete' || type === 'auto') {
            const poolNorms = new Set(
              newPool.map((p) => normalizeName(p.ingame)).filter(Boolean)
            );
            if (removedNorms && removedNorms.size > 0) {
              updatedMembers = updatedMembers.filter(
                (m) => !removedNorms.has(normalizeName(m.ingame))
              );
            } else if (type === 'delete') {
              updatedMembers = updatedMembers.filter((m) =>
                poolNorms.has(normalizeName(m.ingame))
              );
            }
          }

          // 2. Nếu có thêm mới, bổ sung vào bảng Bang Chiến với team: 'Chưa xếp'
          if (type === 'add' || type === 'auto') {
            const existingNorms = new Set(
              updatedMembers.map((m) => normalizeName(m.ingame)).filter(Boolean)
            );
            const toAdd: GuildMember[] = [];
            const timestamp = Date.now();

            newPool.forEach((p, idx) => {
              const norm = normalizeName(p.ingame);
              if (norm && !existingNorms.has(norm)) {
                existingNorms.add(norm);
                toAdd.push({
                  id: `gw_m_${timestamp}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                  stt: updatedMembers.length + toAdd.length + 1,
                  ingame: p.ingame.trim(),
                  className: p.className || 'Cửu Linh',
                  guildRole: 'Thành Viên',
                  participation: 'Cả hai',
                  team: 'Chưa xếp',
                  attendance: {},
                  loggedBy: (p.loggedBy || p.ingame).trim(),
                  discord: (p.loggedBy || p.ingame).trim(),
                  note: p.note || '',
                });
              }
            });

            if (toAdd.length > 0) {
              updatedMembers = [...updatedMembers, ...toAdd];
            }
          }

          // 3. ĐỒNG BỘ CHI TIẾT (loggedBy, discord, className, note) TỪ KHO BC SANG BẢNG BANG CHIẾN
          const poolMap = new Map(
            newPool.map((p) => [normalizeName(p.ingame), p])
          );
          updatedMembers = updatedMembers.map((m) => {
            const poolItem = poolMap.get(normalizeName(m.ingame));
            if (!poolItem) return m;
            const updatedLoggedBy = (poolItem.loggedBy && poolItem.loggedBy.trim()) || m.loggedBy || m.discord || m.ingame;
            return {
              ...m,
              className: poolItem.className || m.className,
              loggedBy: updatedLoggedBy,
              discord: updatedLoggedBy,
              note: poolItem.note !== undefined && poolItem.note !== '' ? poolItem.note : m.note,
            };
          });

          const reindexed = updatedMembers.map((m, idx) => ({ ...m, stt: idx + 1 }));
          return { ...b, members: reindexed };
        });

        safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(updatedBoards));
        saveToIndexedDB('guildWarBoards', updatedBoards);
        return updatedBoards;
      });
    },
    [activeGuildWarBoardId]
  );

  // Immediate synchronous & multi-layer persistent personnel pool updater
  const handleUpdatePersonnelPool = useCallback(
    (action: PersonnelMember[] | ((prev: PersonnelMember[]) => PersonnelMember[])) => {
      if (activePoolView === 'master') {
        setMasterPersonnelPool((prev) => {
          const rawNext = typeof action === 'function' ? action(prev) : action;
          const next = deduplicatePersonnelList(rawNext);
          try {
            safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(next));
          } catch (e) {
            console.error('[Storage] Error persisting master personnel to localStorage:', e);
          }
          saveToIndexedDB('masterPersonnelPool', next);
          saveAutoSnapshot(
            boards,
            personnelPool,
            customColors,
            guildWarBoards,
            diBuiPersonnelPool,
            next,
            guildWarPersonnelPool
          );

          // CASCADE DELETE:
          // Nếu xoá nhân sự trong Tổng kho nhân sự thì dữ liệu từ 3 kho con đều đồng loạt biến mất!
          const prevNorms = new Set(prev.map((p) => normalizeName(p.ingame)).filter(Boolean));
          const nextNorms = new Set(next.map((p) => normalizeName(p.ingame)).filter(Boolean));
          const removedNorms = new Set([...prevNorms].filter((n) => !nextNorms.has(n)));

          if (removedNorms.size > 0) {
            // 1. Đồng loạt xoá khỏi Kho con Raid
            setPersonnelPool((currRaid) => {
              const updatedRaid = currRaid.filter((p) => !removedNorms.has(normalizeName(p.ingame)));
              safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(updatedRaid));
              saveToIndexedDB('personnelPool', updatedRaid);
              return updatedRaid;
            });

            // 2. Đồng loạt xoá khỏi Kho con Raid Update
            setUpdatePersonnelPool((currUpdate) => {
              const updatedUpdate = currUpdate.filter((p) => !removedNorms.has(normalizeName(p.ingame)));
              safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(updatedUpdate));
              saveToIndexedDB('updatePersonnelPool', updatedUpdate);
              return updatedUpdate;
            });

            // 3. Đồng loạt xoá khỏi Kho con Bang Chiến & bảng Bang Chiến
            setGuildWarPersonnelPool((currGw) => {
              const updatedGw = currGw.filter((p) => !removedNorms.has(normalizeName(p.ingame)));
              safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(updatedGw));
              saveToIndexedDB('guildWarPersonnelPool', updatedGw);
              syncGuildWarPoolToBoard(updatedGw, 'delete', removedNorms);
              return updatedGw;
            });
          }

          return next;
        });
      } else if (activePoolView === 'raid_update') {
        setUpdatePersonnelPool((prev) => {
          const rawNext = typeof action === 'function' ? action(prev) : action;
          const next = deduplicatePersonnelList(rawNext);
          try {
            safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(next));
          } catch (e) {
            console.error('[Storage] Error persisting update personnel to localStorage:', e);
          }
          saveToIndexedDB('updatePersonnelPool', next);

          // Tự động bổ sung nhân sự mới thêm vào Tổng kho nhân sự (nếu Tổng kho chưa có)
          const prevNorms = new Set(prev.map((p) => normalizeName(p.ingame)).filter(Boolean));
          const newlyAdded = next.filter((p) => {
            const norm = normalizeName(p.ingame);
            return norm && !prevNorms.has(norm);
          });
          if (newlyAdded.length > 0) {
            setMasterPersonnelPool((currMaster) => {
              const currMasterNorms = new Set(currMaster.map((p) => normalizeName(p.ingame)).filter(Boolean));
              const toSupplement = newlyAdded.filter((p) => !currMasterNorms.has(normalizeName(p.ingame)));
              if (toSupplement.length === 0) return currMaster;
              const updatedMaster = [
                ...currMaster,
                ...toSupplement.map((p) => ({
                  ...p,
                  id: 'p_m_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                })),
              ];
              safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(updatedMaster));
              saveToIndexedDB('masterPersonnelPool', updatedMaster);
              return updatedMaster;
            });
          }

          // Xoá ở kho con: Tổng kho và các kho con khác giữ nguyên 100% không bị ảnh hưởng!
          return next;
        });
      } else if (activePoolView === 'guild_war') {
        const prev = guildWarPersonnelPool;
        const rawNext = typeof action === 'function' ? action(prev) : action;
        const next = deduplicatePersonnelList(rawNext);

        setGuildWarPersonnelPool(next);
        try {
          safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
        } catch (e) {
          console.error('[Storage] Error persisting guild war personnel to localStorage:', e);
        }
        saveToIndexedDB('guildWarPersonnelPool', next);
        saveAutoSnapshot(
          boards,
          personnelPool,
          customColors,
          guildWarBoards,
          diBuiPersonnelPool,
          masterPersonnelPool,
          next
        );

        // Tự động bổ sung nhân sự mới thêm vào Tổng kho nhân sự (nếu Tổng kho chưa có)
        const prevNorms = new Set(prev.map((p) => normalizeName(p.ingame)).filter(Boolean));
        const newlyAdded = next.filter((p) => {
          const norm = normalizeName(p.ingame);
          return norm && !prevNorms.has(norm);
        });
        if (newlyAdded.length > 0) {
          setMasterPersonnelPool((currMaster) => {
            const currMasterNorms = new Set(currMaster.map((p) => normalizeName(p.ingame)).filter(Boolean));
            const toSupplement = newlyAdded.filter((p) => !currMasterNorms.has(normalizeName(p.ingame)));
            if (toSupplement.length === 0) return currMaster;
            const updatedMaster = [
              ...currMaster,
              ...toSupplement.map((p) => ({
                ...p,
                id: 'p_m_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              })),
            ];
            safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(updatedMaster));
            saveToIndexedDB('masterPersonnelPool', updatedMaster);
            return updatedMaster;
          });
        }

        // Đồng bộ 2 chiều: Thêm & Bớt giữa Kho BC và Bảng Bang Chiến
        if (next.length < prev.length) {
          const nextNorms = new Set(next.map((p) => normalizeName(p.ingame)).filter(Boolean));
          const removed = new Set(
            prev.map((p) => normalizeName(p.ingame)).filter((n) => n && !nextNorms.has(n))
          );
          syncGuildWarPoolToBoard(next, 'delete', removed);
        } else {
          syncGuildWarPoolToBoard(next, 'add');
        }

        // Xoá ở kho con: Tổng kho và các kho con khác giữ nguyên 100% không bị ảnh hưởng!
        return next;
      } else {
        // activePoolView === 'raid'
        setPersonnelPool((prev) => {
          const rawNext = typeof action === 'function' ? action(prev) : action;
          const next = deduplicatePersonnelList(rawNext);
          try {
            safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(next));
          } catch (e) {
            console.error('[Storage] Error persisting personnel to localStorage:', e);
          }
          saveToIndexedDB('personnelPool', next);
          saveAutoSnapshot(
            boards,
            next,
            customColors,
            guildWarBoards,
            diBuiPersonnelPool,
            masterPersonnelPool,
            guildWarPersonnelPool
          );

          // Tự động bổ sung nhân sự mới thêm vào Tổng kho nhân sự (nếu Tổng kho chưa có)
          const prevNorms = new Set(prev.map((p) => normalizeName(p.ingame)).filter(Boolean));
          const newlyAdded = next.filter((p) => {
            const norm = normalizeName(p.ingame);
            return norm && !prevNorms.has(norm);
          });
          if (newlyAdded.length > 0) {
            setMasterPersonnelPool((currMaster) => {
              const currMasterNorms = new Set(currMaster.map((p) => normalizeName(p.ingame)).filter(Boolean));
              const toSupplement = newlyAdded.filter((p) => !currMasterNorms.has(normalizeName(p.ingame)));
              if (toSupplement.length === 0) return currMaster;
              const updatedMaster = [
                ...currMaster,
                ...toSupplement.map((p) => ({
                  ...p,
                  id: 'p_m_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                })),
              ];
              safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(updatedMaster));
              saveToIndexedDB('masterPersonnelPool', updatedMaster);
              return updatedMaster;
            });
          }

          // Xoá ở kho con: Tổng kho và các kho con khác giữ nguyên 100% không bị ảnh hưởng!
          return next;
        });
      }
    },
    [
      activePoolView,
      boards,
      personnelPool,
      customColors,
      guildWarBoards,
      diBuiPersonnelPool,
      masterPersonnelPool,
      guildWarPersonnelPool,
      activeGuildWarBoardId,
      syncGuildWarPoolToBoard,
    ]
  );

  // Chia sẻ nhân sự từ Tổng kho sang các kho con
  const handleSharePersonnel = (
    targetPool: PersonnelSubPool,
    membersToShare: PersonnelMember[],
    mode: 'merge' | 'overwrite'
  ) => {
    const targetName =
      targetPool === 'RAID'
        ? 'Kho Raid'
        : targetPool === 'RAID_UPDATE'
        ? 'Kho Raid Update'
        : 'Kho Bang Chiến';

    const updateFn = (prev: PersonnelMember[]) => {
      if (mode === 'overwrite') {
        return membersToShare.map((m) => ({ ...m }));
      }
      return mergePersonnelPools(prev, membersToShare);
    };

    if (targetPool === 'RAID') {
      setPersonnelPool((prev) => {
        const next = updateFn(prev);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(next));
        saveToIndexedDB('personnelPool', next);
        return next;
      });
    } else if (targetPool === 'RAID_UPDATE') {
      setUpdatePersonnelPool((prev) => {
        const next = updateFn(prev);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(next));
        saveToIndexedDB('updatePersonnelPool', next);
        return next;
      });
    } else if (targetPool === 'GUILD_WAR') {
      const next = updateFn(guildWarPersonnelPool);
      setGuildWarPersonnelPool(next);
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
      saveToIndexedDB('guildWarPersonnelPool', next);
      // Tự động đồng bộ ngay vào Bảng Bang Chiến hiện tại
      syncGuildWarPoolToBoard(next, 'add');
    }

    showToast(
      `Đã chia sẻ thành công ${membersToShare.length} nhân sự sang ${targetName} (${mode === 'overwrite' ? 'Ghi đè' : 'Gộp thêm'})!`
    );
  };

  // Chia sẻ nhanh 1-click từng thành viên từ Tổng kho sang kho con
  const handleQuickShareMember = (member: PersonnelMember, target: PersonnelSubPool) => {
    const norm = normalizeName(member.ingame);
    if (!norm) return;

    if (target === 'RAID') {
      setPersonnelPool((prev) => {
        const exists = prev.some((p) => normalizeName(p.ingame) === norm);
        let next: PersonnelMember[];
        if (exists) {
          next = prev.filter((p) => normalizeName(p.ingame) !== norm);
          showToast(`Đã gỡ "${member.ingame}" khỏi Kho Raid`);
        } else {
          next = [...prev, { ...member }];
          showToast(`Đã thêm "${member.ingame}" vào Kho Raid`);
        }
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(next));
        saveToIndexedDB('personnelPool', next);
        return next;
      });
    } else if (target === 'RAID_UPDATE') {
      setUpdatePersonnelPool((prev) => {
        const exists = prev.some((p) => normalizeName(p.ingame) === norm);
        let next: PersonnelMember[];
        if (exists) {
          next = prev.filter((p) => normalizeName(p.ingame) !== norm);
          showToast(`Đã gỡ "${member.ingame}" khỏi Kho Raid Update`);
        } else {
          next = [...prev, { ...member }];
          showToast(`Đã thêm "${member.ingame}" vào Kho Raid Update`);
        }
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(next));
        saveToIndexedDB('updatePersonnelPool', next);
        return next;
      });
    } else if (target === 'GUILD_WAR') {
      const exists = guildWarPersonnelPool.some((p) => normalizeName(p.ingame) === norm);
      let next: PersonnelMember[];
      if (exists) {
        next = guildWarPersonnelPool.filter((p) => normalizeName(p.ingame) !== norm);
        showToast(`Đã gỡ "${member.ingame}" khỏi Kho Bang Chiến`);
        setGuildWarPersonnelPool(next);
        safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
        saveToIndexedDB('guildWarPersonnelPool', next);
        const removed = new Set([norm]);
        syncGuildWarPoolToBoard(next, 'delete', removed);
      } else {
        next = [...guildWarPersonnelPool, { ...member }];
        showToast(`Đã thêm "${member.ingame}" vào Kho Bang Chiến`);
        setGuildWarPersonnelPool(next);
        safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
        saveToIndexedDB('guildWarPersonnelPool', next);
        syncGuildWarPoolToBoard(next, 'add');
      }
    }
  };

  // Nạp toàn bộ nhân sự từ kho con hiện tại vào Tổng kho
  const handlePushSubPoolToMaster = () => {
    let sourcePool: PersonnelMember[] = [];
    let sourceName = '';
    if (activePoolView === 'raid') {
      sourcePool = personnelPool;
      sourceName = 'Kho Raid';
    } else if (activePoolView === 'raid_update') {
      sourcePool = updatePersonnelPool;
      sourceName = 'Kho Raid Update';
    } else if (activePoolView === 'guild_war') {
      sourcePool = guildWarPersonnelPool;
      sourceName = 'Kho Bang Chiến';
    }

    if (sourcePool.length === 0) {
      showToast(`${sourceName} đang trống, không có nhân sự để nạp.`);
      return;
    }

    setMasterPersonnelPool((prev) => {
      const merged = mergePersonnelPools(prev, sourcePool);
      safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(merged));
      saveToIndexedDB('masterPersonnelPool', merged);
      saveAutoSnapshot(
        boards,
        personnelPool,
        customColors,
        guildWarBoards,
        diBuiPersonnelPool,
        merged,
        guildWarPersonnelPool
      );
      return merged;
    });

    showToast(`Đã nạp toàn bộ nhân sự từ ${sourceName} vào Tổng kho nhân sự!`);
  };

  // Đồng bộ tất cả nhân sự từ các bảng Bang Chiến vào Tổng kho nhân sự
  const handleSyncGuildWarToMaster = () => {
    const { updatedPool, addedCount } = syncGuildWarMembersToMasterPool(
      masterPersonnelPool,
      guildWarBoards,
      guildWarPersonnelPool
    );
    if (addedCount > 0) {
      setMasterPersonnelPool(updatedPool);
      safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(updatedPool));
      saveToIndexedDB('masterPersonnelPool', updatedPool);
      showToast(`Đã đồng bộ thêm ${addedCount} nhân sự từ Bang Chiến vào Tổng kho!`);
    } else {
      showToast('Tổng kho đã có đầy đủ tất cả nhân sự từ Bang Chiến!');
    }
  };

  // Làm trống kho con hiện tại
  const handleClearCurrentSubPool = () => {
    let poolName = '';
    if (activePoolView === 'raid') poolName = 'Kho Raid';
    else if (activePoolView === 'raid_update') poolName = 'Kho Raid Update';
    else if (activePoolView === 'guild_war') poolName = 'Kho Bang Chiến';

    if (!poolName) return;

    if (window.confirm(`Bạn có chắc muốn làm trống ${poolName}? Dữ liệu trong Tổng kho nhân sự vẫn được giữ nguyên an toàn 100%.`)) {
      if (activePoolView === 'raid') {
        setPersonnelPool([]);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify([]));
        saveToIndexedDB('personnelPool', []);
      } else if (activePoolView === 'raid_update') {
        setUpdatePersonnelPool([]);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify([]));
        saveToIndexedDB('updatePersonnelPool', []);
      } else if (activePoolView === 'guild_war') {
        setGuildWarPersonnelPool([]);
        safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify([]));
        saveToIndexedDB('guildWarPersonnelPool', []);
      }
      showToast(`Đã làm trống ${poolName}.`);
    }
  };

  const handleUpdateGuildWarBoard = (updated: GuildWarBoard) => {
    setGuildWarBoards((prev) => {
      const next = prev.map((b) => (b.id === updated.id ? updated : b));
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(next));
      saveToIndexedDB('guildWarBoards', next);
      return next;
    });
  };

  const handleDeleteGuildWarBoard = (boardId: string) => {
    if (guildWarBoards.length <= 1) {
      showToast('Không thể xóa bảng Bang Chiến duy nhất.');
      return;
    }
    const remaining = guildWarBoards.filter((b) => b.id !== boardId);
    setGuildWarBoards(remaining);
    safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(remaining));
    saveToIndexedDB('guildWarBoards', remaining);
    if (activeGuildWarBoardId === boardId) {
      setActiveGuildWarBoardId(remaining[0].id);
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_GUILDWAR, remaining[0].id);
    }
    showToast('Đã xóa bảng Bang Chiến.');
  };

  const handleDuplicateGuildWarBoard = (board: GuildWarBoard) => {
    const timestamp = Date.now();
    const newBoard: GuildWarBoard = {
      ...board,
      id: `gw_board_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${board.title} (Bản sao)`,
      createdAt: timestamp,
      members: board.members.map((m, idx) => ({
        ...m,
        id: `gw_m_${timestamp}_${idx + 1}`,
        attendance: { ...(m.attendance || {}) },
      })),
    };
    const nextList = [...guildWarBoards, newBoard];
    setGuildWarBoards(nextList);
    safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(nextList));
    saveToIndexedDB('guildWarBoards', nextList);
    setActiveGuildWarBoardId(newBoard.id);
    safeLocalStorageSet(STORAGE_KEY_ACTIVE_GUILDWAR, newBoard.id);
    setAppMode('GUILD_WAR');
    showToast(`Đã nhân bản thành "${newBoard.title}"`);
  };

  // Board Mutators
  const updateActiveBoard = (updates: Partial<RaidBoard>) => {
    if (isRaidUpdate) {
      setUpdateBoards((prev) => {
        const next = prev.map((b) => (b.id === activeBoard.id ? { ...b, ...updates } : b));
        safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(next));
        saveToIndexedDB('updateBoards', next);
        return next;
      });
    } else {
      setBoards((prev) => {
        const next = prev.map((b) => (b.id === activeBoard.id ? { ...b, ...updates } : b));
        safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(next));
        saveToIndexedDB('boards', next);
        return next;
      });
    }
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

  // Add a clean empty Board keeping exact Raid 1 format
  const handleAddNewSampleBoard = () => {
    handleAddNewEmptyBoard();
  };

  // Add a clean empty Board keeping exact Raid 1 format
  const handleAddNewEmptyBoard = () => {
    if (isRaidUpdate) {
      const nextNumber = updateBoards.length + 1;
      const raid1Template = updateBoards[0]?.members || RAID1_DEFAULT_EMPTY_MEMBERS;
      const newBoard = createEmptyBoard(nextNumber, raid1Template);
      setUpdateBoards((prev) => [...prev, newBoard]);
      setActiveUpdateBoardId(newBoard.id);
      showToast(`Đã tạo thành công "${newBoard.titlePrefix}" trong Raid Update!`);
    } else {
      const nextNumber = boards.length + 1;
      const raid1Template = boards[0]?.members || RAID1_DEFAULT_EMPTY_MEMBERS;
      const newBoard = createEmptyBoard(nextNumber, raid1Template);
      setBoards((prev) => [...prev, newBoard]);
      setActiveBoardId(newBoard.id);
      showToast(`Đã tạo thành công "${newBoard.titlePrefix}" theo định dạng Raid 1!`);
    }
  };

  // Custom Board creation handler from Modal
  const handleCreateCustomBoard = (newBoard: RaidBoard) => {
    if (isRaidUpdate) {
      setUpdateBoards((prev) => [...prev, newBoard]);
      setActiveUpdateBoardId(newBoard.id);
      showToast(`Đã tạo thành công "${newBoard.titlePrefix}" trong Raid Update!`);
    } else {
      setBoards((prev) => [...prev, newBoard]);
      setActiveBoardId(newBoard.id);
      showToast(`Đã tạo thành công "${newBoard.titlePrefix}"!`);
    }
  };

  // Duplicate current Board
  const handleDuplicateActiveBoard = () => {
    const timestamp = Date.now();
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
    if (isRaidUpdate) {
      setUpdateBoards((prev) => [...prev, duplicated]);
      setActiveUpdateBoardId(duplicated.id);
    } else {
      setBoards((prev) => [...prev, duplicated]);
      setActiveBoardId(duplicated.id);
    }
    showToast(`Đã nhân bản "${duplicated.titlePrefix}"!`);
  };

  // Duplicate a specific board by its ID (for Vertical Board Navigator)
  const handleDuplicateBoardById = (boardId: string) => {
    const targetList = isRaidUpdate ? updateBoards : boards;
    const target = targetList.find((b) => b.id === boardId);
    if (!target) return;
    const timestamp = Date.now();
    const duplicated: RaidBoard = {
      ...target,
      id: `board_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      titlePrefix: `${target.titlePrefix} (Bản sao)`,
      createdAt: timestamp,
      members: target.members.map((m) => ({
        ...m,
        id: `m_${timestamp}_${m.stt}`,
      })),
    };
    if (isRaidUpdate) {
      setUpdateBoards((prev) => [...prev, duplicated]);
      setActiveUpdateBoardId(duplicated.id);
    } else {
      setBoards((prev) => [...prev, duplicated]);
      setActiveBoardId(duplicated.id);
    }
    showToast(`Đã nhân bản "${duplicated.titlePrefix}"!`);
  };

  // Delete Board
  const handleDeleteBoard = (boardId: string) => {
    const targetList = isRaidUpdate ? updateBoards : boards;
    if (targetList.length <= 1) {
      showToast(isRaidUpdate ? 'Cần giữ lại ít nhất 1 bảng Raid Update!' : 'Cần giữ lại ít nhất 1 bảng Raid!');
      return;
    }
    const target = targetList.find((b) => b.id === boardId);
    if (target) {
      setBoardToDelete(target);
    }
  };

  const confirmDeleteBoard = () => {
    if (!boardToDelete) return;
    const boardId = boardToDelete.id;
    if (isRaidUpdate) {
      const remaining = updateBoards.filter((b) => b.id !== boardId);
      setUpdateBoards(remaining);
      safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(remaining));
      saveToIndexedDB('updateBoards', remaining);
      if (activeUpdateBoardId === boardId) {
        setActiveUpdateBoardId(remaining[0].id);
        safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD_UPDATE, remaining[0].id);
      }
    } else {
      const remaining = boards.filter((b) => b.id !== boardId);
      setBoards(remaining);
      safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(remaining));
      saveToIndexedDB('boards', remaining);
      if (activeBoardId === boardId) {
        setActiveBoardId(remaining[0].id);
        safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD, remaining[0].id);
      }
    }
    setBoardToDelete(null);
    showToast(`Đã xoá "${boardToDelete.titlePrefix}"`);
  };

  // Toggle checkmark for member inside any board (for AllBoardsOverview)
  const handleToggleCheckMemberInBoard = (boardId: string, memberId: string) => {
    const setter = isRaidUpdate ? setUpdateBoards : setBoards;
    setter((prev) =>
      prev.map((b) => {
        if (b.id !== boardId) return b;
        return {
          ...b,
          members: b.members.map((m) =>
            m.id === memberId ? { ...m, checked: !m.checked } : m
          ),
        };
      })
    );
  };

  // Sao chép nhân sự được chọn vào Kho Raid Update
  const handleCopyMembersToUpdatePool = (
    newMembers: PersonnelMember[],
    mode: 'merge' | 'overwrite'
  ) => {
    if (mode === 'overwrite') {
      setUpdatePersonnelPool(newMembers);
      safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(newMembers));
      saveToIndexedDB('updatePersonnelPool', newMembers);
      showToast(`Đã sao chép và ghi đè ${newMembers.length} nhân sự vào Kho Raid Update!`);
    } else {
      setUpdatePersonnelPool((prev) => {
        const newMap = new Map<string, PersonnelMember>();
        newMembers.forEach((m) => newMap.set(normalizeName(m.ingame), m));

        const updatedPrev = prev.map((p) => {
          const match = newMap.get(normalizeName(p.ingame));
          if (match && match.loggedBy) {
            return {
              ...p,
              loggedBy: match.loggedBy,
              className: match.className,
              note: match.note || p.note,
            };
          }
          return p;
        });

        const merged = mergePersonnelPools(updatedPrev, newMembers);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(merged));
        saveToIndexedDB('updatePersonnelPool', merged);
        return merged;
      });
      showToast(`Đã sao chép thêm ${newMembers.length} nhân sự vào Kho Raid Update!`);
    }
  };

  // Personnel Assignment Handlers - strictly routed by activePoolView
  const handleAssignPersonnelToRaid = (
    person: PersonnelMember,
    targetStt?: number
  ) => {
    // 1. Bang Chiến
    if (activePoolView === 'guild_war' || (activePoolView === 'master' && appMode === 'GUILD_WAR')) {
      const norm = normalizeName(person.ingame);
      const exists = activeGuildWarBoard.members.some((m) => normalizeName(m.ingame) === norm);
      if (!exists) {
        const newGwMember: GuildMember = {
          id: `gw_m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          stt: activeGuildWarBoard.members.length + 1,
          ingame: person.ingame.trim(),
          className: person.className,
          guildRole: 'Thành Viên',
          participation: 'Cả hai',
          team: 'Chưa xếp',
          attendance: {},
          loggedBy: (person.loggedBy || person.ingame).trim(),
          discord: (person.loggedBy || person.ingame).trim(),
          note: person.note || '',
        };
        handleUpdateGuildWarBoard({
          ...activeGuildWarBoard,
          members: [...activeGuildWarBoard.members, newGwMember],
        });
        showToast(`Đã thêm "${person.ingame}" vào Bảng Bang Chiến!`);
      } else {
        showToast(`"${person.ingame}" đã có trong Bảng Bang Chiến.`);
      }
      return;
    }

    // 2. Raid Update vs Standard Raid
    const isUpdateTarget = activePoolView === 'raid_update' || (activePoolView === 'master' && isRaidUpdate);
    const targetBoard = isUpdateTarget ? activeUpdateBoard : activeRaidBoard;
    const targetUpdateFn = isUpdateTarget
      ? (updates: Partial<RaidBoard>) => {
          setUpdateBoards((prev) => {
            const next = prev.map((b) => (b.id === targetBoard.id ? { ...b, ...updates } : b));
            safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(next));
            saveToIndexedDB('updateBoards', next);
            return next;
          });
        }
      : (updates: Partial<RaidBoard>) => {
          setBoards((prev) => {
            const next = prev.map((b) => (b.id === targetBoard.id ? { ...b, ...updates } : b));
            safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(next));
            saveToIndexedDB('boards', next);
            return next;
          });
        };

    const currentMembers = [...targetBoard.members];

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
      targetUpdateFn({ members: updated });
      return;
    }

    // 1. Smart match: Find first empty slot that matches the person's class (preserves Raid 1 class layout!)
    let targetIndex = currentMembers.findIndex(
      (m) => (!m.ingame || m.ingame.trim() === '') && m.className === person.className
    );

    // 2. If no exact class slot is empty, find any empty slot
    if (targetIndex === -1) {
      targetIndex = currentMembers.findIndex(
        (m) => !m.ingame || m.ingame.trim() === ''
      );
    }

    if (targetIndex !== -1) {
      currentMembers[targetIndex] = {
        ...currentMembers[targetIndex],
        ingame: person.ingame,
        className: person.className,
        loggedBy: person.loggedBy || person.ingame,
      };
      targetUpdateFn({ members: currentMembers });
      showToast(
        `Đã xếp ${person.ingame} (${person.className}) vào vị trí STT ${currentMembers[targetIndex].stt}`
      );
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
      targetUpdateFn({ members: [...currentMembers, newMember] });
    }
  };

  const handleRemoveFromRaid = (ingame: string) => {
    const targetNorm = normalizeName(ingame);
    if (!targetNorm) return;

    if (activePoolView === 'guild_war' || (activePoolView === 'master' && appMode === 'GUILD_WAR')) {
      const updated = activeGuildWarBoard.members
        .filter((m) => normalizeName(m.ingame) !== targetNorm)
        .map((m, idx) => ({ ...m, stt: idx + 1 }));
      handleUpdateGuildWarBoard({ ...activeGuildWarBoard, members: updated });
      showToast(`Đã gỡ "${ingame}" khỏi Bảng Bang Chiến.`);
      return;
    }

    const isUpdateTarget = activePoolView === 'raid_update' || (activePoolView === 'master' && isRaidUpdate);
    const targetBoard = isUpdateTarget ? activeUpdateBoard : activeRaidBoard;
    const targetUpdateFn = isUpdateTarget
      ? (updates: Partial<RaidBoard>) => {
          setUpdateBoards((prev) => {
            const next = prev.map((b) => (b.id === targetBoard.id ? { ...b, ...updates } : b));
            safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(next));
            saveToIndexedDB('updateBoards', next);
            return next;
          });
        }
      : (updates: Partial<RaidBoard>) => {
          setBoards((prev) => {
            const next = prev.map((b) => (b.id === targetBoard.id ? { ...b, ...updates } : b));
            safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(next));
            saveToIndexedDB('boards', next);
            return next;
          });
        };

    // Clear ingame and loggedBy in the slot
    const updated = targetBoard.members.map((m) => {
      if (normalizeName(m.ingame) === targetNorm) {
        return { ...m, ingame: '', loggedBy: '' };
      }
      return m;
    });
    targetUpdateFn({ members: updated });
  };

  const handleSyncFromActiveRaid = () => {
    if (activePoolView === 'guild_war') {
      const now = Date.now();
      const seen = new Set<string>();
      const syncedPool: PersonnelMember[] = [];

      activeGuildWarBoard.members.forEach((m, idx) => {
        const norm = normalizeName(m.ingame);
        if (!norm || seen.has(norm)) return;
        seen.add(norm);

        syncedPool.push({
          id: `p_gw_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          ingame: m.ingame.trim(),
          className: m.className || 'Cửu Linh',
          loggedBy: (m.loggedBy || m.discord || m.ingame).trim(),
          note: m.note || '',
          createdAt: now,
        });
      });

      setGuildWarPersonnelPool(syncedPool);
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(syncedPool));
      saveToIndexedDB('guildWarPersonnelPool', syncedPool);

      setMasterPersonnelPool((prev) => {
        const merged = mergePersonnelPools(prev, syncedPool);
        safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(merged));
        saveToIndexedDB('masterPersonnelPool', merged);
        return merged;
      });

      showToast(`Đã đồng bộ chính xác Kho Bang Chiến (${syncedPool.length} nhân sự hợp lệ, đã lọc trùng)!`);
      return;
    }

    const isUpdateTarget = activePoolView === 'raid_update' || (activePoolView === 'master' && isRaidUpdate);
    const targetBoard = isUpdateTarget ? activeUpdateBoard : activeRaidBoard;
    const currentPool = currentPersonnelPool;
    const currentPoolIngames = new Set(
      currentPool.map((p) => normalizeName(p.ingame)).filter(Boolean)
    );
    const toAdd: PersonnelMember[] = [];

    targetBoard.members.forEach((m) => {
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
      handleUpdatePersonnelPool((prev) => [...toAdd, ...prev]);
      showToast(`Đã lưu thêm ${toAdd.length} nhân sự mới từ bảng vào Kho lưu trữ!`);
    } else {
      showToast('Tất cả nhân sự trong bảng hiện tại đã có trong Kho lưu trữ.');
    }
  };

  // Immediate updater for Kho Đi Bụi
  const handleUpdateDiBuiPersonnelPool = useCallback(
    (action: PersonnelMember[] | ((prev: PersonnelMember[]) => PersonnelMember[])) => {
      setDiBuiPersonnelPool((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        try {
          safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(next));
        } catch (e) {
          console.error('[Storage] Error persisting di bui personnel to localStorage:', e);
        }
        saveToIndexedDB('diBuiPersonnelPool', next);
        return next;
      });
    },
    []
  );

  // Chuyển nhân sự sang Kho Đi Bụi (khi tạm nghỉ game)
  const handleMoveToDiBui = useCallback(
    (person: PersonnelMember) => {
      const normName = normalizeName(person.ingame);
      if (!normName) return;

      // 1. Thêm vào Kho Đi Bụi
      setDiBuiPersonnelPool((prev) => {
        const exists = prev.some((p) => normalizeName(p.ingame) === normName);
        let next: PersonnelMember[];
        if (exists) {
          next = prev.map((p) =>
            normalizeName(p.ingame) === normName
              ? { ...p, ...person, note: person.note || p.note || 'Tạm nghỉ đi bụi' }
              : p
          );
        } else {
          next = [
            {
              ...person,
              id: person.id || 'dibui_' + Date.now(),
              note: person.note || 'Tạm nghỉ đi bụi',
              createdAt: Date.now(),
            },
            ...prev,
          ];
        }
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(next));
        saveToIndexedDB('diBuiPersonnelPool', next);
        return next;
      });

      // 2. Gỡ khỏi kho nhân sự hiện tại
      handleUpdatePersonnelPool((prev) => prev.filter((p) => normalizeName(p.ingame) !== normName));

      // 3. Gỡ khỏi bảng Raid hiện tại nếu đã được xếp
      handleRemoveFromRaid(person.ingame);

      showToast(`Đã chuyển "${person.ingame}" sang Kho Đi Bụi!`);
    },
    [handleUpdatePersonnelPool, handleRemoveFromRaid]
  );

  // Đưa nhân sự từ Kho Đi Bụi quay lại Kho Nhân Sự (Quay lại game)
  const handleRestoreFromDiBui = useCallback(
    (person: PersonnelMember) => {
      const normName = normalizeName(person.ingame);
      if (!normName) return;

      const returningMember: PersonnelMember = {
        id: person.id || 'p_' + Date.now(),
        ingame: person.ingame,
        className: person.className,
        loggedBy: person.loggedBy || person.ingame,
        createdAt: Date.now(),
      };

      // 1. Nạp vào kho nhân sự đang dùng
      handleUpdatePersonnelPool((prev) => {
        const exists = prev.some((p) => normalizeName(p.ingame) === normName);
        if (exists) return prev;
        return [returningMember, ...prev];
      });

      // 2. Gỡ khỏi Kho Đi Bụi
      setDiBuiPersonnelPool((prev) => {
        const next = prev.filter((p) => normalizeName(p.ingame) !== normName);
        safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(next));
        saveToIndexedDB('diBuiPersonnelPool', next);
        return next;
      });

      showToast(`Chào mừng "${person.ingame}" quay lại game! Đã nạp vào Kho Nhân Sự.`);
    },
    [handleUpdatePersonnelPool]
  );


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

  return (
    <div
      className={`min-h-screen transition-colors pb-16 relative ${
        appTheme === 'cow'
          ? 'bg-[#FFF0F3] dark:bg-[#1A0C12] text-[#591C2B] dark:text-[#FFE5EC]'
          : appTheme === 'frog'
          ? 'bg-[#F2FBE0] dark:bg-[#0E1F11] text-[#133E1A] dark:text-[#E8F8D8]'
          : 'bg-[#E0F7FA] dark:bg-[#071A24] text-[#03045E] dark:text-[#E0F7FA]'
      }`}
    >
      {/* Dynamic Animated Mascot Backgrounds */}
      {appTheme === 'dolphin' && <DolphinAquaBackground />}
      {appTheme === 'cow' && <CowStrawberryBackground />}
      {appTheme === 'frog' && <FrogPondBackground />}

      {/* Top Header Navbar */}
      <header
        className={`sticky top-0 z-30 transition-colors shadow-xs backdrop-blur-md ${
          appTheme === 'cow'
            ? 'bg-[#FFF5F7]/95 dark:bg-[#2A151D]/95 border-b-2 border-[#F5B7B1] dark:border-[#5C2A38]'
            : appTheme === 'frog'
            ? 'bg-[#F4FCE8]/95 dark:bg-[#152B19]/95 border-b-2 border-[#A3E635] dark:border-[#27532A]'
            : 'bg-[#F0FDFA]/95 dark:bg-[#0D2838]/95 border-b-2 border-[#7DD3FC] dark:border-[#163E56]'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Click mascot logo to open Theme Selection Modal */}
            <div
              onClick={() => setIsThemeModalOpen(true)}
              title="Nhấp vào logo để đổi linh vật & hình nền (Cá Heo, Bò Sữa Dâu, Ếch Xanh)"
              className="shrink-0 transition-transform hover:scale-110 active:scale-95 cursor-pointer relative group"
            >
              {appTheme === 'cow' ? (
                <CowLogo size={38} showText={false} />
              ) : appTheme === 'frog' ? (
                <FrogLogo size={38} showText={false} />
              ) : (
                <DolphinLogo size={38} showText={false} />
              )}
              {/* Little hint sparkles badge on hover */}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 border border-white dark:border-slate-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs pointer-events-none">
                <Sparkles className="w-2 h-2 text-amber-950" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-[#03045E] dark:text-white text-xs sm:text-base leading-tight truncate tracking-tight flex items-center gap-1.5">
                  <span>
                    {appMode === 'RAID'
                      ? 'NTH Raid Roster'
                      : appMode === 'RAID_UPDATE'
                      ? 'NTH Raid Update'
                      : 'NTH Bang Chiến'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsThemeModalOpen(true)}
                    title="Nhấp để đổi giao diện linh vật & background"
                    className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                      appTheme === 'cow'
                        ? 'bg-[#FFE5EC] dark:bg-[#4A2E35] text-[#C93B66] dark:text-[#FFB3C1] border-[#F5B7B1] dark:border-[#854D59]'
                        : appTheme === 'frog'
                        ? 'bg-[#DCFCE7] dark:bg-[#14532D] text-[#15803D] dark:text-[#86EFAC] border-[#86EFAC] dark:border-[#166534]'
                        : 'bg-[#CCFBF1] dark:bg-[#134E4A] text-[#0284C7] dark:text-[#7DD3FC] border-[#38BDF8] dark:border-[#0284C7]'
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>
                      {appTheme === 'cow'
                        ? 'Bò Sữa Dâu'
                        : appTheme === 'frog'
                        ? 'Ếch Xanh Sen'
                        : 'Cá Heo Aqua'}
                    </span>
                  </button>
                </h1>
                {/* Active Cloud Sync Status Pill */}
                <button
                  type="button"
                  onClick={() => setIsCloudModalOpen(true)}
                  title="Nhấn để xem trạng thái đồng bộ thời gian thực"
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all border shrink-0 bg-[#F0FDFA] hover:bg-[#CCFBF1] dark:bg-[#153B52] dark:hover:bg-[#1E4D6B] border-[#7DD3FC] dark:border-[#1E4D6B]"
                >
                  <Cloud className={`w-3.5 h-3.5 ${isCloudSyncing ? 'text-amber-500 animate-spin' : 'text-[#0284C7] dark:text-[#38BDF8]'}`} />
                  <span className="text-[#0369A1] dark:text-[#7DD3FC]">
                    {isCloudSyncing ? 'Đang đồng bộ...' : 'Đồng bộ trực tiếp'}
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-[#0369A1] dark:text-[#BAE6FD] hidden sm:flex items-center gap-2 truncate font-medium">
                <span>
                  {appMode === 'RAID'
                    ? `${boards.length} bảng Raid`
                    : appMode === 'RAID_UPDATE'
                    ? `${updateBoards.length} bảng Raid Update`
                    : `${guildWarBoards.length} bảng Bang chiến`}
                </span>
                <span className="text-cyan-400 dark:text-cyan-700">•</span>
                <span className="text-[#0284C7] dark:text-[#38BDF8] font-semibold">{fullRaidTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              id="btn-toggle-dark-mode"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center justify-center p-2 sm:px-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#162230] dark:hover:bg-[#1D2D40] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#1F3347] rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] min-w-[38px]"
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

            {/* Donate / Cà phê Button */}
            <button
              type="button"
              id="btn-open-donate-modal"
              onClick={() => setIsDonateModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-50 hover:bg-amber-100 dark:bg-[#0D2838] dark:hover:bg-[#153B52] text-slate-800 dark:text-slate-100 border border-amber-300/80 dark:border-[#163E56] rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Mời ly cà phê ủng hộ tác giả"
            >
              <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <span className="hidden sm:inline font-bold">Cà phê</span>
              <span className="sm:hidden font-bold text-[11px]">Cà phê</span>
            </button>

            {/* Cloud Sync Button */}
            <button
              type="button"
              id="btn-open-cloud-modal"
              onClick={() => setIsCloudModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[#F0FDFA] dark:bg-[#0D2838] hover:bg-[#CCFBF1] dark:hover:bg-[#153B52] text-[#0284C7] dark:text-[#7DD3FC] border border-[#7DD3FC] dark:border-[#163E56] rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Đồng bộ Đám mây (Firebase Firestore) - Chống mất dữ liệu khi tắt web/đổi máy"
            >
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284C7] dark:text-[#38BDF8]" />
              <span className="hidden sm:inline">Đám mây</span>
              {isCloudSyncing ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#00B4D8] inline-block" />
              )}
            </button>

            {/* Daily Backup Button */}
            <button
              type="button"
              id="btn-open-backup-modal"
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[#F0FDFA] dark:bg-[#0D2838] hover:bg-[#CCFBF1] dark:hover:bg-[#153B52] text-[#0284C7] dark:text-[#7DD3FC] border border-[#7DD3FC] dark:border-[#163E56] rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Quản lý sao lưu dữ liệu mỗi ngày (Daily Backup)"
            >
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284C7] dark:text-[#38BDF8]" />
              <span className="hidden sm:inline">Sao lưu</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            </button>

            {/* Import Raid from Image Button */}
            <button
              type="button"
              id="btn-open-import-image-modal"
              onClick={() => setIsImportImageModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-950/40 dark:to-sky-950/40 hover:from-cyan-100 hover:to-sky-100 dark:hover:from-cyan-900/50 dark:hover:to-sky-900/50 text-[#0284C7] dark:text-[#7DD3FC] border border-[#7DD3FC] dark:border-[#163E56] rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Import dữ liệu bảng Raid từ ảnh bất kỳ (nhận diện tự động)"
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284C7] dark:text-[#38BDF8]" />
              <span className="hidden sm:inline font-bold">Import ảnh</span>
              <span className="sm:hidden font-bold text-[11px]">Import</span>
            </button>

            {/* Export / Share Modal Button */}
            <button
              type="button"
              id="btn-open-export-modal"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-[#00B4D8] hover:bg-[#0284C7] active:bg-[#0369A1] text-white font-black rounded-xl text-xs transition-all shadow-[0_0_14px_rgba(0,180,216,0.35)] min-h-[38px] cursor-pointer border border-[#38BDF8]"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Xuất ảnh</span>
              <span className="sm:hidden text-[11px]">Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 relative z-10">
        {/* Board Selector Bar (Raid & Bang Chiến) */}
        <section className="mb-4 bg-[#F0FDFA] dark:bg-[#0D2838] border-2 border-[#7DD3FC] dark:border-[#163E56] rounded-2xl p-2.5 sm:p-3 shadow-2xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Mode Switcher + Boards Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar flex-1">
              {/* Mode Toggle Pills */}
              <div className="flex items-center p-0.5 bg-[#E0F7FA] dark:bg-[#071A24] rounded-xl shrink-0 border border-[#7DD3FC] dark:border-[#163E56] gap-0.5">
                <button
                  type="button"
                  id="btn-mode-raid"
                  onClick={() => setAppMode('RAID')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    appMode === 'RAID'
                      ? 'bg-[#00B4D8] text-white shadow-xs'
                      : 'text-[#0369A1] dark:text-[#7DD3FC] hover:text-[#03045E] dark:hover:text-white'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Raid ({boards.length})</span>
                </button>
                <button
                  type="button"
                  id="btn-mode-raid-update"
                  onClick={() => setAppMode('RAID_UPDATE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    appMode === 'RAID_UPDATE'
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-xs font-black'
                      : 'text-[#0369A1] dark:text-[#7DD3FC] hover:text-[#03045E] dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Raid Update ({updateBoards.length})</span>
                </button>
                <button
                  type="button"
                  id="btn-mode-guild-war"
                  onClick={() => setAppMode('GUILD_WAR')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    appMode === 'GUILD_WAR'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs font-black'
                      : 'text-[#0369A1] dark:text-[#7DD3FC] hover:text-[#03045E] dark:hover:text-white'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Bang Chiến ({guildWarBoards.length})</span>
                </button>
              </div>

              <div className="h-5 w-px bg-[#7DD3FC] dark:border-[#163E56] shrink-0" />

              {/* Tabs for current mode */}
              {appMode !== 'GUILD_WAR' ? (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {/* Active Board Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F0FDFA] dark:bg-[#153B52] border border-[#7DD3FC] dark:border-[#1E4D6B] text-xs font-bold shrink-0">
                    <span className="text-[#0369A1] dark:text-[#BAE6FD] text-[11px]">Bảng hiện tại:</span>
                    <span className="font-black text-[#0284C7] dark:text-[#38BDF8]">
                      {activeBoard.titlePrefix}
                    </span>
                    <span className="text-[#0369A1] text-[11px] hidden md:inline">
                      • {activeBoard.scheduleTime || 'MON 20:30'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-[#CCFBF1] dark:bg-[#0C4A6E] text-[#0284C7] dark:text-[#7DD3FC]">
                      {activeBoard.members.filter((m) => m.ingame && m.ingame.trim() !== '').length}/{activeBoard.members.length}
                    </span>
                  </div>

                  {/* Quick Toggle / Open Vertical Board Navigator */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('table');
                      setIsBoardNavOpen(!isBoardNavOpen);
                    }}
                    title="Bật/Tắt danh sách cuộn dọc các bảng ở bên trái bảng xếp Raid"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 shadow-2xs cursor-pointer ${
                      isBoardNavOpen && activeTab === 'table'
                        ? 'border-[#00B4D8] bg-[#CCFBF1] text-[#0284C7] dark:bg-[#134E4A] dark:text-[#7DD3FC] font-black'
                        : 'border-[#7DD3FC] dark:border-[#163E56] bg-[#F0FDFA] dark:bg-[#0D2838] text-[#0369A1] dark:text-[#E0F7FA] hover:bg-[#CCFBF1]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Cột Bảng Dọc ({currentBoards.length})</span>
                  </button>

                  {/* Inline Add New Board Quick Button */}
                  <button
                    type="button"
                    id="btn-tab-add-board"
                    onClick={handleAddNewEmptyBoard}
                    title={`Tạo nhanh Bảng ${isRaidUpdate ? 'Raid Update' : 'Raid'} ${currentBoards.length + 1}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-[#00B4D8] dark:border-[#00B4D8]/60 bg-[#F0FDFA] hover:bg-[#CCFBF1] dark:bg-[#153B52] dark:hover:bg-[#1E4D6B] text-[#0284C7] dark:text-[#38BDF8] text-xs font-bold transition-all shrink-0 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Bảng (Raid {currentBoards.length + 1})</span>
                  </button>
                </div>
              ) : (
                <>
                  {guildWarBoards.map((gwBoard) => {
                    const isActive = gwBoard.id === activeGuildWarBoard.id;
                    return (
                      <div
                        key={gwBoard.id}
                        onClick={() => setActiveGuildWarBoardId(gwBoard.id)}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all shrink-0 select-none ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white border-transparent shadow-xs'
                            : 'bg-slate-50 dark:bg-[#162230] text-slate-700 dark:text-[#CADEEA] border-slate-200 dark:border-[#1F3347] hover:bg-slate-100 dark:hover:bg-[#1D2D40]'
                        }`}
                      >
                        <Swords className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">
                          {gwBoard.title}
                        </span>

                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            isActive
                              ? 'bg-white/25 text-white'
                              : 'bg-slate-200 dark:bg-[#1B2A3B] text-slate-600 dark:text-[#8CA4B8]'
                          }`}
                        >
                          {gwBoard.members.length}
                        </span>

                        {guildWarBoards.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGuildWarBoard(gwBoard.id);
                            }}
                            title="Xoá bảng Bang Chiến này"
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

                  <button
                    type="button"
                    onClick={() => setIsCreateGuildWarModalOpen(true)}
                    title={`Tạo bảng Bang Chiến mới`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-amber-400 dark:border-amber-600/70 bg-amber-50/70 hover:bg-amber-100 dark:bg-[#162230] dark:hover:bg-[#1D2D40] text-amber-800 dark:text-amber-300 text-xs font-bold transition-all shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>+ Thêm Bảng Bang Chiến</span>
                  </button>
                </>
              )}
            </div>

            {/* Board Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
              {appMode === 'RAID_UPDATE' ? (
                <>
                  {/* Button Chuyển / Sao chép dữ liệu từ Raid & Bang chiến sang Raid Update */}
                  <button
                    type="button"
                    id="btn-open-copy-to-update-modal"
                    onClick={() => setIsCopyModalOpen(true)}
                    title="Sao chép / Chuyển nhân sự từ Kho Raid, Bảng Raid và Bang Chiến vào Kho Raid Update"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)] min-h-[36px] active:scale-95 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao Chép từ Raid / BC</span>
                  </button>

                  <button
                    type="button"
                    id="btn-open-create-board-modal"
                    onClick={() => setIsCreateBoardModalOpen(true)}
                    title={`Mở hộp thoại tạo bảng Raid Update mới (ví dụ RAID ${updateBoards.length + 1})`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-slate-950 rounded-xl text-xs font-black transition-all shadow-[0_0_12px_rgba(52,211,153,0.35)] min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tạo Bảng Update</span>
                  </button>

                  <button
                    type="button"
                    id="btn-all-boards-overview-top"
                    onClick={() => setActiveTab('all-boards')}
                    title="Xem tổng tình trạng tất cả các bảng Raid Update cùng lúc"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] shadow-2xs ${
                      activeTab === 'all-boards'
                        ? 'bg-emerald-400 text-slate-950 shadow-xs font-black'
                        : 'bg-white dark:bg-[#162230] hover:bg-slate-100 dark:hover:bg-[#1D2D40] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#1F3347]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Tổng Tình Trạng ({updateBoards.length})</span>
                  </button>

                  <button
                    type="button"
                    id="btn-duplicate-board"
                    onClick={handleDuplicateActiveBoard}
                    title="Nhân bản bảng Raid Update hiện tại"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-[#162230] hover:bg-slate-200 dark:hover:bg-[#1D2D40] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#1F3347] rounded-xl text-xs font-bold transition-all min-h-[36px]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Nhân bản</span>
                  </button>
                </>
              ) : appMode === 'RAID' ? (
                <>
                  <button
                    type="button"
                    id="btn-open-create-board-modal"
                    onClick={() => {
                      setAppMode('RAID');
                      setIsCreateBoardModalOpen(true);
                    }}
                    title={`Mở hộp thoại tạo bảng Raid mới (ví dụ RAID ${boards.length + 1})`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5EB839] hover:bg-[#52A332] text-white rounded-xl text-xs font-black transition-all shadow-[0_0_12px_rgba(94,184,57,0.35)] min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tạo Bảng Raid</span>
                  </button>

                  <button
                    type="button"
                    id="btn-open-guildwar-modal"
                    onClick={() => {
                      setIsCreateGuildWarModalOpen(true);
                    }}
                    title="Tạo Bảng Bang Chiến mới (Bảng nhân sự, chia 5 team Top/Mid/Bot/Cơ Động/Đẩy Trụ & điểm danh)"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-xs min-h-[36px] active:scale-95"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>+ Tạo Bảng Bang Chiến</span>
                  </button>

                  <button
                    type="button"
                    id="btn-all-boards-overview-top"
                    onClick={() => setActiveTab('all-boards')}
                    title="Xem tổng tình trạng tất cả các bảng Raid cùng lúc"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] shadow-2xs ${
                      activeTab === 'all-boards'
                        ? 'bg-[#5EB839] text-white shadow-xs font-black'
                        : 'bg-white dark:bg-[#162B20] hover:bg-slate-100 dark:hover:bg-[#1C3628] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#1D3D2D]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-emerald-600 dark:text-[#A6DE8C]" />
                    <span>Tổng Tình Trạng ({boards.length})</span>
                  </button>

                  <button
                    type="button"
                    id="btn-duplicate-board"
                    onClick={handleDuplicateActiveBoard}
                    title="Nhân bản bảng Raid hiện tại"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-[#162230] hover:bg-slate-200 dark:hover:bg-[#1D2D40] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#1F3347] rounded-xl text-xs font-bold transition-all min-h-[36px]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Nhân bản</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  id="btn-open-guildwar-modal"
                  onClick={() => {
                    setIsCreateGuildWarModalOpen(true);
                  }}
                  title="Tạo Bảng Bang Chiến mới (Bảng nhân sự, chia 5 team Top/Mid/Bot/Cơ Động/Đẩy Trụ & điểm danh)"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-xs min-h-[36px] active:scale-95"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>+ Tạo Bảng Bang Chiến</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {appMode === 'GUILD_WAR' ? (
          <GuildWarBoardView
            board={activeGuildWarBoard}
            customColors={customColors}
            personnelPool={guildWarPersonnelPool}
            masterPersonnelPool={masterPersonnelPool}
            onUpdatePersonnelPool={(next) => {
              const prev = guildWarPersonnelPool;
              setGuildWarPersonnelPool(next);
              safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
              saveToIndexedDB('guildWarPersonnelPool', next);
              if (next.length < prev.length) {
                const nextNorms = new Set(next.map((p) => normalizeName(p.ingame)).filter(Boolean));
                const removed = new Set(
                  prev.map((p) => normalizeName(p.ingame)).filter((n) => n && !nextNorms.has(n))
                );
                syncGuildWarPoolToBoard(next, 'delete', removed);
              } else {
                syncGuildWarPoolToBoard(next, 'add');
              }
            }}
            raidMembers={activeBoard.members}
            onUpdateBoard={handleUpdateGuildWarBoard}
            onDeleteBoard={handleDeleteGuildWarBoard}
            onDuplicateBoard={handleDuplicateGuildWarBoard}
            onSwitchToRaidMode={() => setAppMode('RAID')}
          />
        ) : (
          <>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-[#7DD3FC]/50 dark:border-[#163E56] pb-3">
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  id="tab-view-table"
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                    activeTab === 'table'
                      ? 'bg-[#00B4D8] text-white dark:bg-[#00B4D8] dark:text-white shadow-md font-black border-2 border-[#03045E] dark:border-[#0284C7]'
                      : 'bg-[#F0FDFA]/90 hover:bg-[#F0FDFA] dark:bg-[#0D2838] text-[#0369A1] dark:text-[#E0F7FA] hover:bg-[#CCFBF1] dark:hover:bg-[#153B52] border border-[#7DD3FC] dark:border-[#163E56] shadow-2xs'
                  }`}
                >
                  <TableIcon className="w-4 h-4 shrink-0" />
                  <span>{isRaidUpdate ? 'Bảng Xếp Raid Update' : 'Bảng Xếp Raid'}</span>
                </button>

                <button
                  type="button"
                  id="tab-view-all-boards"
                  onClick={() => setActiveTab('all-boards')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                    activeTab === 'all-boards'
                      ? 'bg-[#00B4D8] text-white dark:bg-[#00B4D8] dark:text-white shadow-md font-black border-2 border-[#03045E] dark:border-[#0284C7]'
                      : 'bg-[#F0FDFA]/90 hover:bg-[#F0FDFA] dark:bg-[#0D2838] text-[#0369A1] dark:text-[#E0F7FA] hover:bg-[#CCFBF1] dark:hover:bg-[#153B52] border border-[#7DD3FC] dark:border-[#163E56] shadow-2xs'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span>Tổng Quan Tất Cả Bảng</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'all-boards'
                        ? 'bg-white/25 text-white'
                        : 'bg-[#CCFBF1] dark:bg-[#163E56] text-[#0284C7] dark:text-[#7DD3FC]'
                    }`}
                  >
                    {currentBoards.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-view-master-personnel"
                  onClick={() => {
                    setActiveTab('personnel');
                    setActivePoolView('master');
                  }}
                  title="Tổng Kho Nhân Sự: Lưu trữ tập trung và chia sẻ sang các kho con"
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                    activeTab === 'personnel' && activePoolView === 'master'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md font-black border-2 border-[#03045E]'
                      : 'bg-[#F0FDFA]/90 hover:bg-[#F0FDFA] dark:bg-[#0D2838] text-[#0369A1] dark:text-[#E0F7FA] hover:bg-[#CCFBF1] dark:hover:bg-[#153B52] border border-[#7DD3FC] dark:border-[#163E56] shadow-2xs'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  <span>Tổng Kho</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'personnel' && activePoolView === 'master'
                        ? 'bg-white/25 text-white'
                        : 'bg-[#CCFBF1] dark:bg-[#163E56] text-[#0284C7] dark:text-[#7DD3FC]'
                    }`}
                  >
                    {masterPersonnelPool.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-view-personnel"
                  onClick={() => {
                    setActiveTab('personnel');
                    if (activePoolView === 'master') {
                      setActivePoolView(isRaidUpdate ? 'raid_update' : 'raid');
                    }
                  }}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                    activeTab === 'personnel' && activePoolView !== 'master'
                      ? 'bg-[#00B4D8] text-white dark:bg-[#00B4D8] dark:text-white shadow-md font-black border-2 border-[#03045E] dark:border-[#0284C7]'
                      : 'bg-[#F0FDFA]/90 hover:bg-[#F0FDFA] dark:bg-[#0D2838] text-[#0369A1] dark:text-[#E0F7FA] hover:bg-[#CCFBF1] dark:hover:bg-[#153B52] border border-[#7DD3FC] dark:border-[#163E56] shadow-2xs'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>{isRaidUpdate ? 'Kho Update' : 'Kho Raid'}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'personnel' && activePoolView !== 'master'
                        ? 'bg-white/25 text-white'
                        : 'bg-[#CCFBF1] dark:bg-[#163E56] text-[#0284C7] dark:text-[#7DD3FC]'
                    }`}
                  >
                    {isRaidUpdate ? updatePersonnelPool.length : personnelPool.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-view-parties"
                  onClick={() => setActiveTab('parties')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                    activeTab === 'parties'
                      ? 'bg-[#00B4D8] text-white dark:bg-[#00B4D8] dark:text-white shadow-md font-black border-2 border-[#03045E] dark:border-[#0284C7]'
                      : 'bg-[#F0FDFA]/90 hover:bg-[#F0FDFA] dark:bg-[#0D2838] text-[#0369A1] dark:text-[#E0F7FA] hover:bg-[#CCFBF1] dark:hover:bg-[#153B52] border border-[#7DD3FC] dark:border-[#163E56] shadow-2xs'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Phân Nhóm PT</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'parties'
                        ? 'bg-white/25 text-white'
                        : 'bg-[#CCFBF1] dark:bg-[#163E56] text-[#0284C7] dark:text-[#7DD3FC]'
                    }`}
                  >
                    {activeBoard.parties?.length || 2}
                  </span>
                </button>
              </div>

              {activeTab === 'table' && (
                <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                  {/* Toggle Vertical Board Navigator on Left */}
                  <button
                    type="button"
                    id="btn-toggle-board-nav"
                    onClick={() => setIsBoardNavOpen(!isBoardNavOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-[#7DD3FC] dark:border-[#163E56] bg-[#F0FDFA] dark:bg-[#0D2838] text-[#0369A1] dark:text-[#7DD3FC] hover:bg-[#CCFBF1] dark:hover:bg-[#153B52] transition-colors cursor-pointer"
                    title="Bật/Tắt danh sách cuộn dọc các bảng bên trái"
                  >
                    {isBoardNavOpen ? (
                      <>
                        <PanelLeftClose className="w-4 h-4" />
                        <span>Ẩn DS Bảng</span>
                      </>
                    ) : (
                      <>
                        <PanelLeftOpen className="w-4 h-4" />
                        <span>Hiện DS Bảng ({currentBoards.length})</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Personnel Sidebar on Right */}
                  <button
                    type="button"
                    id="btn-toggle-personnel-sidebar"
                    onClick={() => setIsPersonnelSidebarOpen(!isPersonnelSidebarOpen)}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-[#162B20] text-emerald-800 dark:text-[#A6DE8C] hover:bg-emerald-100 dark:hover:bg-[#1C3628] transition-colors cursor-pointer"
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

            {/* Tab 1: Main Table View with Side-by-Side Vertical Board Navigator & Personnel Storage */}
            <div className={activeTab === 'table' ? 'block' : 'hidden'}>
              <div className="flex flex-col lg:flex-row items-start gap-4">
                {/* 1. Left Column: Vertical Scrollable Board Navigator */}
                {isBoardNavOpen && (
                  <nav aria-label="Danh sách các bảng Raid" className="w-full lg:w-[230px] xl:w-[250px] shrink-0 sticky top-20 z-10">
                    <VerticalBoardList
                      boards={currentBoards}
                      activeBoardId={activeBoard.id}
                      onSelectBoard={(id) => {
                        if (isRaidUpdate) {
                          setActiveUpdateBoardId(id);
                        } else {
                          setActiveBoardId(id);
                        }
                      }}
                      onAddNewBoard={handleAddNewEmptyBoard}
                      onOpenCreateModal={() => setIsCreateBoardModalOpen(true)}
                      onDuplicateBoard={handleDuplicateBoardById}
                      onDeleteBoard={handleDeleteBoard}
                      isRaidUpdate={isRaidUpdate}
                    />
                  </nav>
                )}

                {/* 2. Center Column: Raid Table (Khung viền bo góc nhỏ gọn, ôm sát bảng vừa vặn) */}
                <section
                  aria-label="Bảng sắp xếp Raid"
                  className={`transition-all ${
                    isPersonnelSidebarOpen
                      ? 'shrink-0 w-full lg:w-[620px] xl:w-[630px] max-w-[630px] mx-auto lg:mx-0'
                      : 'flex-1 min-w-0 w-full flex justify-center'
                  }`}
                >
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-2.5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col items-center transition-colors w-full max-w-[630px]">
                    <RaidTable
                      titlePrefix={activeBoard.titlePrefix}
                      scheduleTime={activeBoard.scheduleTime}
                      bossName={activeBoard.bossName}
                      members={activeBoard.members}
                      parties={activeBoard.parties || DEFAULT_RAID_PARTIES}
                      customColors={customColors}
                      onUpdateTitle={handleUpdateTitle}
                      onUpdateMembers={handleUpdateMembers}
                      tableRef={tableRef}
                      selectedClassFilter={selectedClassFilter}
                      currentBoard={activeBoard}
                      allBoards={currentBoards}
                      onSwitchBoard={(id) => {
                        if (isRaidUpdate) {
                          setActiveUpdateBoardId(id);
                        } else {
                          setActiveBoardId(id);
                        }
                      }}
                    />
                  </div>
                </section>

                {/* 3. Right Column: Draggable Personnel Pool Sidebar (Kho nhân sự to rộng cân đối) */}
                {isPersonnelSidebarOpen && (
                  <aside aria-label="Kho nhân sự" className="flex-1 min-w-[340px] w-full sticky top-20 z-10 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
                    <PersonnelStorage
                      personnelPool={currentPersonnelPool}
                      onUpdatePersonnelPool={handleUpdatePersonnelPool}
                      activeRaidMembers={currentPoolActiveMembers}
                      allBoards={currentPoolBoardsForStorage}
                      activeBoardId={currentPoolActiveBoardId}
                      activeBoardTitle={currentPoolActiveBoardTitle}
                      onAssignToRaid={handleAssignPersonnelToRaid}
                      onRemoveFromRaid={handleRemoveFromRaid}
                      onSyncFromActiveRaid={handleSyncFromActiveRaid}
                      customColors={customColors}
                      isCompact={true}
                      isRaidUpdate={activePoolView === 'raid_update'}
                      onOpenCopyModal={() => setIsCopyModalOpen(true)}
                      onMoveToDiBui={handleMoveToDiBui}
                      poolType={activePoolView}
                      poolCounts={poolCounts}
                      onSwitchPoolType={(pt) => setActivePoolView(pt)}
                      onOpenShareModal={(target) => {
                        setShareModalTargetPool(target);
                        setIsSharePersonnelModalOpen(true);
                      }}
                      onQuickShareMember={handleQuickShareMember}
                      onPushToMaster={handlePushSubPoolToMaster}
                      onClearSubPool={handleClearCurrentSubPool}
                      onSyncFromGuildWar={handleSyncGuildWarToMaster}
                      subPoolMembershipMap={subPoolMembershipMap}
                    />
                  </aside>
                )}
              </div>
            </div>

            {/* Tab 2: Full Personnel Storage View */}
            {activeTab === 'personnel' && (
              <div className="max-w-4xl mx-auto space-y-4">
                <PersonnelStorage
                  personnelPool={currentPersonnelPool}
                  onUpdatePersonnelPool={handleUpdatePersonnelPool}
                  activeRaidMembers={currentPoolActiveMembers}
                  allBoards={currentPoolBoardsForStorage}
                  activeBoardId={currentPoolActiveBoardId}
                  activeBoardTitle={currentPoolActiveBoardTitle}
                  onAssignToRaid={handleAssignPersonnelToRaid}
                  onRemoveFromRaid={handleRemoveFromRaid}
                  onSyncFromActiveRaid={handleSyncFromActiveRaid}
                  customColors={customColors}
                  isCompact={false}
                  isRaidUpdate={activePoolView === 'raid_update'}
                  onOpenCopyModal={() => setIsCopyModalOpen(true)}
                  onMoveToDiBui={handleMoveToDiBui}
                  poolType={activePoolView}
                  poolCounts={poolCounts}
                  onSwitchPoolType={(pt) => setActivePoolView(pt)}
                  onOpenShareModal={(target) => {
                    setShareModalTargetPool(target);
                    setIsSharePersonnelModalOpen(true);
                  }}
                  onQuickShareMember={handleQuickShareMember}
                  onPushToMaster={handlePushSubPoolToMaster}
                  onClearSubPool={handleClearCurrentSubPool}
                  onSyncFromGuildWar={handleSyncGuildWarToMaster}
                  subPoolMembershipMap={subPoolMembershipMap}
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
                  currentBoard={activeBoard}
                  allBoards={currentBoards}
                  onSwitchBoard={(id) => {
                    if (isRaidUpdate) {
                      setActiveUpdateBoardId(id);
                    } else {
                      setActiveBoardId(id);
                    }
                  }}
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

            {/* Tab 4: All Boards Overview View */}
            {activeTab === 'all-boards' && (
              <AllBoardsOverview
                boards={currentBoards}
                activeBoardId={activeBoard.id}
                customColors={customColors}
                personnelPool={currentPersonnelPool}
                onSelectBoard={(boardId) => {
                  if (isRaidUpdate) {
                    setActiveUpdateBoardId(boardId);
                  } else {
                    setActiveBoardId(boardId);
                  }
                  setActiveTab('table');
                }}
                onDuplicateBoard={(boardId) => {
                  const target = currentBoards.find((b) => b.id === boardId);
                  if (target) {
                    const timestamp = Date.now();
                    const duplicated: RaidBoard = {
                      ...target,
                      id: `board_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
                      titlePrefix: `${target.titlePrefix} (Bản sao)`,
                      createdAt: timestamp,
                      members: target.members.map((m) => ({
                        ...m,
                        id: `m_${timestamp}_${m.stt}`,
                      })),
                    };
                    if (isRaidUpdate) {
                      setUpdateBoards((prev) => [...prev, duplicated]);
                    } else {
                      setBoards((prev) => [...prev, duplicated]);
                    }
                    showToast(`Đã nhân bản "${duplicated.titlePrefix}"!`);
                  }
                }}
                onDeleteBoard={(boardId) => handleDeleteBoard(boardId)}
                onToggleCheckMember={handleToggleCheckMemberInBoard}
                onOpenCreateBoardModal={() => setIsCreateBoardModalOpen(true)}
                onBackToTable={() => setActiveTab('table')}
              />
            )}
          </>
        )}

        {/* Kho Đi Bụi - Thay thế vị trí Danh Sách Chỉnh Màu Môn Phái */}
        <section aria-label="Kho Đi Bụi" className="mt-6 max-w-5xl mx-auto">
          <DiBuiStorage
            diBuiPool={diBuiPersonnelPool}
            onUpdateDiBuiPool={handleUpdateDiBuiPersonnelPool}
            onRestoreToActivePool={handleRestoreFromDiBui}
            customColors={customColors}
            isCompact={false}
            activePoolName={
              activePoolView === 'raid_update'
                ? 'Kho Raid Update'
                : activePoolView === 'guild_war'
                ? 'Kho Bang Chiến'
                : 'Kho Raid'
            }
          />
        </section>
      </main>

      {/* Footer chứng nhận bản quyền & thông tin hệ thống */}
      <footer className="mt-12 py-8 border-t border-slate-200 dark:border-slate-800/80 bg-gradient-to-b from-white/70 via-white/90 to-white dark:from-slate-950/50 dark:via-slate-950/80 dark:to-slate-950 backdrop-blur-md transition-colors">
        <div className="max-w-5xl mx-auto px-4 flex flex-col items-center justify-center gap-3 text-center">
          {/* Badge bản quyền chính tâm */}
          <div className="inline-flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-900/90 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs sm:text-sm">
              Trang web thuộc bản quyền & phát triển bởi{' '}
              <strong className="text-[#0284C7] dark:text-[#38BDF8] font-black">Vy Lì</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-amber-600 dark:text-amber-400 font-black text-xs sm:text-sm">
              Bang Niên Du
            </span>
          </div>

          {/* Mô tả phụ đề hệ thống */}
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Hệ Thống Sắp Xếp Nhân Sự & Đội Hình Nghịch Thủy Hàn • Đồng Bộ Trực Tiếp Thời Gian Thực
          </p>

          {/* Dòng copyright */}
          <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
            © {new Date().getFullYear()} Vy Lì. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Export / Share Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tableRef={tableRef}
        raidTitle={fullRaidTitle}
        members={activeBoard.members}
        customColors={customColors}
        activeBoard={activeBoard}
        allBoards={currentBoards}
        isRaidUpdate={isRaidUpdate}
      />

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onPushToCloud={handlePushToCloudManual}
        onPullFromCloud={handlePullFromCloudManual}
        lastSyncTime={lastCloudSyncTime}
        isSyncing={isCloudSyncing}
        masterPersonnelCount={masterPersonnelPool.length}
        personnelCount={personnelPool.length}
        raidBoardsCount={boards.length}
        guildWarBoardsCount={guildWarBoards.length}
        updateBoardsCount={updateBoards.length}
        updatePersonnelCount={updatePersonnelPool.length}
        diBuiCount={diBuiPersonnelPool.length}
        showToast={showToast}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />

      {/* Daily Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        boards={boards}
        personnelPool={personnelPool}
        customColors={customColors}
        guildWarBoards={guildWarBoards}
        updateBoards={updateBoards}
        updatePersonnelPool={updatePersonnelPool}
        diBuiPersonnelPool={diBuiPersonnelPool}
        masterPersonnelPool={masterPersonnelPool}
        guildWarPersonnelPool={guildWarPersonnelPool}
        activeBoardId={activeBoardId}
        activeGuildWarBoardId={activeGuildWarBoardId}
        activeUpdateBoardId={activeUpdateBoardId}
        onRestoreData={handleRestoreBackupData}
        onShowToast={showToast}
      />

      {/* Import Raid From Image Modal */}
      <ImportRaidImageModal
        isOpen={isImportImageModalOpen}
        onClose={() => setIsImportImageModalOpen(false)}
        nextBoardNumber={currentBoards.length + 1}
        customColors={customColors}
        currentActiveBoard={activeBoard}
        onCreateNewBoard={(newBoard) => {
          if (isRaidUpdate) {
            setUpdateBoards((prev) => [...prev, newBoard]);
            setActiveUpdateBoardId(newBoard.id);
          } else {
            setBoards((prev) => [...prev, newBoard]);
            setActiveBoardId(newBoard.id);
          }
        }}
        onOverwriteCurrentBoard={(updated) => {
          updateActiveBoard(updated);
        }}
        showToast={showToast}
      />

      {/* Donate / Mời Cà Phê Modal */}
      <DonateModal
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
      />


      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        nextBoardNumber={currentBoards.length + 1}
        currentBoardTitle={activeBoard.titlePrefix}
        currentBoardMembers={activeBoard.members}
        raid1Members={currentBoards[0]?.members || RAID1_DEFAULT_EMPTY_MEMBERS}
        personnelPool={currentPersonnelPool}
        allBoards={currentBoards}
        onCreateBoard={handleCreateCustomBoard}
        onOpenCloneFromImage={() => setIsImportImageModalOpen(true)}
      />

      {/* Modal Sao Chép Nhân Sự Sang Raid Update */}
      <CopyPersonnelToUpdateModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        currentUpdatePool={updatePersonnelPool}
        raidPersonnelPool={masterPersonnelPool.length > 0 ? masterPersonnelPool : personnelPool}
        raidBoards={boards}
        guildWarBoards={guildWarBoards}
        customColors={customColors}
        onCopyMembers={handleCopyMembersToUpdatePool}
      />

      {/* Create Guild War Board Modal */}
      <CreateGuildWarModal
        isOpen={isCreateGuildWarModalOpen}
        onClose={() => setIsCreateGuildWarModalOpen(false)}
        nextBoardNumber={guildWarBoards.length + 1}
        personnelPool={guildWarPersonnelPool.length > 0 ? guildWarPersonnelPool : masterPersonnelPool}
        raidMembers={activeBoard.members}
        onCreateBoard={handleCreateGuildWarBoard}
      />

      {/* Modal Chia Sẻ Nhân Sự từ Tổng Kho sang các Kho Con */}
      <SharePersonnelModal
        isOpen={isSharePersonnelModalOpen}
        onClose={() => setIsSharePersonnelModalOpen(false)}
        masterPool={masterPersonnelPool}
        raidPool={personnelPool}
        updatePool={updatePersonnelPool}
        guildWarPool={guildWarPersonnelPool}
        customColors={customColors}
        initialTargetPool={shareModalTargetPool}
        onShare={handleSharePersonnel}
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
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>,
          document.body
        )}

      {/* Mascot Theme Chooser Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={appTheme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Direct Feedback to Gmail Chatbox */}
      <FeedbackChatbox />
    </div>
  );
}
