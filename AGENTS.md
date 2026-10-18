# Mandatory Web Security Rules for OAuth2, Gmail & Discord Logins

Khi xây dựng, phát triển, tối ưu hóa hoặc kiểm thử bất kỳ ứng dụng web nào có tính năng Đăng nhập bên thứ 3 (Discord OAuth2, Google/Gmail, GitHub) hoặc kết nối cơ sở dữ liệu Cloud (Firebase Firestore, Supabase, IndexedDB):

1. **Nguyên tắc Strict Early-Return Rendering (Tuyệt đối không dùng Modal che giao diện):**
   - Tuyệt đối KHÔNG render bảng dữ liệu, danh sách nhân sự hay giao diện nội dung bên dưới một modal overlay `fixed inset-0`.
   - BẮT BUỘC áp dụng cơ chế **Strict Early Return**: Nếu người dùng chưa xác thực thành công (`!user`), component gốc CHỈ trả về Cổng Đăng Nhập. Tuyệt đối không mount bất kỳ component con hay dữ liệu nghiệp vụ nào vào cây DOM.

2. **Nguyên tắc Bảo vệ Phiên WebAssembly (WebAssembly Cryptographic Session Envelope):**
   - Tuyệt đối KHÔNG lưu trữ phiên người dùng dưới dạng JSON thuần trong `localStorage`.
   - Mọi phiên đăng nhập phải được đóng gói qua **WebAssembly In-Memory Encryption** (`security.wasm` / `wasmSecurity.ts`), giải mã tạm thời trong bộ nhớ tuyến tính cô lập (Linear Memory), và ký toàn vẹn bằng **SHA-256 HMAC**.
   - Bất kỳ can thiệp nào từ Console DevTools làm sai lệch chữ ký hoặc cấu trúc dữ liệu phải kích hoạt việc tự động xóa sạch phiên và khóa cổng ngay lập tức.

3. **Nguyên tắc Triệt tiêu "Cửa sau" Tương thích ngược (Zero Legacy Storage Fallbacks):**
   - Tuyệt đối KHÔNG giữ lại code fallback đọc các key plain-text cũ (`localStorage.getItem('legacy_user')`).
   - Luôn chủ động xóa sạch các key giả mạo khi nạp ứng dụng và tích hợp listener `window.addEventListener('storage')` để chống inject lệnh qua DevTools Console.

4. **Nguyên tắc Xác thực Trực tiếp Token với Nhà cung cấp OAuth (Live Token Verification):**
   - Khi khôi phục phiên làm việc, luôn gửi Bearer token lên API chính thức của nhà cung cấp (`https://discord.com/api/users/@me` hoặc `https://www.googleapis.com/oauth2/v3/userinfo`).
   - Nếu API trả về `401 Unauthorized` hoặc ID không khớp với token, lập tức hủy bỏ phiên.

5. **Nguyên tắc Đóng băng Kết nối Mạng khi Chưa Xác Thực (Network Request Freezing):**
   - Tuyệt đối KHÔNG khởi tạo các listener thời gian thực (`onSnapshot`), kéo dữ liệu ban đầu (`pullFromCloud`), hay gọi `initAuth` / `accounts:lookup` khi người dùng đang ở cổng đăng nhập.
   - Tab Network tại Cổng Đăng Nhập bắt buộc phải sạch bóng, không tải trước bất kỳ dữ liệu nghiệp vụ nào về máy khách.

6. **Nguyên tắc Quản trị API Key và Bảo mật Máy chủ (Security Rules Primacy):**
   - `apiKey` của Firebase Web là mã định danh dự án công khai (Public by Design). An toàn thực sự của dữ liệu bắt buộc phải được bảo vệ bởi **Backend Security Rules** (`firestore.rules` với chính sách Default Deny).
