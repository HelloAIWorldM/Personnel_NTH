# Bảng Sắp Xếp Nhân Sự Raid (Raid Roster & Party Organizer)

Ứng dụng web trực quan hỗ trợ trưởng nhóm (Raid Leader), bang chủ và các thành viên dễ dàng lập danh sách, phân chia đội hình đi Raid (12 người hoặc tuỳ biến), cân bằng các vai trò Tank / Healer / DPS, tùy chỉnh màu sắc 11 môn phái, đồng bộ Google Sheets, và xuất ảnh / file Excel có khung viền và màu sắc chuẩn ảnh gốc.

---

## 🌟 Tính Năng Nổi Bật

### 1. 📋 Bảng Nhân Sự Chuẩn Ảnh Mẫu
- **Giao diện chuẩn bản gốc**: Bố cục bảng với khung viền đen sắc nét, gồm 4 cột chính: **STT**, **Ingame**, **Class (Môn phái)**, và **Logged by**.
- **Chỉnh sửa tiêu đề linh hoạt**:
  - Tên Raid (VD: `RAID 1`)
  - Thời gian hẹn Raid nổi bật với tông đỏ (VD: `MON 20:30`)
  - Tên Boss / Ải (VD: `NIÊN DU`)
- **Thao tác nhanh**:
  - Chạm hoặc click vào ô môn phái để đổi phái ngay lập tức.
  - Nút bấm nhanh `= Ingame` để tự động điền người log acc là chính chủ.
  - Nút **"Điền nhanh Logged by"** cho toàn bộ thành viên còn trống.
  - Tính năng **"Hiện chia PT"**: Hiển thị đường ngăn cách từng nhóm ngay trên bảng chính cùng thống kê vai trò (Tank/Heal/DPS).

### 2. 🛡️ Phân Chia & Quản Lý Nhóm PT (Party Manager)
- **Kéo thả trực quan**: Di chuyển người chơi giữa các nhóm PT 1, PT 2,... hoặc sắp xếp lại vị trí trong từng nhóm.
- **Chia đều tự động 2 PT**: Tự động phân chia 12 người thành 2 nhóm 6/6 chỉ với 1 cú click.
- **Cân bằng vai trò (Role Balance)**: Tự động phân bổ đều Tank và Healer giữa các nhóm PT để đảm bảo khả năng sống sót của đội hình.
- **Cảnh báo thiếu nhân sự**: Hiển thị huy hiệu cảnh báo khi nhóm thiếu Healer hoặc Tank.
- **Tùy biến số lượng PT**: Thêm mới, đổi tên nhóm hoặc xoá bớt nhóm dễ dàng.

### 3. ⚔️ Đầy Đủ 11 Môn Phái & Vai Trò
Hệ thống tích hợp đầy đủ 11 môn phái với màu sắc nhận diện đặc trưng và phân loại vai trò rõ ràng:
- **Tank (Đỡ đòn)**: Thiết Y, Thương Lan
- **Healer (Hồi máu)**: Tố Vấn
- **DPS (Sát thương)**: Toái Mộng, Huyết Hà, Thần Tương, Cửu Linh, Long Ngâm, Thiên Vấn, Triều Quang, Huyền Cơ

Thanh thống kê đầu bảng hiển thị tức thì số lượng từng phái và vai trò trong đội hình, hỗ trợ lọc danh sách theo môn phái mong muốn.

### 4. 🎨 Tùy Chỉnh Màu Sắc Môn Phái (Color Customizer)
- Tự do thay đổi mã màu nền (Background Color) cho bất kỳ môn phái nào thông qua bộ chọn màu (Native Color Picker) hoặc mã Hex.
- Cung cấp sẵn các bộ màu mẫu (Presets):
  - **Mặc định**: Chuẩn theo phong cách hình ảnh gốc.
  - **Pastel dịu mắt**: Tông phấn thanh lịch, êm dịu khi nhìn lâu.
  - **Neon nổi bật**: Độ tương phản cao, hiện đại.
- Màu sắc tùy chỉnh được lưu tự động trên trình duyệt và áp dụng đồng bộ cho cả bảng hiển thị, ảnh chụp xuất ra và file Excel.

### 5. 📤 Xuất File & Chia Sẻ Đa Dạng
- **Chụp & Sao chép ảnh (Copy Image)**:
  - Sử dụng thư viện `html2canvas` để chụp lại bảng với độ phân giải cao và khung viền sắc nét.
  - Hỗ trợ copy thẳng vào clipboard để dán (Ctrl + V) ngay vào Discord, Zalo, Messenger, Facebook.
  - Hỗ trợ mở ảnh ở tab mới hoặc chạm giữ để lưu ảnh trên điện thoại.
- **Tải bảng tính Excel (.xls)**:
  - Xuất bảng tính có đầy đủ khung viền đen và màu highlight từng môn phái chuẩn như ảnh gốc.
- **Tải file .CSV**:
  - Dữ liệu dạng bảng thuần túy tương thích với mọi phần mềm bảng tính.
- **Sao chép dạng văn bản (Text Format)**:
  - Xuất văn bản có định dạng STT, Ingame, Phái, Logged by, Nhóm PT để dán nhanh vào khung chat trong game hoặc kênh thông báo.

### 6. 📊 Đồng Bộ Google Sheets
- Đăng nhập an toàn với tài khoản Google.
- Tạo file Google Sheet mới trực tiếp trên Google Drive của bạn kèm tiêu đề và danh sách 12 vị trí.
- Nhập danh sách từ link Google Sheet có sẵn để tái sử dụng dữ liệu thành viên nhanh chóng.

### 7. 📱 Tối Ưu Hóa Trải Nghiệm Mobile (Mobile-First Polish)
- Tự động co giãn theo kích thước màn hình điện thoại (Responsive Design).
- **Mobile Action Sheet**: Chạm vào số STT để mở khay điều khiển (Di chuyển lên/xuống, đổi nhóm, đổi phái, xoá hàng).
- **Bộ điều khiển chạm**: Nút mũi tên (▲ / ▼) và menu chuyển nhóm trực tiếp trên từng thẻ người chơi ở tab Phân nhóm PT, không cần phụ thuộc vào thao tác kéo thả trên cảm ứng.
- **Class Picker Bottom Sheet**: Khay chọn môn phái trượt lên từ đáy màn hình, thuận tiện thao tác bằng một tay.

### 8. 🌙 Chế Độ Tối Toàn Diện (Dark Mode)
- **Bảo vệ mắt khi Raid đêm**: Chuyển đổi linh hoạt giữa giao diện Sáng (Light) và Tối (Dark) chỉ với 1 cú chạm vào biểu tượng Mặt Trời / Mặt Trăng trên thanh điều hướng.
- **Tương thích toàn bộ hệ thống**: Dark Mode áp dụng đồng bộ từ thanh tiêu đề, bảng thống kê môn phái, tab phân nhóm PT cho đến toàn bộ các cửa sổ Modal (Xuất ảnh/Excel, Tùy chỉnh màu phái, Google Sheets).
- **Tùy chọn nền bảng Raid độc lập**: Hỗ trợ chuyển riêng bảng Raid sang phong cách nền tối sang trọng hoặc giữ nền trắng nguyên bản khi xuất ảnh chụp chia sẻ.
- **Tự động ghi nhớ**: Lưu trạng thái giao diện đã chọn vào `localStorage` và tự động phát hiện thiết lập giao diện hệ thống của người dùng.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Image Generation / Canvas**: [html2canvas](https://html2canvas.hertzen.com/)
- **Authentication**: [Firebase Auth](https://firebase.google.com/) (Google Sign-In)
- **Local Persistence**: Trình duyệt `localStorage` giúp lưu tức thời thay đổi mà không sợ mất dữ liệu khi F5.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) phiên bản 18 trở lên
- npm hoặc yarn/bun

### Các bước khởi chạy

1. **Cài đặt thư viện phụ thuộc**:
   ```bash
   npm install
   ```

2. **Chạy máy chủ phát triển (Development Server)**:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000`

3. **Kiểm tra lỗi kiểu dữ liệu & lint**:
   ```bash
   npm run lint
   ```

4. **Đóng gói dự án (Production Build)**:
   ```bash
   npm run build
   ```

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```text
├── index.html                   # HTML entry point với viewport và Be Vietnam Pro font
├── metadata.json                # Thông tin cấu hình ứng dụng trên AI Studio
├── package.json                 # Khai báo dependencies và scripts thực thi
├── tsconfig.json                # Cấu hình TypeScript
├── vite.config.ts               # Cấu hình Vite & Tailwind CSS
├── public/                      # Tài nguyên tĩnh
└── src/
    ├── main.tsx                 # Điểm khởi tạo ứng dụng React
    ├── App.tsx                  # Component trung tâm điều phối trạng thái (Members, Parties, Colors)
    ├── index.css                # CSS toàn cục (@import "tailwindcss")
    ├── types.ts                 # Định nghĩa TypeScript interfaces (RaidMember, RaidClass, RaidParty,...)
    ├── constants/
    │   └── classes.ts           # Dữ liệu 11 môn phái, vai trò, bảng màu mặc định và đội hình mẫu
    ├── components/
    │   ├── RaidTable.tsx        # Bảng hiển thị nhân sự chuẩn ảnh mẫu, kéo thả hàng, menu mobile
    │   ├── PartyManager.tsx     # Bảng phân nhóm PT, kéo thả người chơi, chia đều 6/6, cân bằng Tank/Heal
    │   ├── ClassStatsBar.tsx    # Thanh đếm tổng quan đội hình, thống kê Tank/Heal/DPS và lọc theo phái
    │   ├── ExportModal.tsx      # Modal sao chép ảnh vào clipboard, tải Excel có màu, tải CSV, copy text
    │   ├── ColorCustomizerModal.tsx # Modal tùy biến màu sắc từng phái và chọn preset nhanh
    │   └── GoogleSheetsModal.tsx    # Modal đăng nhập Google, xuất sheet mới và nhập sheet có sẵn
    └── services/
        ├── firebase.ts          # Khởi tạo kết nối Firebase
        ├── auth.ts              # Xử lý đăng nhập / đăng xuất Google Popup
        └── googleSheets.ts      # Gọi Google Sheets API (Export & Import)
```

---

## 📝 Giấy Phép & Bản Quyền
Phát triển dành cho cộng đồng game thủ nhằm tối ưu hóa thời gian chuẩn bị và quản lý nhân sự cho các hoạt động Raid bang hội.
