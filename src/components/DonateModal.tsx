import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, X, Coffee } from 'lucide-react';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const accountNumber = '0934766051';
  const accountName = 'TRUONG TAN PHAT';
  const bankName = 'MB Bank';

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy account number:', err);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#121620] border border-slate-700/60 rounded-2xl w-full max-w-[380px] p-5 shadow-2xl flex flex-col text-center relative overflow-hidden">
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <h3 className="text-base sm:text-lg font-black text-amber-400 tracking-wide flex items-center gap-1.5">
            <span>Ủng hộ tác giả</span>
            <Coffee className="w-5 h-5 text-amber-400 shrink-0" />
          </h3>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center">
          <div className="bg-white p-2.5 rounded-2xl shadow-xl border border-slate-200 inline-block max-w-[260px] w-full">
            <img
              src="/donate_qr.png"
              alt="Mã QR MB Bank TRUONG TAN PHAT 0934766051"
              className="w-full h-auto object-contain rounded-xl"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 font-medium">
            {bankName} · quét bằng app ngân hàng / MoMo
          </p>
        </div>

        {/* Account Info Box */}
        <div className="bg-[#1a2130] border border-slate-700/80 rounded-xl p-3 mt-4 flex items-center justify-between text-left">
          <div className="min-w-0 pr-2">
            <div className="text-[11px] font-black text-slate-300 tracking-wider uppercase">
              {accountName}
            </div>
            <div className="text-base font-black text-amber-400 tracking-widest mt-0.5 font-mono">
              {accountNumber}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyAccount}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã copy</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy số TK</span>
              </>
            )}
          </button>
        </div>

        {/* Thank You Note */}
        <p className="text-[11px] text-slate-300 leading-relaxed text-left mt-3 px-1">
          Tool này mình làm miễn phí cho anh/chị xếp raid và bang chiến. Nếu thấy hữu ích, mời mình ly cà phê để có động lực làm tiếp và duy trì nhé. Cảm ơn mọi người nhé!
        </p>

        {/* Footer Action Button */}
        <div className="mt-4 pt-2 border-t border-slate-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
