import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, CheckCircle2, AlertCircle, ExternalLink, HelpCircle, BellRing, Copy, Check } from 'lucide-react';
import {
  getStoredDiscordWebhookUrl,
  setStoredDiscordWebhookUrl,
  testDiscordWebhook,
} from '../services/discordNotifyService';

interface DiscordWebhookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const DiscordWebhookSettingsModal: React.FC<DiscordWebhookSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(() => getStoredDiscordWebhookUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({ success: false, msg: 'Vui lòng nhập link Discord Webhook trước khi kiểm tra.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const res = await testDiscordWebhook(webhookUrl.trim());
    setIsTesting(false);
    if (res.success) {
      setStoredDiscordWebhookUrl(webhookUrl.trim());
      setTestResult({
        success: true,
        msg: 'Gửi tin nhắn thử nghiệm thành công! Hãy vào kênh #notify_private để xem thông báo từ VLBot.',
      });
      onShowToast('Đã gửi thông báo thử nghiệm thành công!');
    } else {
      setTestResult({
        success: false,
        msg: res.error || 'Gửi thất bại. Hãy kiểm tra lại link Webhook.',
      });
    }
  };

  const handleSave = () => {
    setStoredDiscordWebhookUrl(webhookUrl.trim());
    onShowToast('Đã lưu cấu hình Webhook thông báo!');
    onClose();
  };

  const handleCopyClientId = () => {
    navigator.clipboard.writeText('1559521882431299594');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#5865F2] text-white flex items-center justify-center shadow-xs">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Cấu hình Thông báo VLBot</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20">
                      #notify_private
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Máy chủ Mun Kiu • Tự động gửi embed khi thành viên đăng nhập
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Webhook Input Field */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>URL Webhook kênh #notify_private</span>
                  <span className="text-[10px] text-slate-400 font-normal">Kênh riêng tư máy chủ Mun Kiu</span>
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#5865F2] font-mono text-[11px]"
                />
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <span className="text-[11px] leading-relaxed">{testResult.msg}</span>
                </div>
              )}

              {/* Instructions Guide */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>Cách lấy Webhook URL trong kênh #notify_private:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li>
                    Trong máy chủ <strong className="text-slate-800 dark:text-white">Mun Kiu</strong>, click chuột phải vào kênh <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-900 rounded font-semibold text-[#5865F2]">#notify_private</code> (hoặc bấm biểu tượng ⚙️).
                  </li>
                  <li>
                    Chọn <strong>Tích hợp (Integrations)</strong> → Chọn <strong>Webhooks</strong>.
                  </li>
                  <li>
                    Bấm <strong>Tạo Webhook (Create Webhook)</strong>, đặt tên là <strong className="text-emerald-600 dark:text-emerald-400">VLBot</strong>.
                  </li>
                  <li>
                    Bấm <strong>Sao chép URL Webhook (Copy Webhook URL)</strong> và dán vào ô bên trên.
                  </li>
                </ol>
              </div>

              {/* Application Details */}
              <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-950/60 rounded-xl text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Client ID ứng dụng:</span>
                  <code className="font-mono text-slate-800 dark:text-slate-200">1559521882431299594</code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyClientId}
                  className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 flex items-center gap-1 font-semibold transition-colors"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                disabled={isTesting}
                onClick={handleTest}
                className="px-3.5 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-[#5865F2]" />
                <span>{isTesting ? 'Đang gửi...' : 'Gửi thử nghiệm'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lưu cấu hình</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
};
