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
  AppMode,
  PersonnelSubPool,
} from './types';
import { createEmptyGuildWarBoard } from './constants/guildWarDefaults';
import { CreateGuildWarModal } from './components/GuildWar/CreateGuildWarModal';
import { GuildWarBoardView } from './components/GuildWar/GuildWarBoardView';
import { normalizeName } from './utils/duplicates';
import { RaidTable } from './components/RaidTable';
import { PersonnelStorage } from './components/PersonnelStorage';
import { SharePersonnelModal } from './components/SharePersonnelModal';
import { PartyManager } from './components/PartyManager';
import { ClassStatsBar } from './components/ClassStatsBar';
import { MatchaBackground } from './components/MatchaBackground';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ExportModal } from './components/ExportModal';
import { ColorCustomizerModal } from './components/ColorCustomizerModal';
import { CreateBoardModal } from './components/CreateBoardModal';
import { AllBoardsOverview } from './components/AllBoardsOverview';
import { CopyPersonnelToUpdateModal } from './components/CopyPersonnelToUpdateModal';
import { VerticalBoardList } from './components/VerticalBoardList';
import { DiBuiStorage } from './components/DiBuiStorage';
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
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Check,
  Calendar,
  Swords,
  Coffee,
  Cloud,
  Image as ImageIcon,
} from 'lucide-react';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DonateModal } from './components/DonateModal';
import { ImportRaidImageModal } from './components/ImportRaidImageModal';
import { PublicRoomNoticeModal } from './components/PublicRoomNoticeModal';
import {
  getSavedGuildId,
  pushToCloud,
  pullFromCloud,
  isAutoCloudSyncEnabled,
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
  // Dark Mode State - Default to false (#88DCFA Pastel theme)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return false; // Default to pastel #88DCFA theme
    } catch {
      return false;
    }
  });

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
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [isCreateGuildWarModalOpen, setIsCreateGuildWarModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<number | null>(null);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isImportImageModalOpen, setIsImportImageModalOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<RaidBoard | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPublicNoticeOpen, setIsPublicNoticeOpen] = useState(true);

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

          // F. Phục hồi Tổng Kho Nhân Sự từ IndexedDB:
          if (recovered.masterPersonnelPool && recovered.masterPersonnelPool.length > 0) {
            setMasterPersonnelPool((currentPool) => {
              const merged = mergePersonnelPools(currentPool, recovered.masterPersonnelPool!);
              if (merged.length !== currentPool.length) {
                console.info('[Storage] Tự động phục hồi Tổng Kho Nhân Sự từ IndexedDB:', merged.length);
                safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(merged));
                hasRestoredAny = true;
                return merged;
              }
              return currentPool;
            });
          }

          // G. Phục hồi Kho Bang Chiến từ IndexedDB:
          if (recovered.guildWarPersonnelPool && recovered.guildWarPersonnelPool.length > 0) {
            setGuildWarPersonnelPool((currentPool) => {
              const merged = mergePersonnelPools(currentPool, recovered.guildWarPersonnelPool!);
              if (merged.length !== currentPool.length) {
                console.info('[Storage] Tự động phục hồi Kho Bang Chiến từ IndexedDB:', merged.length);
                safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(merged));
                hasRestoredAny = true;
                return merged;
              }
              return currentPool;
            });
          }

          if (hasRestoredAny) {
            showToast('Đã tự động bảo toàn & phục hồi dữ liệu an toàn từ IndexedDB!');
          }
        }

        // 4. Nếu thiết bị vừa bị xoá sạch dữ liệu (Brave "Forget me", ẩn danh, thiết bị mới),
        // tự động kiểm tra và phục hồi từ Firebase Firestore Cloud (chỉ áp dụng cho phòng riêng, không áp dụng cho mã public nth_guild)
        try {
          const currentGid = getSavedGuildId();
          if (currentGid !== 'nth_guild') {
            const cloudRes = await pullFromCloud(currentGid);
            if (cloudRes.success && cloudRes.data && isMounted) {
            const cd = cloudRes.data;
            let restoredFromCloud = false;

            setPersonnelPool((curr) => {
              if (curr.length === 0 && cd.personnelPool && cd.personnelPool.length > 0) {
                safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(cd.personnelPool));
                saveToIndexedDB('personnelPool', cd.personnelPool);
                restoredFromCloud = true;
                return cd.personnelPool;
              }
              return curr;
            });

            setBoards((curr) => {
              const localCount = countMembersWithData(curr);
              const cloudCount = countMembersWithData(cd.boards || []);
              if (localCount === 0 && cloudCount > 0) {
                safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(cd.boards));
                saveToIndexedDB('boards', cd.boards);
                if (cd.activeBoardId) {
                  setActiveBoardId(cd.activeBoardId);
                  safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD, cd.activeBoardId);
                }
                restoredFromCloud = true;
                return cd.boards;
              }
              return curr;
            });

            setGuildWarBoards((curr) => {
              const localGwCount = countGuildWarMembers(curr);
              const cloudGwCount = countGuildWarMembers(cd.guildWarBoards || []);
              if (localGwCount === 0 && cloudGwCount > 0) {
                safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(cd.guildWarBoards));
                saveToIndexedDB('guildWarBoards', cd.guildWarBoards);
                if (cd.activeGuildWarBoardId) {
                  setActiveGuildWarBoardId(cd.activeGuildWarBoardId);
                  safeLocalStorageSet(STORAGE_KEY_ACTIVE_GUILDWAR, cd.activeGuildWarBoardId);
                }
                restoredFromCloud = true;
                return cd.guildWarBoards;
              }
              return curr;
            });

            // Phục hồi Raid Update Pool từ Cloud nếu máy hiện tại trống
            setUpdatePersonnelPool((curr) => {
              if (curr.length === 0 && cd.updatePersonnelPool && cd.updatePersonnelPool.length > 0) {
                safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(cd.updatePersonnelPool));
                saveToIndexedDB('updatePersonnelPool', cd.updatePersonnelPool);
                restoredFromCloud = true;
                return cd.updatePersonnelPool;
              }
              return curr;
            });

            // Phục hồi các Bảng Raid Update từ Cloud nếu máy hiện tại trống
            setUpdateBoards((curr) => {
              const localCount = countMembersWithData(curr);
              const cloudCount = countMembersWithData(cd.updateBoards || []);
              if (localCount === 0 && cloudCount > 0) {
                safeLocalStorageSet(STORAGE_KEY_BOARDS_UPDATE, JSON.stringify(cd.updateBoards));
                saveToIndexedDB('updateBoards', cd.updateBoards);
                if (cd.activeUpdateBoardId) {
                  setActiveUpdateBoardId(cd.activeUpdateBoardId);
                  safeLocalStorageSet(STORAGE_KEY_ACTIVE_BOARD_UPDATE, cd.activeUpdateBoardId);
                  saveToIndexedDB('activeUpdateBoardId', cd.activeUpdateBoardId);
                }
                restoredFromCloud = true;
                return cd.updateBoards || curr;
              }
              return curr;
            });

            // Phục hồi Kho Đi Bụi từ Cloud nếu máy hiện tại trống
            setDiBuiPersonnelPool((curr) => {
              if (curr.length === 0 && cd.diBuiPersonnelPool && cd.diBuiPersonnelPool.length > 0) {
                safeLocalStorageSet(STORAGE_KEY_PERSONNEL_DI_BUI, JSON.stringify(cd.diBuiPersonnelPool));
                saveToIndexedDB('diBuiPersonnelPool', cd.diBuiPersonnelPool);
                restoredFromCloud = true;
                return cd.diBuiPersonnelPool;
              }
              return curr;
            });

            // Phục hồi Tổng Kho Nhân Sự từ Cloud nếu máy hiện tại trống
            setMasterPersonnelPool((curr) => {
              if (curr.length === 0 && cd.masterPersonnelPool && cd.masterPersonnelPool.length > 0) {
                safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(cd.masterPersonnelPool));
                saveToIndexedDB('masterPersonnelPool', cd.masterPersonnelPool);
                restoredFromCloud = true;
                return cd.masterPersonnelPool;
              }
              return curr;
            });

            // Phục hồi Kho Bang Chiến từ Cloud nếu máy hiện tại trống
            setGuildWarPersonnelPool((curr) => {
              if (curr.length === 0 && cd.guildWarPersonnelPool && cd.guildWarPersonnelPool.length > 0) {
                safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(cd.guildWarPersonnelPool));
                saveToIndexedDB('guildWarPersonnelPool', cd.guildWarPersonnelPool);
                restoredFromCloud = true;
                return cd.guildWarPersonnelPool;
              }
              return curr;
            });

            if (cd.updatedAt) {
              setLastCloudSyncTime(cd.updatedAt);
            }
            if (restoredFromCloud) {
              showToast('☁️ Đã tự động phục hồi toàn bộ dữ liệu từ Cloud Firestore!');
            }
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

  // Tự động kiểm tra và đồng bộ bổ sung mọi nhân sự từ Bang Chiến vào Tổng kho nhân sự
  useEffect(() => {
    if (!isStorageHydrated) return;
    const { updatedPool, addedCount } = syncGuildWarMembersToMasterPool(
      masterPersonnelPool,
      guildWarBoards,
      guildWarPersonnelPool
    );
    if (addedCount > 0) {
      console.info(`[MasterPoolSync] Đã tự động đồng bộ ${addedCount} nhân sự từ Bang Chiến vào Tổng kho nhân sự.`);
      setMasterPersonnelPool(updatedPool);
      safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(updatedPool));
      saveToIndexedDB('masterPersonnelPool', updatedPool);
      showToast(`Đã tự động đồng bộ thêm ${addedCount} nhân sự từ Bang Chiến vào Tổng kho!`);
    }
  }, [isStorageHydrated, masterPersonnelPool, guildWarBoards, guildWarPersonnelPool]);

  // Tự động kiểm tra và đồng bộ bổ sung mọi nhân sự từ Bảng Bang Chiến vào Kho Bang Chiến (Kho BC)
  useEffect(() => {
    if (!isStorageHydrated) return;
    const { updatedPool, addedCount } = syncGuildWarMembersToGuildWarPersonnelPool(
      guildWarPersonnelPool,
      guildWarBoards
    );
    if (addedCount > 0) {
      console.info(`[GuildWarPoolSync] Đã tự động đồng bộ ${addedCount} nhân sự từ Bảng Bang Chiến vào Kho BC.`);
      setGuildWarPersonnelPool(updatedPool);
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(updatedPool));
      saveToIndexedDB('guildWarPersonnelPool', updatedPool);
    }
  }, [isStorageHydrated, guildWarPersonnelPool, guildWarBoards]);

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

  // Debounced Auto-sync to Firebase Firestore Cloud
  useEffect(() => {
    if (!isStorageHydrated || !isAutoCloudSyncEnabled()) return;

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
        const currentGid = getSavedGuildId();
        // Không tự động lưu lên mã phòng public nth_guild (luôn để trống)
        if (currentGid === 'nth_guild') {
          return;
        }
        setIsCloudSyncing(true);
        const res = await pushToCloud(currentGid, {
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
        });
        if (res.success) {
          setLastCloudSyncTime(Date.now());
        }
      } catch (err) {
        console.warn('[CloudSync] Debounced push error:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    }, 2500);

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

  const handlePushToCloudManual = async (targetGuildId: string) => {
    setIsCloudSyncing(true);
    try {
      const res = await pushToCloud(targetGuildId, {
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
      });
      if (res.success) {
        setLastCloudSyncTime(Date.now());
      }
      return res;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handlePullFromCloudManual = async (targetGuildId: string) => {
    setIsCloudSyncing(true);
    try {
      const res = await pullFromCloud(targetGuildId);
      if (res.success && res.data) {
        const cd = res.data;
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
        }
        setLastCloudSyncTime(cd.updatedAt || Date.now());
      }
      return res;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Guild War Board Handlers
  const handleCreateGuildWarBoard = (newBoard: GuildWarBoard) => {
    setGuildWarBoards((prev) => [...prev, newBoard]);
    setActiveGuildWarBoardId(newBoard.id);
    setAppMode('GUILD_WAR');
    showToast(`Đã tạo bảng "${newBoard.title}" thành công!`);
  };

  // Immediate synchronous & multi-layer persistent personnel pool updater
  const handleUpdatePersonnelPool = useCallback(
    (action: PersonnelMember[] | ((prev: PersonnelMember[]) => PersonnelMember[])) => {
      if (activePoolView === 'master') {
        setMasterPersonnelPool((prev) => {
          const next = typeof action === 'function' ? action(prev) : action;
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
          return next;
        });
      } else if (activePoolView === 'raid_update') {
        setUpdatePersonnelPool((prev) => {
          const next = typeof action === 'function' ? action(prev) : action;
          try {
            safeLocalStorageSet(STORAGE_KEY_PERSONNEL_UPDATE, JSON.stringify(next));
          } catch (e) {
            console.error('[Storage] Error persisting update personnel to localStorage:', e);
          }
          saveToIndexedDB('updatePersonnelPool', next);
          return next;
        });
      } else if (activePoolView === 'guild_war') {
        setGuildWarPersonnelPool((prev) => {
          const next = typeof action === 'function' ? action(prev) : action;
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
          return next;
        });
      } else {
        // activePoolView === 'raid'
        setPersonnelPool((prev) => {
          const next = typeof action === 'function' ? action(prev) : action;
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
      setGuildWarPersonnelPool((prev) => {
        const next = updateFn(prev);
        safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
        saveToIndexedDB('guildWarPersonnelPool', next);
        return next;
      });
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
      setGuildWarPersonnelPool((prev) => {
        const exists = prev.some((p) => normalizeName(p.ingame) === norm);
        let next: PersonnelMember[];
        if (exists) {
          next = prev.filter((p) => normalizeName(p.ingame) !== norm);
          showToast(`Đã gỡ "${member.ingame}" khỏi Kho Bang Chiến`);
        } else {
          next = [...prev, { ...member }];
          showToast(`Đã thêm "${member.ingame}" vào Kho Bang Chiến`);
        }
        safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
        saveToIndexedDB('guildWarPersonnelPool', next);
        return next;
      });
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

  // Personnel Assignment Handlers
  const handleAssignPersonnelToRaid = (
    person: PersonnelMember,
    targetStt?: number
  ) => {
    if (activePoolView === 'guild_war' || appMode === 'GUILD_WAR') {
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
      updateActiveBoard({ members: currentMembers });
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
      updateActiveBoard({ members: [...currentMembers, newMember] });
    }
  };

  const handleRemoveFromRaid = (ingame: string) => {
    const targetNorm = normalizeName(ingame);
    if (!targetNorm) return;

    if (activePoolView === 'guild_war' || appMode === 'GUILD_WAR') {
      const updated = activeGuildWarBoard.members
        .filter((m) => normalizeName(m.ingame) !== targetNorm)
        .map((m, idx) => ({ ...m, stt: idx + 1 }));
      handleUpdateGuildWarBoard({ ...activeGuildWarBoard, members: updated });
      showToast(`Đã gỡ "${ingame}" khỏi Bảng Bang Chiến.`);
      return;
    }

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
    if (activePoolView === 'guild_war') {
      const currentPool = guildWarPersonnelPool;
      const currentPoolIngames = new Set(
        currentPool.map((p) => normalizeName(p.ingame))
      );
      const toAdd: PersonnelMember[] = [];

      activeGuildWarBoard.members.forEach((m) => {
        const norm = normalizeName(m.ingame);
        if (norm && !currentPoolIngames.has(norm)) {
          currentPoolIngames.add(norm);
          toAdd.push({
            id: 'p_gw_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            ingame: m.ingame.trim(),
            className: m.className,
            loggedBy: (m.loggedBy || m.discord || m.ingame).trim(),
            note: m.note || '',
            createdAt: Date.now(),
          });
        }
      });

      if (toAdd.length > 0) {
        setGuildWarPersonnelPool((prev) => {
          const next = [...toAdd, ...prev];
          safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
          saveToIndexedDB('guildWarPersonnelPool', next);
          return next;
        });
        setMasterPersonnelPool((prev) => {
          const merged = mergePersonnelPools(prev, toAdd);
          safeLocalStorageSet(STORAGE_KEY_MASTER_PERSONNEL, JSON.stringify(merged));
          saveToIndexedDB('masterPersonnelPool', merged);
          return merged;
        });
        showToast(`Đã lưu thêm ${toAdd.length} nhân sự mới từ Bảng Bang Chiến vào Kho BC & Tổng kho!`);
      } else {
        showToast('Tất cả nhân sự trong Bảng Bang Chiến đã có đầy đủ trong Kho BC.');
      }
      return;
    }

    const currentPool = currentPersonnelPool;
    const currentPoolIngames = new Set(
      currentPool.map((p) => normalizeName(p.ingame))
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

      showToast(`🏕️ Đã chuyển "${person.ingame}" sang Kho Đi Bụi!`);
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

      showToast(`⚡ Chào mừng "${person.ingame}" quay lại game! Đã nạp vào Kho Nhân Sự.`);
    },
    [handleUpdatePersonnelPool]
  );

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
    <div className="min-h-screen bg-[#88DCFA] dark:bg-[#0B1219] text-slate-900 dark:text-[#E6F1F8] transition-colors pb-16 relative">
      {/* Animated Floating Tilted Mini Ice Cups Background */}
      <MatchaBackground />

      {/* Top Header Navbar - Tactical Cyan Style */}
      <header className="bg-white/95 dark:bg-[#101A24]/95 backdrop-blur-md border-b border-sky-300/80 dark:border-[#1F3347] sticky top-0 z-30 transition-colors shadow-xs">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#38BDF8] to-[#88DCFA] text-slate-950 flex items-center justify-center font-black text-xs sm:text-sm shadow-[0_0_14px_rgba(136,220,250,0.45)] shrink-0 tracking-wider">
              NTH
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-base leading-tight truncate tracking-tight">
                  {appMode === 'RAID'
                    ? 'NTH Raid Roster'
                    : appMode === 'RAID_UPDATE'
                    ? 'NTH Raid Update'
                    : 'NTH Bang Chiến'}
                </h1>
                {/* Active Cloud Sync Status Pill */}
                <div
                  onClick={() => setIsCloudModalOpen(true)}
                  title="Nhấn để mở cài đặt Cloud Sync"
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all border shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-[#162230] dark:hover:bg-[#1D2D40] border-slate-300 dark:border-[#1F3347]"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCloudSyncing ? 'bg-amber-400 animate-ping' : 'bg-[#88DCFA] shadow-[0_0_6px_rgba(136,220,250,0.8)]'}`} />
                  <span className="text-slate-600 dark:text-[#CADEEA]">
                    {isCloudSyncing ? 'Đang lưu...' : 'Cloud An Toàn'}
                  </span>
                </div>

                {/* Public Room Notice Pill */}
                {getSavedGuildId() === 'nth_guild' && (
                  <button
                    type="button"
                    onClick={() => setIsPublicNoticeOpen(true)}
                    title="Nhấn để xem lại thông báo & hướng dẫn đổi mã phòng public nth_guild"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>⚠️ Phòng public: nth_guild</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#8CA4B8] hidden sm:flex items-center gap-2 truncate font-medium">
                <span>
                  {appMode === 'RAID'
                    ? `${boards.length} bảng Raid`
                    : appMode === 'RAID_UPDATE'
                    ? `${updateBoards.length} bảng Raid Update`
                    : `${guildWarBoards.length} bảng Bang chiến`}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-sky-700 dark:text-[#88DCFA] font-semibold">{fullRaidTitle}</span>
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

            {/* Color Customizer Button */}
            <button
              type="button"
              id="btn-open-color-customizer"
              onClick={() => setIsColorModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs font-bold transition-all shadow-2xs relative min-h-[38px]"
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
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-sky-50 dark:bg-[#162230] hover:bg-sky-100 dark:hover:bg-[#1D2D40] text-sky-800 dark:text-[#88DCFA] border border-sky-300 dark:border-[#1F3347] rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 dark:text-[#88DCFA]" />
              <span className="hidden sm:inline">Sheets</span>
              {currentUser && (
                <span className="w-2 h-2 rounded-full bg-[#88DCFA] inline-block ml-0.5" />
              )}
            </button>

            {/* Donate / Cà phê Button */}
            <button
              type="button"
              id="btn-open-donate-modal"
              onClick={() => setIsDonateModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-50 hover:bg-amber-100 dark:bg-[#162230] dark:hover:bg-[#1D2D40] text-slate-800 dark:text-slate-100 border border-amber-300/80 dark:border-[#1F3347] rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Mời ly cà phê ủng hộ tác giả"
            >
              <span className="text-amber-500 dark:text-amber-400 text-sm">☕</span>
              <span className="hidden sm:inline font-bold">Cà phê</span>
              <span className="sm:hidden font-bold text-[11px]">Cà phê</span>
            </button>

            {/* Cloud Sync Button */}
            <button
              type="button"
              id="btn-open-cloud-modal"
              onClick={() => setIsCloudModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Đồng bộ Đám mây (Firebase Firestore) - Chống mất dữ liệu khi tắt web/đổi máy"
            >
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Đám mây</span>
              {isCloudSyncing ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#88DCFA] inline-block" />
              )}
            </button>

            {/* Import Raid from Image Button */}
            <button
              type="button"
              id="btn-open-import-image-modal"
              onClick={() => setIsImportImageModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Import dữ liệu bảng Raid từ ảnh bất kỳ (nhận diện tự động)"
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline font-bold">Import ảnh</span>
              <span className="sm:hidden font-bold text-[11px]">Import</span>
            </button>

            {/* Export / Share Modal Button */}
            <button
              type="button"
              id="btn-open-export-modal"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-[#88DCFA] hover:bg-[#68CEF6] active:bg-[#48bbf0] text-slate-950 font-black rounded-xl text-xs transition-all shadow-[0_0_14px_rgba(136,220,250,0.35)] min-h-[38px] cursor-pointer"
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
        <section className="mb-4 bg-white dark:bg-[#101A24] border border-sky-300/80 dark:border-[#1F3347] rounded-2xl p-2.5 sm:p-3 shadow-2xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Mode Switcher + Boards Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar flex-1">
              {/* Mode Toggle Pills */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-[#162230] rounded-xl shrink-0 border border-slate-200 dark:border-[#1F3347] gap-0.5">
                <button
                  type="button"
                  id="btn-mode-raid"
                  onClick={() => setAppMode('RAID')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    appMode === 'RAID'
                      ? 'bg-[#88DCFA] text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-[#8CA4B8] hover:text-black dark:hover:text-white'
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
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-xs font-black'
                      : 'text-slate-600 dark:text-[#8CA4B8] hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-950 dark:text-emerald-300" />
                  <span>Raid Update ({updateBoards.length})</span>
                </button>
                <button
                  type="button"
                  id="btn-mode-guild-war"
                  onClick={() => setAppMode('GUILD_WAR')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    appMode === 'GUILD_WAR'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-[#8CA4B8] hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Bang Chiến ({guildWarBoards.length})</span>
                </button>
              </div>

              <div className="h-5 w-px bg-slate-200 dark:border-[#1F3347] shrink-0" />

              {/* Tabs for current mode */}
              {appMode !== 'GUILD_WAR' ? (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {/* Active Board Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#162230] border border-slate-200 dark:border-[#1F3347] text-xs font-bold shrink-0">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Bảng hiện tại:</span>
                    <span
                      className={`font-black ${
                        isRaidUpdate ? 'text-emerald-700 dark:text-emerald-300' : 'text-sky-800 dark:text-[#88DCFA]'
                      }`}
                    >
                      {activeBoard.titlePrefix}
                    </span>
                    <span className="text-slate-500 text-[11px] hidden md:inline">
                      • {activeBoard.scheduleTime || 'MON 20:30'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isRaidUpdate
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : 'bg-sky-500/20 text-sky-800 dark:text-[#88DCFA]'
                      }`}
                    >
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
                        ? isRaidUpdate
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-black'
                          : 'border-sky-400 bg-sky-500/15 text-sky-800 dark:text-[#88DCFA] font-black'
                        : 'border-slate-200 dark:border-[#1F3347] bg-white dark:bg-[#162230] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1D2D40]'
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
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed text-xs font-bold transition-all shrink-0 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer ${
                      isRaidUpdate
                        ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-[#162230] dark:hover:bg-[#1D2D40] text-emerald-800 dark:text-emerald-300'
                        : 'border-sky-400 dark:border-sky-500/60 bg-sky-50/70 hover:bg-sky-100 dark:bg-[#162230] dark:hover:bg-[#1D2D40] text-sky-800 dark:text-[#88DCFA]'
                    }`}
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
                    <span>📋 Sao Chép từ Raid / BC</span>
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#88DCFA] hover:bg-[#68CEF6] text-slate-950 rounded-xl text-xs font-black transition-all shadow-[0_0_12px_rgba(136,220,250,0.35)] min-h-[36px]"
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
                        ? 'bg-[#88DCFA] text-slate-950 shadow-xs font-black'
                        : 'bg-white dark:bg-[#162230] hover:bg-slate-100 dark:hover:bg-[#1D2D40] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#1F3347]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-sky-600 dark:text-[#88DCFA]" />
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
              setGuildWarPersonnelPool(next);
              safeLocalStorageSet(STORAGE_KEY_GUILDWAR_PERSONNEL, JSON.stringify(next));
              saveToIndexedDB('guildWarPersonnelPool', next);
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-sky-400/50 dark:border-[#1F3347] pb-3">
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  id="tab-view-table"
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                    activeTab === 'table'
                      ? 'bg-slate-950 text-white dark:bg-[#88DCFA] dark:text-slate-950 shadow-md font-black'
                      : 'bg-white/80 hover:bg-white dark:bg-[#162230] text-slate-800 dark:text-[#CADEEA] hover:bg-slate-50 dark:hover:bg-[#1D2D40] border border-sky-300/80 dark:border-[#1F3347] shadow-2xs'
                  }`}
                >
                  <TableIcon className="w-4 h-4 shrink-0" />
                  <span>{isRaidUpdate ? '📋 Bảng Xếp Raid Update' : '📋 Bảng Xếp Raid'}</span>
                </button>

                <button
                  type="button"
                  id="tab-view-all-boards"
                  onClick={() => setActiveTab('all-boards')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                    activeTab === 'all-boards'
                      ? 'bg-slate-950 text-white dark:bg-[#88DCFA] dark:text-slate-950 shadow-md font-black'
                      : 'bg-white/80 hover:bg-white dark:bg-[#162230] text-slate-800 dark:text-[#CADEEA] hover:bg-slate-50 dark:hover:bg-[#1D2D40] border border-sky-300/80 dark:border-[#1F3347] shadow-2xs'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span>{isRaidUpdate ? '📊 Tổng Quan Tất Cả Bảng' : '📊 Tổng Quan Tất Cả Bảng'}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'all-boards'
                        ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                        : isRaidUpdate
                        ? 'bg-emerald-100 dark:bg-[#1B2A3B] text-emerald-800 dark:text-emerald-300'
                        : 'bg-sky-100 dark:bg-[#1B2A3B] text-sky-800 dark:text-[#88DCFA]'
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
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md font-black'
                      : 'bg-white/80 hover:bg-white dark:bg-[#162230] text-slate-800 dark:text-[#CADEEA] hover:bg-slate-50 dark:hover:bg-[#1D2D40] border border-sky-300/80 dark:border-[#1F3347] shadow-2xs'
                  }`}
                >
                  <span className="text-sm">🏛️</span>
                  <span>Tổng Kho</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'personnel' && activePoolView === 'master'
                        ? 'bg-white/25 text-white'
                        : 'bg-sky-100 dark:bg-[#1B2A3B] text-sky-800 dark:text-[#88DCFA]'
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
                      ? 'bg-slate-950 text-white dark:bg-[#88DCFA] dark:text-slate-950 shadow-md font-black'
                      : 'bg-white/80 hover:bg-white dark:bg-[#162230] text-slate-800 dark:text-[#CADEEA] hover:bg-slate-50 dark:hover:bg-[#1D2D40] border border-sky-300/80 dark:border-[#1F3347] shadow-2xs'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>{isRaidUpdate ? '👥 Kho Update' : '👥 Kho Raid'}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'personnel' && activePoolView !== 'master'
                        ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                        : isRaidUpdate
                        ? 'bg-emerald-100 dark:bg-[#1B2A3B] text-emerald-800 dark:text-emerald-300'
                        : 'bg-sky-100 dark:bg-[#1B2A3B] text-sky-800 dark:text-[#88DCFA]'
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
                      ? 'bg-slate-950 text-white dark:bg-[#88DCFA] dark:text-slate-950 shadow-md font-black'
                      : 'bg-white/80 hover:bg-white dark:bg-[#162230] text-slate-800 dark:text-[#CADEEA] hover:bg-slate-50 dark:hover:bg-[#1D2D40] border border-sky-300/80 dark:border-[#1F3347] shadow-2xs'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>🛡️ Phân Nhóm PT</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'parties'
                        ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                        : isRaidUpdate
                        ? 'bg-emerald-100 dark:bg-[#1B2A3B] text-emerald-800 dark:text-emerald-300'
                        : 'bg-sky-100 dark:bg-[#1B2A3B] text-sky-800 dark:text-[#88DCFA]'
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
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50 dark:bg-[#162230] text-sky-800 dark:text-[#88DCFA] hover:bg-sky-100 dark:hover:bg-[#1D2D40] transition-colors cursor-pointer"
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
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50 dark:bg-[#162230] text-sky-800 dark:text-[#88DCFA] hover:bg-sky-100 dark:hover:bg-[#1D2D40] transition-colors cursor-pointer"
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
                  <div className="w-full lg:w-[230px] xl:w-[250px] shrink-0 sticky top-20 z-10">
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
                  </div>
                )}

                {/* 2. Center Column: Raid Table (Khung viền bo góc nhỏ gọn, ôm sát bảng vừa vặn) */}
                <div
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
                      onOpenColorCustomizer={() => setIsColorModalOpen(true)}
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
                </div>

                {/* 3. Right Column: Draggable Personnel Pool Sidebar (Kho nhân sự to rộng cân đối) */}
                {isPersonnelSidebarOpen && (
                  <div className="flex-1 min-w-[340px] w-full sticky top-20 z-10 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
                    <PersonnelStorage
                      personnelPool={currentPersonnelPool}
                      onUpdatePersonnelPool={handleUpdatePersonnelPool}
                      activeRaidMembers={
                        activePoolView === 'guild_war'
                          ? (activeGuildWarBoard?.members as any) || []
                          : activeBoard.members
                      }
                      allBoards={
                        activePoolView === 'guild_war'
                          ? (guildWarBoards.map((b) => ({
                              id: b.id,
                              titlePrefix: b.title,
                              createdAt: b.createdAt,
                              members: (b.members || []) as any,
                            })) as any)
                          : currentBoards
                      }
                      activeBoardId={
                        activePoolView === 'guild_war'
                          ? activeGuildWarBoard.id
                          : activeBoard.id
                      }
                      activeBoardTitle={
                        activePoolView === 'guild_war'
                          ? activeGuildWarBoard.title
                          : activeBoard.titlePrefix
                      }
                      onAssignToRaid={handleAssignPersonnelToRaid}
                      onRemoveFromRaid={handleRemoveFromRaid}
                      onSyncFromActiveRaid={handleSyncFromActiveRaid}
                      customColors={customColors}
                      onOpenColorCustomizer={() => setIsColorModalOpen(true)}
                      isCompact={true}
                      isRaidUpdate={isRaidUpdate}
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

                    {/* Kho Đi Bụi - Vị trí phía dưới Kho Nhân Sự */}
                    <DiBuiStorage
                      diBuiPool={diBuiPersonnelPool}
                      onUpdateDiBuiPool={handleUpdateDiBuiPersonnelPool}
                      onRestoreToActivePool={handleRestoreFromDiBui}
                      customColors={customColors}
                      isCompact={true}
                      activePoolName={isRaidUpdate ? 'Kho Raid Update' : 'Kho Raid'}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tab 2: Full Personnel Storage View */}
            {activeTab === 'personnel' && (
              <div className="max-w-4xl mx-auto space-y-4">
                <PersonnelStorage
                  personnelPool={currentPersonnelPool}
                  onUpdatePersonnelPool={handleUpdatePersonnelPool}
                  activeRaidMembers={
                    activePoolView === 'guild_war'
                      ? (activeGuildWarBoard?.members as any) || []
                      : activeBoard.members
                  }
                  allBoards={
                    activePoolView === 'guild_war'
                      ? (guildWarBoards.map((b) => ({
                          id: b.id,
                          titlePrefix: b.title,
                          createdAt: b.createdAt,
                          members: (b.members || []) as any,
                        })) as any)
                      : currentBoards
                  }
                  activeBoardId={
                    activePoolView === 'guild_war'
                      ? activeGuildWarBoard.id
                      : activeBoard.id
                  }
                  activeBoardTitle={
                    activePoolView === 'guild_war'
                      ? activeGuildWarBoard.title
                      : activeBoard.titlePrefix
                  }
                  onAssignToRaid={handleAssignPersonnelToRaid}
                  onRemoveFromRaid={handleRemoveFromRaid}
                  onSyncFromActiveRaid={handleSyncFromActiveRaid}
                  customColors={customColors}
                  onOpenColorCustomizer={() => setIsColorModalOpen(true)}
                  isCompact={false}
                  isRaidUpdate={isRaidUpdate}
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

                {/* Kho Đi Bụi - Vị trí phía dưới Kho Nhân Sự */}
                <DiBuiStorage
                  diBuiPool={diBuiPersonnelPool}
                  onUpdateDiBuiPool={handleUpdateDiBuiPersonnelPool}
                  onRestoreToActivePool={handleRestoreFromDiBui}
                  customColors={customColors}
                  isCompact={false}
                  activePoolName={isRaidUpdate ? 'Kho Raid Update' : 'Kho Raid'}
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
        onOpenCloneFromImage={() => setIsImportImageModalOpen(true)}
      />

      {/* Export / Share Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tableRef={tableRef}
        raidTitle={fullRaidTitle}
        members={activeBoard.members}
        customColors={customColors}
        activeBoard={activeBoard}
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

      {/* Public Room Notice Modal */}
      <PublicRoomNoticeModal
        isOpen={isPublicNoticeOpen}
        onClose={() => setIsPublicNoticeOpen(false)}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onOpenDonateModal={() => setIsDonateModalOpen(true)}
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
            >
              ✕
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
