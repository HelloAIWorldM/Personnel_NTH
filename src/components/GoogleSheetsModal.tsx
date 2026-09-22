import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout, getAccessToken } from '../services/auth';
import { createRaidSpreadsheet, readSpreadsheetRaid } from '../services/sheets';
import { CustomClassColors, RaidMember } from '../types';
import {
  FileSpreadsheet,
  ExternalLink,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  LogOut,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
  raidTitle: string;
  members: RaidMember[];
  customColors?: CustomClassColors;
  onImportSuccess: (imported: { title?: string; members: RaidMember[] }) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  raidTitle,
  members,
  customColors,
  onImportSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successSheetUrl, setSuccessSheetUrl] = useState<string | null>(null);
  const [sheetInputUrl, setSheetInputUrl] = useState('');

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onUserChanged(res.user);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Đăng nhập Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onUserChanged(null);
      setSuccessSheetUrl(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleExportToNewSheet = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessSheetUrl(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        // Re-request sign in if token in memory was lost
        const signRes = await googleSignIn();
        token = signRes?.accessToken || null;
      }
      if (!token) {
        throw new Error('Vui lòng đăng nhập Google trước khi xuất file.');
      }

      const res = await createRaidSpreadsheet(token, raidTitle, members, customColors);
      setSuccessSheetUrl(res.spreadsheetUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể xuất sang Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromSheet = async () => {
    if (!sheetInputUrl.trim()) {
      setErrorMsg('Vui lòng nhập đường link Google Sheet hoặc ID');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const signRes = await googleSignIn();
        token = signRes?.accessToken || null;
      }
      if (!token) {
        throw new Error('Vui lòng đăng nhập Google.');
      }

      // Extract sheet ID from URL or raw ID
      let id = sheetInputUrl.trim();
      const match = sheetInputUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        id = match[1];
      }

      const res = await readSpreadsheetRaid(token, id);
      onImportSuccess(res);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể đọc dữ liệu từ Google Sheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="google-sheets-modal-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
    >
      <div
        id="google-sheets-modal-card"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              Đồng bộ với Google Sheets
            </h3>
            <p className="text-xs text-slate-500">
              Xuất bảng sắp xếp nhân sự Raid trực tiếp lên tài khoản Google Drive của bạn
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success notification */}
        {successSheetUrl && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Đã tạo Google Sheet thành công!</span>
            </div>
            <p className="text-xs text-emerald-700 mb-2.5">
              Bảng tính đã được format đầy đủ màu sắc từng môn phái và đường viền chuẩn.
            </p>
            <a
              href={successSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              <span>Mở Google Sheet ngay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Auth Section */}
        {!currentUser ? (
          <div className="py-4 text-center border-y border-slate-100 my-4">
            <p className="text-xs text-slate-600 mb-3">
              Đăng nhập tài khoản Google để bắt đầu tạo hoặc đồng bộ bảng tính:
            </p>

            {/* Official Google Sign-in Button layout */}
            <div className="flex justify-center">
              <button
                type="button"
                id="btn-google-signin"
                onClick={handleSignIn}
                disabled={loading}
                className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all text-xs font-semibold text-slate-700 hover:border-slate-400 active:scale-98 disabled:opacity-50"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-4 h-4"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>{loading ? 'Đang kết nối...' : 'Sign in with Google'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User status card */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2.5">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {currentUser.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {currentUser.displayName || 'Tài khoản Google'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>

            {/* Action 1: Export New Sheet */}
            <div className="p-3.5 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 mb-0.5">
                    Tạo bảng tính mới trên Google Drive
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tạo file mới với tiêu đề "{raidTitle}" và {members.length} vị trí
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-export-new-sheet"
                  onClick={handleExportToNewSheet}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50 min-h-[42px]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>Xuất file</span>
                </button>
              </div>
            </div>

            {/* Action 2: Import from existing Google Sheet */}
            <div className="p-3.5 border border-slate-200 rounded-xl bg-white">
              <div className="text-xs font-bold text-slate-900 mb-1">
                Nhập danh sách từ Google Sheet có sẵn
              </div>
              <div className="text-[11px] text-slate-500 mb-2">
                Dán đường link (URL) hoặc ID của file Google Sheet:
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={sheetInputUrl}
                  onChange={(e) => setSheetInputUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[42px]"
                />
                <button
                  type="button"
                  id="btn-import-sheet"
                  onClick={handleImportFromSheet}
                  disabled={loading || !sheetInputUrl.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 min-h-[42px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Nhập</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[38px]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
