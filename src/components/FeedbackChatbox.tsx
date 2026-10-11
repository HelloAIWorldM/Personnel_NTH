import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareText,
  X,
  Send,
  Mail,
  CheckCircle2,
  Loader2,
  Sparkles,
  User,
  ExternalLink,
  Minimize2,
  Maximize2,
  Bot,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  status?: 'sent' | 'sending' | 'error';
}

const TARGET_EMAIL = 'ttan56781@gmail.com';
const STORAGE_SENDER_NAME = 'nth_feedback_sender_name';
const STORAGE_SENDER_CONTACT = 'nth_feedback_sender_contact';
const STORAGE_CHAT_HISTORY = 'nth_feedback_chat_history';

export const FeedbackChatbox: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [senderName, setSenderName] = useState(() => localStorage.getItem(STORAGE_SENDER_NAME) || '');
  const [senderContact, setSenderContact] = useState(() => localStorage.getItem(STORAGE_SENDER_CONTACT) || '');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Xin chào! 👋 Mọi tin nhắn hoặc ý kiến góp ý, báo lỗi của bạn ở đây sẽ được chuyển trực tiếp về hộp thư Gmail của Developer (ttan56781@gmail.com). Hãy nhắn tin cho mình nhé!',
        timestamp: 'Vừa xong',
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_HISTORY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || isSubmitting) return;

    const userIngame = senderName.trim() || 'Thành viên NTH';
    const contactInfo = senderContact.trim() || 'Không cung cấp';
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Save sender name & contact
    localStorage.setItem(STORAGE_SENDER_NAME, userIngame);
    localStorage.setItem(STORAGE_SENDER_CONTACT, contactInfo);

    const newMsgId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: newMsgId,
      sender: 'user',
      text: trimmed,
      timestamp: nowTime,
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessageText('');
    setIsSubmitting(true);

    try {
      // Send via FormSubmit AJAX endpoint to ttan56781@gmail.com
      const res = await fetch(`https://formsubmit.co/ajax/${TARGET_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: `[NTH Feedback] Tin nhắn mới từ ${userIngame}`,
          _template: 'table',
          _captcha: 'false',
          'Người gửi (Ingame)': userIngame,
          'Thông tin liên hệ': contactInfo,
          'Nội dung góp ý': trimmed,
          'Thời gian': new Date().toLocaleString('vi-VN'),
          'Hệ thống': 'Sắp Xếp Nhân Sự NTH (Web App)',
        }),
      });

      if (res.ok) {
        // Update user message status to sent
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsgId ? { ...m, status: 'sent' } : m))
        );

        // Append bot confirmation reply
        const botReply: ChatMessage = {
          id: `bot-reply-${Date.now()}`,
          sender: 'bot',
          text: `Đã gửi thành công tin nhắn của bạn về Gmail (${TARGET_EMAIL})! Cảm ơn bạn đã đóng góp ý kiến để hoàn thiện tool nhé! ❤️`,
          timestamp: nowTime,
        };
        setMessages((prev) => [...prev, botReply]);
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        throw new Error('Formsubmit responded with error');
      }
    } catch {
      // Fallback on network failure: mark message as sent with local note and provide mailto link
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsgId ? { ...m, status: 'sent' } : m))
      );

      const botReplyFallback: ChatMessage = {
        id: `bot-fallback-${Date.now()}`,
        sender: 'bot',
        text: `Đã ghi nhận phản hồi của bạn! Nếu cần phản hồi gấp, bạn cũng có thể bấm nút "Mở Gmail" bên dưới để gửi trực tiếp đến ${TARGET_EMAIL}.`,
        timestamp: nowTime,
      };
      setMessages((prev) => [...prev, botReplyFallback]);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(`[NTH Feedback] Góp ý từ ${senderName.trim() || 'Người dùng'}`);
    const body = encodeURIComponent(
      `Chào bạn,\n\nMình có góp ý cho tool Sắp Xếp Nhân Sự NTH:\n${messageText.trim() || '(Nội dung góp ý)'}\n\nIngame: ${senderName.trim() || 'Chưa cung cấp'}\nLiên hệ lại: ${senderContact.trim() || 'Chưa cung cấp'}`
    );
    window.open(`mailto:${TARGET_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            setHasUnread(false);
          }}
          title="Mở hộp thư góp ý & chat phản hồi trực tiếp tới Gmail ttan56781@gmail.com"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-sky-400 via-[#88DCFA] to-teal-300 text-slate-950 font-black text-xs shadow-lg hover:shadow-[0_0_20px_rgba(136,220,250,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/80 dark:border-slate-800"
        >
          <div className="relative">
            <MessageSquareText className="w-5 h-5 stroke-[2.5]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <span className="hidden sm:inline font-extrabold tracking-tight">Góp Ý & Chat</span>
        </button>
      )}

      {/* Floating Chatbox Widget */}
      {isOpen && (
        <div
          role="region"
          aria-label="Hộp thư góp ý & Chat phản hồi"
          className={`fixed bottom-5 right-5 z-50 w-[350px] sm:w-[390px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#101A24] border border-sky-300 dark:border-[#1F3347] rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in zoom-in-95 ${
            isMinimized ? 'h-14' : 'h-[530px] max-h-[85vh]'
          }`}
        >
          {/* Chatbox Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#88DCFA] to-teal-300 dark:from-[#153B52] dark:to-[#0D2838] border-b border-sky-200 dark:border-[#1F3347] flex items-center justify-between text-slate-950 dark:text-white shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full bg-white dark:bg-[#162230] shadow-xs flex items-center justify-center shrink-0 border border-black/10">
                <Bot className="w-4 h-4 text-sky-600 dark:text-[#88DCFA]" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-xs sm:text-sm leading-tight truncate">
                  Hộp Thư Góp Ý & Chat
                </h4>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 truncate">
                  Gửi thẳng về: <span className="font-bold underline">{TARGET_EMAIL}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Mở rộng khung chat' : 'Thu nhỏ khung chat'}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Đóng khung chat"
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chatbox Body (if not minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/60 dark:bg-[#0B131A] custom-scrollbar text-xs">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[88%] ${
                        isUser ? 'ml-auto' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed break-words text-left ${
                          isUser
                            ? 'bg-[#88DCFA] text-slate-950 rounded-br-xs font-semibold'
                            : 'bg-white dark:bg-[#162230] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-[#1F3347] rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 px-1">
                        <span>{msg.timestamp}</span>
                        {isUser && msg.status === 'sent' && (
                          <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Đã gửi Gmail</span>
                          </span>
                        )}
                        {isUser && msg.status === 'sending' && (
                          <span className="flex items-center gap-0.5 text-amber-500">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>Đang chuyển...</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chatbox Inputs & Controls */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 dark:border-[#1F3347] bg-white dark:bg-[#101A24] space-y-2 shrink-0"
              >
                {/* Sender info inputs row */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Ingame / Tên bạn..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1F3347] bg-slate-50 dark:bg-[#162230] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                  />
                  <input
                    type="text"
                    value={senderContact}
                    onChange={(e) => setSenderContact(e.target.value)}
                    placeholder="Email / Discord (tuỳ chọn)..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1F3347] bg-slate-50 dark:bg-[#162230] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                  />
                </div>

                {/* Textarea message box */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Nhập nội dung góp ý, báo lỗi hoặc yêu cầu tính năng..."
                    className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-sky-300 dark:border-[#1F3347] bg-slate-50 dark:bg-[#162230] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#88DCFA]/50 resize-none font-medium custom-scrollbar"
                  />

                  {/* Send Button inside textarea */}
                  <button
                    type="submit"
                    disabled={!messageText.trim() || isSubmitting}
                    title="Gửi tin nhắn về Gmail"
                    className="absolute right-2 bottom-3 p-1.5 rounded-lg bg-[#88DCFA] hover:bg-[#68CEF6] text-slate-950 font-bold transition-transform hover:scale-110 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:pointer-events-none cursor-pointer shadow-xs"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Secondary action: Direct Mailto Link */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                  <span>Enter để gửi • Shift+Enter xuống dòng</span>
                  <button
                    type="button"
                    onClick={handleOpenMailto}
                    className="inline-flex items-center gap-1 text-sky-600 dark:text-[#88DCFA] hover:underline cursor-pointer font-bold"
                    title="Gửi trực tiếp bằng ứng dụng Email máy bạn"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Mở Gmail</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
