import React from 'react';
import { createPortal } from 'react-dom';
import { Cloud, Coffee, X, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface PublicRoomNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCloudModal: () => void;
  onOpenDonateModal: () => void;
}

export const PublicRoomNoticeModal: React.FC<PublicRoomNoticeModalProps> = ({
  isOpen,
  onClose,
  onOpenCloudModal,
  onOpenDonateModal,
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101725] border border-amber-500/40 rounded-2xl w-full max-w-[500px] shadow-2xl flex flex-col relative overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-sky-400 to-amber-500" />

        {/* Top Header */}
        <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Thông Báo Mã Phòng Public
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  nth_guild
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hướng dẫn tạo & lưu trữ database riêng trên Cloud
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm overflow-y-auto max-h-[75vh]">
          {/* Main Notice Box */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/40 text-amber-200/95 leading-relaxed space-y-2 shadow-inner">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Lưu ý quan trọng</span>
            </div>
            <p className="text-xs sm:text-[13px] font-medium leading-relaxed text-amber-100">
              Đây là mã phòng public và sẽ tự reset dữ liệu. Hãy click vào button{' '}
              <strong className="text-sky-300 underline font-bold">Đám mây</strong> sau đó hãy đổi tên{' '}
              <code className="px-1.5 py-0.5 bg-black/40 text-amber-300 rounded font-mono text-xs">nth_guild</code>{' '}
              thành tên mà bạn muốn sau đó ấn <strong className="text-amber-300 font-bold">Đổi mã</strong> và ấn{' '}
              <strong className="text-emerald-300 font-bold">Lưu lên cloud ngay</strong> để tạo một database riêng.
            </p>
            <p className="text-xs sm:text-[13px] font-medium leading-relaxed text-amber-100/90 pt-1 border-t border-amber-500/20">
              Những lần sau chỉ cần sử dụng mã đã tạo ấn <strong className="text-amber-300">đổi mã</strong> và{' '}
              <strong className="text-sky-300">Nạp từ cloud về máy</strong> để đồng bộ dữ liệu đã chỉnh sửa nhé!
            </p>
            <p className="text-xs sm:text-[13px] font-medium leading-relaxed text-amber-200/90 pt-1">
              Nếu thấy bổ ích hãy ấn vào button <strong className="text-amber-400">Cà phê</strong> và donate để mình có thể phát triển thêm tính năng mới nha.
            </p>
          </div>

          {/* Quick Steps Guide */}
          <div className="space-y-2 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Các bước thao tác nhanh:
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="w-5 h-5 rounded-lg bg-sky-500/20 text-sky-400 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="text-slate-300">
                  Mở <strong>Đám mây</strong> &rarr; Nhập tên mã phòng riêng (VD: <code className="text-sky-300 font-mono">bang_cua_ban</code>)
                </span>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="text-slate-300">
                  Ấn <strong>Đổi mã</strong> &rarr; Ấn <strong>Lưu lên Cloud ngay</strong> để khởi tạo database
                </span>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="text-slate-300">
                  Lần sau mở máy: Nhập mã phòng &rarr; <strong>Đổi mã</strong> &rarr; <strong>Nạp từ Cloud về máy</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 pt-3 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDonateModal();
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Coffee className="w-4 h-4 text-amber-400" />
              <span>Ủng hộ Cà phê</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCloudModal();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-sky-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Cloud className="w-4 h-4" />
            <span>Mở Đám Mây Đổi Mã Ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
