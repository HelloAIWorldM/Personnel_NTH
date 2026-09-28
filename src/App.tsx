import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'firebase/auth';
import { initAuth } from './services/auth';
import {
  createEmptyBoard,
  createSampleBoardFromImage,
  INITIAL_MEMBERS_FROM_IMAGE,
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
} from './types';
import { createSampleGuildWarBoard } from './constants/guildWarDefaults';
import { CreateGuildWarModal } from './components/GuildWar/CreateGuildWarModal';
import { GuildWarBoardView } from './components/GuildWar/GuildWarBoardView';
import { normalizeName } from './utils/duplicates';
import { RaidTable } from './components/RaidTable';
import { PersonnelStorage } from './components/PersonnelStorage';
import { PartyManager } from './components/PartyManager';
import { ClassStatsBar } from './components/ClassStatsBar';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ExportModal } from './components/ExportModal';
import { ColorCustomizerModal } from './components/ColorCustomizerModal';
import { CreateBoardModal } from './components/CreateBoardModal';
import { AllBoardsOverview } from './components/AllBoardsOverview';
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
  Swords,
  Database,
  Coffee,
} from 'lucide-react';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { DonateModal } from './components/DonateModal';
import {
  STORAGE_KEY_BOARDS,
  STORAGE_KEY_ACTIVE_BOARD,
  STORAGE_KEY_PERSONNEL,
  STORAGE_KEY_COLORS,
  STORAGE_KEY_THEME,
  STORAGE_KEY_GUILDWAR_BOARDS,
  STORAGE_KEY_ACTIVE_GUILDWAR,
  STORAGE_KEY_APP_MODE,
  loadInitialBoards,
  loadInitialPersonnel,
  loadInitialGuildWarBoards,
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
} from './utils/storageBackup';

export default function App() {
  // Dark Mode State - Default to true (Dark mode) for gaming theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'light') return false;
      return true;
    } catch {
      return true;
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

  // Personnel Storage Pool (Ingame, Class, Logged by) - Multi-layer persistence
  const [personnelPool, setPersonnelPool] = useState<PersonnelMember[]>(() => {
    return loadInitialPersonnel(INITIAL_PERSONNEL_POOL);
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

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [isCreateGuildWarModalOpen, setIsCreateGuildWarModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<RaidClass | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<RaidBoard | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // App Mode: 'RAID' (Bảng Raid) or 'GUILD_WAR' (Bảng Bang Chiến)
  const [appMode, setAppMode] = useState<'RAID' | 'GUILD_WAR'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APP_MODE);
      if (saved === 'GUILD_WAR' || saved === 'RAID') return saved;
    } catch {}
    return 'RAID';
  });

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

  // Active Board Resolver
  const activeBoard = useMemo(() => {
    return boards.find((b) => b.id === activeBoardId) || boards[0] || createEmptyBoard(1);
  }, [boards, activeBoardId]);

  // Active Guild War Board Resolver
  const activeGuildWarBoard = useMemo(() => {
    return (
      guildWarBoards.find((b) => b.id === activeGuildWarBoardId) ||
      guildWarBoards[0] ||
      createSampleGuildWarBoard(1)
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
            if (isSamplePersonnelPool(personnelPool)) {
              console.info(
                '[Storage] Tự động nạp Kho Nhân sự từ IndexedDB (thay cho mẫu):',
                recovered.personnelPool.length
              );
              setPersonnelPool(recovered.personnelPool);
              safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(recovered.personnelPool));
              hasRestoredAny = true;
            } else {
              const merged = mergePersonnelPools(personnelPool, recovered.personnelPool);
              if (merged.length !== personnelPool.length) {
                console.info(
                  '[Storage] Tự động hợp nhất Kho Nhân sự từ IndexedDB & LocalStorage:',
                  merged.length
                );
                setPersonnelPool(merged);
                safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(merged));
                hasRestoredAny = true;
              }
            }
          }

          // B. Phục hồi Bảng Raid nếu LocalStorage hiện rỗng hoặc ít dữ liệu hơn IndexedDB:
          const currentRaidCount = countMembersWithData(boards);
          if (recovered.boards && recovered.boards.length > 0) {
            const idbCount = countMembersWithData(recovered.boards);
            if (currentRaidCount === 0 && idbCount > 0) {
              console.info('[Storage] Tự động phục hồi Bảng Raid từ IndexedDB:', idbCount, 'thành viên');
              setBoards(recovered.boards);
              if (recovered.activeBoardId) setActiveBoardId(recovered.activeBoardId);
              hasRestoredAny = true;
            }
          }

          // C. Phục hồi Bảng Bang Chiến nếu LocalStorage hiện rỗng hoặc ít dữ liệu hơn:
          const currentGwCount = countGuildWarMembers(guildWarBoards);
          if (recovered.guildWarBoards && recovered.guildWarBoards.length > 0) {
            const idbGwCount = countGuildWarMembers(recovered.guildWarBoards);
            if (currentGwCount === 0 && idbGwCount > 0) {
              console.info(
                '[Storage] Tự động phục hồi Bảng Bang Chiến từ IndexedDB:',
                idbGwCount,
                'thành viên'
              );
              setGuildWarBoards(recovered.guildWarBoards);
              if (recovered.activeGuildWarBoardId) {
                setActiveGuildWarBoardId(recovered.activeGuildWarBoardId);
              }
              hasRestoredAny = true;
            }
          }

          // D. Phục hồi Custom Colors:
          if (
            recovered.customColors &&
            Object.keys(recovered.customColors).length > 0 &&
            Object.keys(customColors).length === 0
          ) {
            setCustomColors(recovered.customColors);
          }

          if (hasRestoredAny) {
            showToast('Đã tự động bảo toàn & phục hồi dữ liệu an toàn từ IndexedDB!');
          }
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
    appMode,
    isStorageHydrated,
  ]);

  // Save boards to localStorage, IndexedDB and auto-snapshot
  useEffect(() => {
    if (!isStorageHydrated) return;
    try {
      safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(boards));
      saveToIndexedDB('boards', boards);
      saveAutoSnapshot(boards, personnelPool, customColors, guildWarBoards);
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
      saveAutoSnapshot(boards, personnelPool, customColors, guildWarBoards);
    } catch (e) {
      console.error('Failed to save personnel pool:', e);
    }
  }, [personnelPool, isStorageHydrated]);

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
      saveAutoSnapshot(boards, personnelPool, customColors, guildWarBoards);
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
      setPersonnelPool((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        try {
          safeLocalStorageSet(STORAGE_KEY_PERSONNEL, JSON.stringify(next));
        } catch (e) {
          console.error('[Storage] Error persisting personnel to localStorage:', e);
        }
        saveToIndexedDB('personnelPool', next);
        saveAutoSnapshot(boards, next, customColors, guildWarBoards);
        return next;
      });
    },
    [boards, customColors, guildWarBoards]
  );

  const handleUpdateGuildWarBoard = (updated: GuildWarBoard) => {
    setGuildWarBoards((prev) => {
      const next = prev.map((b) => (b.id === updated.id ? updated : b));
      safeLocalStorageSet(STORAGE_KEY_GUILDWAR_BOARDS, JSON.stringify(next));
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
    if (activeGuildWarBoardId === boardId) {
      setActiveGuildWarBoardId(remaining[0].id);
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
    setGuildWarBoards((prev) => [...prev, newBoard]);
    setActiveGuildWarBoardId(newBoard.id);
    setAppMode('GUILD_WAR');
    showToast(`Đã nhân bản thành "${newBoard.title}"`);
  };

  // Board Mutators
  const updateActiveBoard = (updates: Partial<RaidBoard>) => {
    setBoards((prev) => {
      const next = prev.map((b) => (b.id === activeBoard.id ? { ...b, ...updates } : b));
      safeLocalStorageSet(STORAGE_KEY_BOARDS, JSON.stringify(next));
      return next;
    });
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
    const nextNumber = boards.length + 1;
    const raid1Template = boards[0]?.members || INITIAL_MEMBERS_FROM_IMAGE;
    const newBoard = createEmptyBoard(nextNumber, raid1Template);
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    showToast(`Đã tạo thành công "${newBoard.titlePrefix}" theo định dạng Raid 1!`);
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

  // Toggle checkmark for member inside any board (for AllBoardsOverview)
  const handleToggleCheckMemberInBoard = (boardId: string, memberId: string) => {
    setBoards((prev) =>
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
      handleUpdatePersonnelPool((prev) => [...toAdd, ...prev]);
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

  const handleRestoreData = (restored: {
    boards?: RaidBoard[];
    personnelPool?: PersonnelMember[];
    customColors?: CustomClassColors;
    guildWarBoards?: GuildWarBoard[];
  }) => {
    if (restored.boards && restored.boards.length > 0) {
      setBoards(restored.boards);
      setActiveBoardId(restored.boards[0].id);
    }
    if (restored.personnelPool && restored.personnelPool.length > 0) {
      handleUpdatePersonnelPool(restored.personnelPool);
    }
    if (restored.customColors) {
      setCustomColors(restored.customColors);
    }
    if (restored.guildWarBoards && restored.guildWarBoards.length > 0) {
      setGuildWarBoards(restored.guildWarBoards);
      setActiveGuildWarBoardId(restored.guildWarBoards[0].id);
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

            {/* Donate / Cà phê Button */}
            <button
              type="button"
              id="btn-open-donate-modal"
              onClick={() => setIsDonateModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-amber-300/80 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Mời ly cà phê ủng hộ tác giả"
            >
              <span className="text-amber-500 dark:text-amber-400 text-sm">☕</span>
              <span className="hidden sm:inline font-bold">Cà phê</span>
              <span className="sm:hidden font-bold text-[11px]">Cà phê</span>
            </button>

            {/* Backup & Restore Data Button */}
            <button
              type="button"
              id="btn-open-backup-modal"
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px] cursor-pointer"
              title="Sao lưu và khôi phục dữ liệu Raid & Bang chiến"
            >
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Sao lưu</span>
            </button>

            {/* Export / Share Modal Button */}
            <button
              type="button"
              id="btn-open-export-modal"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs min-h-[38px] cursor-pointer"
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
        {/* Board Selector Bar (Raid & Bang Chiến) */}
        <section className="mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-2xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Mode Switcher + Boards Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar flex-1">
              {/* Mode Toggle Pills */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAppMode('RAID')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    appMode === 'RAID'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Raid ({boards.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAppMode('GUILD_WAR')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    appMode === 'GUILD_WAR'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Bang Chiến ({guildWarBoards.length})</span>
                </button>
              </div>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

              {/* Tabs for current mode */}
              {appMode === 'RAID' ? (
                <>
                  {boards.map((board) => {
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
                </>
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
                            ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
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
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
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
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-amber-400 dark:border-amber-600 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>+ Thêm Bảng Bang Chiến</span>
                  </button>
                </>
              )}
            </div>

            {/* Board Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-open-create-board-modal"
                onClick={() => {
                  setAppMode('RAID');
                  setIsCreateBoardModalOpen(true);
                }}
                title={`Mở hộp thoại tạo bảng Raid mới (ví dụ RAID ${boards.length + 1})`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-xs min-h-[36px]"
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

              {appMode === 'RAID' && (
                <>
                  <button
                    type="button"
                    id="btn-all-boards-overview-top"
                    onClick={() => setActiveTab('all-boards')}
                    title="Xem tổng tình trạng tất cả các bảng Raid cùng lúc"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] shadow-2xs ${
                      activeTab === 'all-boards'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tổng Tình Trạng ({boards.length})</span>
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
                </>
              )}
            </div>
          </div>
        </section>

        {appMode === 'GUILD_WAR' ? (
          <GuildWarBoardView
            board={activeGuildWarBoard}
            customColors={customColors}
            personnelPool={personnelPool}
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
                  id="tab-view-all-boards"
                  onClick={() => setActiveTab('all-boards')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                    activeTab === 'all-boards'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span>📊 Tổng Quan Tất Cả Bảng</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activeTab === 'all-boards'
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {boards.length}
                  </span>
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
                      onUpdatePersonnelPool={handleUpdatePersonnelPool}
                      activeRaidMembers={activeBoard.members}
                      allBoards={boards}
                      activeBoardId={activeBoard.id}
                      activeBoardTitle={activeBoard.titlePrefix}
                      onAssignToRaid={handleAssignPersonnelToRaid}
                      onRemoveFromRaid={handleRemoveFromRaid}
                      onSyncFromActiveRaid={handleSyncFromActiveRaid}
                      onLoadSamplePersonnel={() => handleUpdatePersonnelPool(INITIAL_PERSONNEL_POOL)}
                      customColors={customColors}
                      onOpenColorCustomizer={() => setIsColorModalOpen(true)}
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
                  onUpdatePersonnelPool={handleUpdatePersonnelPool}
                  activeRaidMembers={activeBoard.members}
                  allBoards={boards}
                  activeBoardId={activeBoard.id}
                  activeBoardTitle={activeBoard.titlePrefix}
                  onAssignToRaid={handleAssignPersonnelToRaid}
                  onRemoveFromRaid={handleRemoveFromRaid}
                  onSyncFromActiveRaid={handleSyncFromActiveRaid}
                  onLoadSamplePersonnel={() => handleUpdatePersonnelPool(INITIAL_PERSONNEL_POOL)}
                  customColors={customColors}
                  onOpenColorCustomizer={() => setIsColorModalOpen(true)}
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

            {/* Tab 4: All Boards Overview View */}
            {activeTab === 'all-boards' && (
              <AllBoardsOverview
                boards={boards}
                activeBoardId={activeBoard.id}
                customColors={customColors}
                personnelPool={personnelPool}
                onSelectBoard={(boardId) => {
                  setActiveBoardId(boardId);
                  setActiveTab('table');
                }}
                onDuplicateBoard={(boardId) => {
                  const target = boards.find((b) => b.id === boardId);
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
                    setBoards((prev) => [...prev, duplicated]);
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

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        boards={boards}
        personnelPool={personnelPool}
        customColors={customColors}
        guildWarBoards={guildWarBoards}
        onRestoreData={handleRestoreData}
        onShowToast={showToast}
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
        nextBoardNumber={boards.length + 1}
        currentBoardTitle={activeBoard.titlePrefix}
        currentBoardMembers={activeBoard.members}
        raid1Members={boards[0]?.members || INITIAL_MEMBERS_FROM_IMAGE}
        personnelPool={personnelPool}
        allBoards={boards}
        onCreateBoard={handleCreateCustomBoard}
      />

      {/* Create Guild War Board Modal */}
      <CreateGuildWarModal
        isOpen={isCreateGuildWarModalOpen}
        onClose={() => setIsCreateGuildWarModalOpen(false)}
        nextBoardNumber={guildWarBoards.length + 1}
        personnelPool={personnelPool}
        raidMembers={activeBoard.members}
        onCreateBoard={handleCreateGuildWarBoard}
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
