# Design System: NTH Personnel (Hệ Thống Sắp Xếp Nhân Sự Nghịch Thủy Hàn)

## 1. Visual Theme & Atmosphere
- **Concept:** Cockpit Dense & Utilitarian Minimalist (Giao diện bảng điều khiển tác chiến tinh gọn, hiệu suất cao).
- **Density:** Cockpit Dense (8/10) — Tối ưu cho người chỉ huy (Raid Leader / Bang chủ) quan sát 12 đến 30 nhân sự cùng lúc trên một màn hình mà không cần cuộn quá nhiều.
- **Variance:** Offset Structured (5/10) — Bố cục lưới chặt chẽ, chia rõ ràng giữa Bảng sắp xếp trung tâm và Kho nhân sự bên cạnh.
- **Motion:** Restrained & Fluid (4/10) — Chuyển động nhẹ nhàng 150ms–200ms bằng CSS transitions/transforms (GPU-accelerated), không sử dụng hiệu ứng nảy quá đà hay hoạt ảnh làm chậm thao tác kéo thả.
- **Atmosphere:** Nghiêm túc, thanh lịch, tin cậy — cảm giác như một phần mềm quản trị chuyên nghiệp (Bloomberg Terminal / Notion Dashboard) kết hợp phong cách game kiếm hiệp hiện đại, tuyệt đối **không màu mè, không hiệu ứng neon chói lóa**.

---

## 2. Color Palette & Roles

### 2.1. Nền trung tính (Neutral Canvas & Surfaces)
- **Canvas Light** (`#F8FAFC` - Slate 50) — Nền chính chế độ sáng, dịu mắt, không lóa.
- **Surface Light** (`#FFFFFF` - Pure White) — Bề mặt bảng và thẻ nhân sự, tạo độ tương phản rõ rệt với nền.
- **Canvas Dark** (`#0B1219` - Deep Slate Charcoal) — Nền chính chế độ tối, hạn chế mỏi mắt khi raid đêm. **Tuyệt đối không dùng đen tuyền (`#000000`)**.
- **Surface Dark** (`#131F2B` - Slate Dark Surface) — Bề mặt các card, bảng, modal trong Dark Mode.
- **Subtle Border** (`#E2E8F0` / `#1E2E3E`) — Đường viền mảnh 1px định hình không gian, không dùng viền dày.

### 2.2. Màu chữ & Phân cấp thị giác (Typography Colors)
- **Primary Ink** (`#0F172A` / `#F1F5F9`) — Tiêu đề, tên ingame, thông tin quan trọng bậc nhất.
- **Secondary Muted** (`#64748B` / `#94A3B8`) — Nhãn phụ, logged by, thời gian, chú thích.
- **Tertiary Whisper** (`#94A3B8` / `#475569`) — Placeholder, số thứ tự mờ, icon phụ.

### 2.3. Màu chức năng & Điểm nhấn (Single Functional Accent)
- **Accent Primary** (`#0284C7` / `#38BDF8` - Calm Sky) — Dùng duy nhất cho các nút tương tác chính, tab active, trạng thái "Đã xếp". Độ bão hòa dưới 75%, không dùng hiệu ứng phát sáng Neon Glow.
- **Success State** (`#059669` / `#34D399`) — Đánh dấu có mặt, đồng bộ cloud thành công.
- **Destructive State** (`#DC2626` / `#F87171`) — Bỏ xếp, xóa bảng, xóa nhân sự.

### 2.4. Bảng màu 10 Môn phái chuẩn hóa (Class Palette - WCAG AA Contrast)
Mỗi môn phái sử dụng cặp màu (Background + Text) đạt chuẩn tương phản đọc tốt trên cả Light & Dark:
- **Toái Mộng:** Nền xanh băng (`#E0F2FE` / `#0C2E46`), chữ xanh đậm (`#0369A1` / `#7DD3FC`).
- **Thần Tướng:** Nền xanh dương hoàng gia (`#DBEAFE` / `#172554`), chữ (`#1D4ED8` / `#93C5FD`).
- **Thiết Y:** Nền hổ phách kim loại (`#FEF3C7` / `#451A03`), chữ (`#B45309` / `#FCD34D`).
- **Huyết Hà:** Nền đỏ thẫm trầm (`#FEE2E2` / `#450A0A`), chữ (`#B91C1C` / `#FCA5A5`).
- **Cửu Linh:** Nền tím hoàng gia (`#F3E8FF` / `#3B0764`), chữ (`#7E22CE` / `#D8B4FE`).
- **Tố Vấn:** Nền xanh ngọc bích (`#D1FAE5` / `#064E3B`), chữ (`#047857` / `#6EE7B7`).
- **Long Ngâm:** Nền lam ngọc biển (`#CCFBF1` / `#134E4A`), chữ (`#0F766E` / `#5EEAD4`).
- **Thiên Vấn:** Nền ngọc bích sáng (`#DCFCE7` / `#14532D`), chữ (`#15803D` / `#86EFAC`).
- **Huyền Cơ:** Nền xanh coban (`#E0E7FF` / `#1E1B4B`), chữ (`#4338CA` / `#A5B4FC`).
- **Triều Quang:** Nền hồng đào dịu (`#FCE7F3` / `#500724`), chữ (`#BE185D` / `#F472B6`).

---

## 3. Typography Architecture
- **Primary Body Font:** `Be Vietnam Pro`, `system-ui`, sans-serif — Hiển thị tiếng Việt hoàn hảo, dấu thanh rõ ràng, không bị lỗi font khi gõ tiếng Việt.
- **Display / Headers:** `Lexend`, `Be Vietnam Pro` — Trọng số chữ cân đối (`font-semibold` / `font-bold`), khoảng cách chữ thu hẹp nhẹ (`tracking-tight`).
- **Tabular / Monospace:** Cho số STT, giờ raid (20:30), slot P1/P2 và số lượng sĩ số (`tabular-nums font-mono`).
- **Quy tắc phân cấp:**
  - `H1` (Tên Bảng / Tiêu đề chính): 18px – 20px, font-black, không dùng size quá to gây chiếm diện tích.
  - `H2` / `Section Title`: 14px – 16px, font-bold, tracking-wide.
  - `Body / Ingame`: 13px – 14px, font-bold.
  - `Metadata / Logged by`: 11px – 12px, font-medium, màu phụ.

---

## 4. Component Stylings & Behaviors

### 4.1. Thẻ Nhân Sự (Personnel Cards)
- **Cấu trúc 3 tầng không đè lấn:**
  - **Tầng 1 (Cạnh trên):** Nút kéo Grip (trái) + Checkbox có mặt + Tên Ingame (trung tâm) $\leftrightarrow$ Badge Môn phái + Nút hành động "Xếp" / "Bỏ xếp" (phải).
  - **Tầng 2 (Trung gian):** Tag trạng thái raid (`✓ Raid 1, Raid Up 1`) và Ghi chú. Có `max-width` và `truncate` để không bao giờ tràn đè lên các nút khác.
  - **Tầng 3 (Dưới cùng):** Dòng Logged by (`Log: ...`).
- **Tương tác:** Hover nâng nhẹ 1px (`hover:shadow-xs`), khi kéo chuột giảm độ mờ (`opacity-40`), khi nhấp nút có phản hồi tức thì (`active:scale-95`).

### 4.2. Bảng Raid & Bảng Bang Chiến
- **Lưới ô:** Viền 1px tinh tế giữa các hàng (`border-slate-200 dark:border-slate-800`).
- **Phân chia Party P1 / P2:** Đường ranh giới rõ ràng, đánh dấu tag nhóm P1/P2 bằng màu sắc nhã nhặn.
- **Hàng trống (Empty Slot):** Màu chữ xám nhạt gợi ý "Ingame...", không dùng màu cảnh báo đỏ.

### 4.3. Nút bấm & Công cụ (Buttons & Controls)
- **Nút hành động chính (Primary CTA):** Nền Sky-500/Cerulean phẳng, chữ đậm, viền mờ 1px, không đổ bóng neon lòe loẹt.
- **Nút phụ (Secondary):** Nền trong suốt hoặc viền mảnh (`border border-slate-300 dark:border-slate-700`), hover làm sáng nhẹ bề mặt.
- **Nhóm nút lọc (Filter Pills):** Bo tròn góc `rounded-lg`, nền mờ nhẹ khi không chọn, nền trắng nổi khi đang kích hoạt.

---

## 5. Layout & SEO Semantic Structure
- **Cấu trúc ngữ nghĩa HTML5 chuẩn:**
  - `<header role="banner">` — Thanh điều hướng, đổi chế độ Raid/Bang chiến, Cloud sync, Theme switch.
  - `<main role="main">` — Khu vực làm việc chính chứa bảng và kho nhân sự.
  - `<section aria-labelledby="...">` — Từng bảng Raid độc lập có tiêu đề ngữ nghĩa.
  - `<aside aria-label="Kho nhân sự">` — Cột chứa kho nhân sự và công cụ lọc/kéo thả.
  - `<footer>` — Bản quyền, hướng dẫn phím tắt, link liên hệ / donate.

---

## 6. Anti-Patterns (Những điều cấm kỵ - Banned Clichés)
- ❌ **Cấm hiệu ứng phát sáng Neon / Outer Glow:** Không dùng bóng màu xanh/tím neon xung quanh button hay card.
- ❌ **Cấm nền đen tuyền (`#000000`):** Luôn dùng nền Charcoal (`#0B1219` đến `#121B24`) để chống nhức mắt.
- ❌ **Cấm hiệu ứng Gradient cầu vồng trên chữ lớn:** Giữ chữ màu đồng nhất để đọc nhanh.
- ❌ **Cấm các thành phần đè lấn vị trí (`z-index` tùy tiện):** Mọi badge, text, icon phải có không gian riêng biệt, không được tràn chữ lên nhau.
- ❌ **Cấm các animation dài dòng gây chậm trễ thao tác:** Chỉ dùng chuyển động tức thời <= 200ms cho phản hồi xúc giác.
