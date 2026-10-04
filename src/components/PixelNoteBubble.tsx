import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PersonnelMember, CustomClassColors } from '../types';
import { getEffectiveClassMeta } from '../constants/classes';
import { Check, X, Trash2, MessageSquare } from 'lucide-react';

interface PixelNoteBubbleProps {
  person: PersonnelMember;
  anchorRect: DOMRect;
  onSaveNote: (personId: string, note: string) => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  customColors?: CustomClassColors;
}

export const PixelNoteBubble: React.FC<PixelNoteBubbleProps> = ({
  person,
  anchorRect,
  onSaveNote,
  onClose,
  onMouseEnter,
  onMouseLeave,
  customColors,
}) => {
  const [noteText, setNoteText] = useState<string>(person.note || '');
  const [savedStatus, setSavedStatus] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Sync when person changes
  useEffect(() => {
    setNoteText(person.note || '');
    setSavedStatus(false);
  }, [person.id, person.note]);

  // Focus textarea on mount if user opened to edit
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Save handler
  const handleSave = () => {
    onSaveNote(person.id, noteText);
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
    }, 1800);
  };

  // Delete note handler
  const handleDeleteNote = () => {
    setNoteText('');
    onSaveNote(person.id, '');
    setSavedStatus(true);
  };

  const classMeta = getEffectiveClassMeta(person.className, customColors);

  // Layout calculations
  const bubbleWidth = 300;
  // If card is too close to top of screen (< 230px), place bubble below the card
  const placeAbove = anchorRect.top > 230;

  // Horizontal position clamped within viewport
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const left = Math.max(12, Math.min(anchorRect.left + 24, viewportWidth - bubbleWidth - 16));

  // Vertical position
  const bubbleEstimatedHeight = 175;
  const top = placeAbove
    ? Math.max(10, anchorRect.top - bubbleEstimatedHeight - 12)
    : anchorRect.bottom + 12;

  // Tail horizontal offset relative to bubble's left edge
  const tailLeft = Math.max(24, Math.min(anchorRect.left + 50 - left, bubbleWidth - 44));

  const content = (
    <div
      ref={bubbleRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${bubbleWidth}px`,
      }}
    >
      {/* 
        Custom Pixel Speech Bubble (Style theo ảnh mẫu):
        - Nền trắng tinh (#FFFFFF)
        - Viền đen nét dày 3px (#000000)
        - Góc bo pixel chuẩn retro
        - Đổ bóng khối pixel art đen (#000000 4px 4px)
        - Đuôi nhọn tam giác trỏ xuống nhân sự tương ứng
      */}
      <div
        className="relative bg-white text-slate-900 rounded-2xl p-3 border-[3px] border-black shadow-[4px_4px_0px_#000000]"
        style={{
          fontFamily: "'Courier New', Courier, monospace, sans-serif",
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b-2 border-black/15">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">💬</span>
            <span
              className="text-xs font-black text-black truncate max-w-[130px]"
              title={person.ingame}
            >
              {person.ingame || 'Chưa đặt tên'}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 border border-black/30"
              style={{
                backgroundColor: classMeta.bgColor,
                color: classMeta.textColor,
              }}
            >
              {person.className}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 hover:bg-black hover:text-white text-black border-2 border-black transition-colors text-xs font-black cursor-pointer shadow-[1px_1px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
            title="Đóng cửa sổ ghi chú (Esc)"
          >
            <X className="w-3 h-3 stroke-[3]" />
          </button>
        </div>

        {/* Textarea ghi chú */}
        <div className="space-y-1.5">
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setSavedStatus(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSave();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder={`Ghi chú cho ${person.ingame}... (vd: Dự bị PT2, đi muộn 15p, có đồ buff...)`}
            rows={3}
            className="w-full p-2 text-xs font-bold text-black bg-slate-50 border-2 border-black rounded-xl focus:bg-white focus:outline-none resize-none shadow-[inset_1px_1px_0px_rgba(0,0,0,0.15)] placeholder:text-slate-400 placeholder:font-normal placeholder:text-[11px]"
          />

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5">
              {savedStatus ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Đã lưu!</span>
                </span>
              ) : noteText !== (person.note || '') ? (
                <span className="text-[10px] font-bold text-amber-700">
                  Chưa lưu (Ctrl+Enter)
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500">
                  {noteText ? 'Đã lưu' : 'Để trống = không note'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {person.note && (
                <button
                  type="button"
                  onClick={handleDeleteNote}
                  className="px-2 py-0.5 text-[11px] font-black text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Xoá bỏ ghi chú này"
                >
                  Xoá
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1 bg-black hover:bg-slate-800 active:bg-slate-900 text-white font-black text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1 cursor-pointer"
                title="Lưu ghi chú (Ctrl + Enter)"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Lưu</span>
              </button>
            </div>
          </div>
        </div>

        {/* 
          Đuôi nhọn pixel speech bubble (Tail pointing to the card)
          Dùng SVG tam giác đồng màu trắng viền đen 3px chuẩn mẫu ảnh
        */}
        {placeAbove ? (
          // Đuôi chỉ xuống dưới
          <svg
            className="absolute -bottom-[11px] w-5 h-3 overflow-visible pointer-events-none"
            style={{ left: `${tailLeft}px` }}
            viewBox="0 0 20 12"
            fill="none"
          >
            {/* Lớp nền trắng kết nối liền mạch với đáy hộp thoại */}
            <polygon points="1,0 19,0 10,11" fill="#ffffff" />
            {/* Viền đen 3px cạnh trái */}
            <line x1="0" y1="0" x2="10" y2="12" stroke="#000000" strokeWidth="3" strokeLinecap="square" />
            {/* Viền đen 3px cạnh phải */}
            <line x1="20" y1="0" x2="10" y2="12" stroke="#000000" strokeWidth="3" strokeLinecap="square" />
            {/* Xoá cạnh đáy hộp thoại tại vị trí đuôi để ruột trắng thông suốt */}
            <line x1="2" y1="0" x2="18" y2="0" stroke="#ffffff" strokeWidth="4" />
          </svg>
        ) : (
          // Đuôi chỉ lên trên
          <svg
            className="absolute -top-[11px] w-5 h-3 overflow-visible pointer-events-none"
            style={{ left: `${tailLeft}px` }}
            viewBox="0 0 20 12"
            fill="none"
          >
            {/* Lớp nền trắng kết nối liền mạch với đỉnh hộp thoại */}
            <polygon points="1,12 19,12 10,1" fill="#ffffff" />
            {/* Viền đen 3px cạnh trái */}
            <line x1="0" y1="12" x2="10" y2="0" stroke="#000000" strokeWidth="3" strokeLinecap="square" />
            {/* Viền đen 3px cạnh phải */}
            <line x1="20" y1="12" x2="10" y2="0" stroke="#000000" strokeWidth="3" strokeLinecap="square" />
            {/* Xoá cạnh đỉnh hộp thoại tại vị trí đuôi để ruột trắng thông suốt */}
            <line x1="2" y1="12" x2="18" y2="12" stroke="#ffffff" strokeWidth="4" />
          </svg>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
