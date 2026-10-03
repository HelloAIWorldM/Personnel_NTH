import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GuildMember, GuildTeam, CustomClassColors, RaidClass } from '../../types';
import { getEffectiveClassMeta } from '../../constants/classes';
import {
  X,
  StickyNote,
  Copy,
  Check,
  Trash2,
  Users,
  Sparkles,
  Shield,
  Zap,
  Target,
  Megaphone,
  Compass,
  AlertTriangle,
  Save,
} from 'lucide-react';

interface TeamOption {
  id: GuildTeam;
  displayTitle: string;
  badgeColor: string;
}

const TEAMS_LIST: TeamOption[] = [
  { id: 'Cơ động', displayTitle: 'TEAM FLEX', badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { id: 'Mid', displayTitle: 'TEAM MID', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { id: 'Đẩy trụ', displayTitle: 'TEAM ĐẨY TRỤ', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];

interface GuildPartyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTeam: GuildTeam;
  initialParty: number; // 1 to 4
  members: GuildMember[];
  partyNotes: Record<string, string>;
  customColors?: CustomClassColors;
  onSaveNote: (key: string, noteText: string) => void;
}

export const GuildPartyNoteModal: React.FC<GuildPartyNoteModalProps> = ({
  isOpen,
  onClose,
  initialTeam,
  initialParty,
  members,
  partyNotes,
  customColors,
  onSaveNote,
}) => {
  const [currentTeam, setCurrentTeam] = useState<GuildTeam>(initialTeam);
  const [currentParty, setCurrentParty] = useState<number>(initialParty);
  const [noteText, setNoteText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync state when opening with new props
  useEffect(() => {
    if (isOpen) {
      setCurrentTeam(initialTeam);
      setCurrentParty(initialParty);
      const noteKey = `${initialTeam}-${initialParty}`;
      setNoteText(partyNotes[noteKey] || '');
      setIsCopied(false);
      setShowSavedFeedback(false);

      // Auto focus textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialTeam, initialParty]);

  // When switching team or party inside modal, update current noteText
  const handleSelectTarget = (team: GuildTeam, party: number) => {
    // Save current before switching
    const prevKey = `${currentTeam}-${currentParty}`;
    onSaveNote(prevKey, noteText);

    setCurrentTeam(team);
    setCurrentParty(party);
    const nextKey = `${team}-${party}`;
    setNoteText(partyNotes[nextKey] || '');
    setIsCopied(false);
    setShowSavedFeedback(false);
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseAndSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentTeam, currentParty, noteText]);

  if (!isOpen) return null;

  const currentKey = `${currentTeam}-${currentParty}`;
  const currentTeamConfig = TEAMS_LIST.find((t) => t.id === currentTeam) || TEAMS_LIST[0];

  // Get members assigned to this party (slot 1 to 6)
  const currentPartyMembers = members
    .filter((m) => m.team === currentTeam && m.party === currentParty && m.slot && m.slot >= 1 && m.slot <= 6)
    .sort((a, b) => (a.slot || 0) - (b.slot || 0));

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteText(val);
    onSaveNote(currentKey, val);
  };

  const handleInsertQuickTag = (tagText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const updated = noteText ? `${noteText}\n${tagText} ` : `${tagText} `;
      setNoteText(updated);
      onSaveNote(currentKey, updated);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = noteText.substring(0, start);
    const after = noteText.substring(end);

    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const insertion = `${prefix}${tagText}: `;
    const updated = before + insertion + after;
    setNoteText(updated);
    onSaveNote(currentKey, updated);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleCopyNote = async () => {
    if (!noteText.trim()) return;
    const content = `📝 **GHI CHÚ PT-${currentParty} (${currentTeamConfig.displayTitle})**:\n${noteText.trim()}`;
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearNote = () => {
    setNoteText('');
    onSaveNote(currentKey, '');
  };

  const handleCloseAndSave = () => {
    onSaveNote(currentKey, noteText);
    onClose();
  };

  const handleManualSave = () => {
    onSaveNote(currentKey, noteText);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#0f172a] text-slate-100 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#162238] border-b border-slate-700/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <StickyNote className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Ghi Chú Chiến Thuật
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black border ${currentTeamConfig.badgeColor}`}>
                  {currentTeamConfig.displayTitle}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PT-{currentParty}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                Lên chiến thuật, phân công mục tiêu & người chỉ huy cho đội hình
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseAndSave}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team & Party Quick Switcher Tabs */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#121c2e] border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Team Switcher */}
          <div className="flex items-center gap-1 bg-[#0b1322] p-1 rounded-xl border border-slate-800">
            {TEAMS_LIST.map((t) => {
              const isSelected = t.id === currentTeam;
              // Check if any party in this team has a note
              const teamHasAnyNote = [1, 2, 3, 4].some((p) => Boolean(partyNotes[`${t.id}-${p}`]?.trim()));

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTarget(t.id, currentParty)}
                  className={`relative px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{t.displayTitle}</span>
                  {teamHasAnyNote && !isSelected && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Party Switcher (PT-1 to PT-4) */}
          <div className="flex items-center gap-1 bg-[#0b1322] p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            {[1, 2, 3, 4].map((pNum) => {
              const isSelected = pNum === currentParty;
              const hasNote = Boolean(partyNotes[`${currentTeam}-${pNum}`]?.trim());

              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => handleSelectTarget(currentTeam, pNum)}
                  className={`relative px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>PT-{pNum}</span>
                  {hasNote && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-amber-400'
                      }`}
                      title="Có ghi chú"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {/* Party Members Roster Preview Bar */}
          <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Thành viên PT-{currentParty} ({currentPartyMembers.length}/6 người)</span>
              </div>
              <span className="text-[10px] text-slate-500">
                Nhân sự hiện tại trong đội hình
              </span>
            </div>

            {currentPartyMembers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentPartyMembers.map((m) => {
                  const meta = getEffectiveClassMeta(m.className, customColors);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141e30] border border-slate-800"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                          #{m.slot}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {m.ingame}
                        </span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: meta.bgColor,
                          color: meta.textColor,
                        }}
                      >
                        {m.className}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-slate-500 italic">
                Chưa có thành viên nào được xếp vào PT-{currentParty} ({currentTeamConfig.displayTitle}).
              </div>
            )}
          </div>

          {/* Quick-tag Suggestion Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Chèn nhanh mẫu mục tiêu chiến thuật:
              </span>
              <span className="text-[10px] text-slate-500">Nhấp để chèn</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleInsertQuickTag('🎯 Mục tiêu')}
                className="px-2.5 py-1 bg-[#162238] hover:bg-slate-800 hover:text-amber-300 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>🎯 Mục tiêu</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertQuickTag('🛡️ Nhiệm vụ')}
                className="px-2.5 py-1 bg-[#162238] hover:bg-slate-800 hover:text-amber-300 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>🛡️ Nhiệm vụ</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertQuickTag('🎙️ Shotcaller')}
                className="px-2.5 py-1 bg-[#162238] hover:bg-slate-800 hover:text-amber-300 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>🎙️ Shotcaller</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertQuickTag('📍 Hướng di chuyển')}
                className="px-2.5 py-1 bg-[#162238] hover:bg-slate-800 hover:text-amber-300 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>📍 Hướng di chuyển</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertQuickTag('⚠️ Lưu ý')}
                className="px-2.5 py-1 bg-[#162238] hover:bg-slate-800 hover:text-amber-300 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>⚠️ Lưu ý</span>
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300">
              Nội dung ghi chú cho PT-{currentParty}:
            </label>
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={handleTextChange}
              placeholder={`Ví dụ:\n- 🎯 Mục tiêu: Chiếm cứ điểm cánh trái, bắt Tank đối phương\n- 🎙️ Shotcaller: [Tên người hô lệnh]\n- 📍 Di chuyển: Bọc hậu sau khi pháo bắn xong...`}
              rows={6}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 bg-[#090f1a] border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono leading-relaxed resize-y min-h-[140px]"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>* Tự động lưu mọi thay đổi khi bạn gõ phím</span>
              <span>{noteText.length} ký tự</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 bg-[#121c2e] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {noteText.trim() && (
              <button
                type="button"
                onClick={handleClearNote}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 rounded-xl transition-colors cursor-pointer"
                title="Xóa ghi chú của PT này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ghi chú</span>
              </button>
            )}

            {noteText.trim() && (
              <button
                type="button"
                onClick={handleCopyNote}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Sao chép nội dung ghi chú kèm định dạng Discord"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy ghi chú</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              {showSavedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Đã lưu!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lưu</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCloseAndSave}
              className="px-4 py-1.5 text-xs font-black bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
