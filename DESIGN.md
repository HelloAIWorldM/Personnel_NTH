# Design System: Froggy Lily Pond - Cozy Nature Console (Hệ Thống Nhân Sự NTH)

> **Stitch MCP Synced**: Design System Asset `assets/15657927742429242934` attached to Project `6835306961882225293`.

---

## 1. Visual Theme & Atmosphere
- **Concept:** Froggy Lily Pond Cozy Nature Console (Bảng điều khiển tác chiến thư thái lấy cảm hứng từ đầm sen hoa súng và chú ếch xanh).
- **Logo & Mascot:** Chibi Frog cầm ô lá sen (`<FrogLogo />`), biểu tượng cho sự vui tươi, kiên định và tinh thần gắn kết của cộng đồng guild.
- **Density:** Cockpit Dense (8/10) — Tối ưu cho người chỉ huy (Raid Leader / Bang chủ) quan sát 12 đến 30 nhân sự cùng lúc trên một màn hình mà không cần cuộn quá nhiều.
- **Variance:** Offset Structured (5/10) — Bố cục lưới chặt chẽ, chia rõ ràng giữa Bảng sắp xếp trung tâm và Kho nhân sự bên cạnh.
- **Motion:** Restrained Floating Ripples (4/10) — Nền gợn sóng nước lăn tăn, lá sen và hoa súng trôi chậm êm dịu, tương tác thẻ bài nhẹ nhàng 150ms–200ms bằng GPU-accelerated CSS transforms.
- **Atmosphere:** Thư thái, tự nhiên, tin cậy — kết hợp giữa phần mềm quản trị chuyên nghiệp chuẩn SEO và gam màu sinh thái thiên nhiên trong lành, tuyệt đối **không màu mè chói gắt, không hiệu ứng neon lóa mắt**.

---

## 2. Color Palette & Roles

### 2.1. Nền trung tính (Neutral Canvas & Surfaces)
- **Canvas Light** (`#EBF7ED` - Meadow Lilypad Mist) — Nền chính chế độ sáng, sắc xanh dịu mát của sương mai trên lá sen.
- **Surface Light** (`#FFFFFF` - Pure White) — Bề mặt bảng và thẻ nhân sự, tạo độ tương phản trong trẻo.
- **Canvas Dark** (`#0B1812` - Enchanted Midnight Pond) — Nền chính chế độ tối, hạn chế mỏi mắt khi raid đêm. **Tuyệt đối không dùng đen tuyền (`#000000`)**.
- **Surface Dark** (`#12241B` / `#162B20` - Moss Dark Surface) — Bề mặt các card, bảng, modal trong Dark Mode.
- **Subtle Border** (`#D2ECD2` / `#1D3D2D`) — Đường viền mảnh 1px định hình không gian thanh lịch.

### 2.2. Màu chữ & Phân cấp thị giác (Typography Colors)
- **Primary Ink** (`#0F2318` / `#E8F5E9`) — Tiêu đề, tên ingame, thông tin quan trọng bậc nhất.
- **Secondary Muted** (`#4D6B58` / `#A6C5B1`) — Nhãn phụ, logged by, thời gian, chú thích.
- **Tertiary Whisper** (`#85A893` / `#537762`) — Placeholder, số thứ tự mờ, icon phụ.

### 2.3. Màu thương hiệu & Điểm nhấn (Brand Accents)
- **Primary Accent** (`#5EB839` / `#62B832` - Frog Leaf Green) — Nút hành động chính (CTA), tab active, trạng thái điểm danh sẵn sàng.
- **Secondary Accent** (`#5BB5F2` - Pond Water Blue) — Điểm nhấn làn nước mát, badge thông tin, liên kết điều hướng phụ.
- **Tertiary Accent** (`#FF8DA1` - Lotus Blossom Pink) — Điểm nhấn cánh sen phớt hồng cho các cảnh báo nhẹ nhàng hoặc tooltip yêu thích.
- **Success State** (`#5EB839` / `#34D399`) — Đồng bộ cloud thành công, nhân sự đã có mặt.
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

### 4.1. Mascot & Logo (`FrogLogo.tsx`)
- Logo vector SVG chất lượng cao không vỡ nét ở mọi độ phân giải.
- Hình tượng chú ếch xanh hai má hồng đội lá sen che mưa cùng đóa hoa súng bung nở.

### 4.2. Hình nền sinh thái (`FrogPondBackground.tsx`)
- Thay thế hoàn toàn nền cũ bằng đầm sen sinh thái tự nhiên.
- Các cụm lá sen (lily pads) trôi dạt khẽ khàng, cánh hoa súng hồng và những chú ếch con thấp thoáng ló đầu.
- Tối ưu GPU bằng `will-change: transform`, giảm opacity ở Dark Mode để không gây nhiễu tầm nhìn của người chỉ huy.

### 4.3. Thẻ Nhân Sự (Personnel Cards)
- **Cấu trúc 3 tầng không đè lấn:**
  - **Tầng 1 (Cạnh trên):** Nút kéo Grip (trái) + Checkbox có mặt + Tên Ingame (trung tâm) $\leftrightarrow$ Badge Môn phái + Nút hành động "Xếp" / "Bỏ xếp" (phải).
  - **Tầng 2 (Trung gian):** Tag trạng thái raid (`✓ Raid 1, Raid Up 1`) và Ghi chú kéo dài theo chiều ngang hiển thị trọn vẹn văn bản.
  - **Tầng 3 (Dưới cùng):** Dòng Logged by (`Log: ...`).
- **Tương tác:** Hover nâng nhẹ 1px (`hover:shadow-xs`), khi kéo chuột giảm độ mờ (`opacity-40`), khi nhấp nút có phản hồi tức thì (`active:scale-95`).

### 4.4. Bảng Raid & Bảng Bang Chiến
- **Lưới ô:** Viền 1px tinh tế giữa các hàng (`border-emerald-200/80 dark:border-[#1D3D2D]`).
- **Phân chia Party P1 / P2:** Đường ranh giới rõ ràng, đánh dấu tag nhóm P1/P2 bằng màu sắc nhã nhặn.
- **Hàng trống (Empty Slot):** Màu chữ xám nhạt gợi ý "Ingame...", không dùng màu cảnh báo đỏ.

### 4.5. Nút bấm & Công cụ (Buttons & Controls)
- **Nút hành động chính (Primary CTA):** Nền Frog Green (`#5EB839`), chữ trắng đậm, viền mờ 1px, bo góc `rounded-xl`.
- **Nút phụ (Secondary):** Nền trong suốt hoặc viền mảnh (`border border-emerald-300 dark:border-[#1D3D2D]`), hover làm sáng nhẹ bề mặt.
- **Nhóm nút lọc (Filter Pills):** Bo tròn góc `rounded-lg`, nền mờ nhẹ khi không chọn, nền nổi khi kích hoạt.

---

## 5. Layout & SEO Semantic Structure
- **Cấu trúc ngữ nghĩa HTML5 chuẩn:**
  - `<header role="banner">` — Thanh điều hướng, đổi chế độ Raid/Bang chiến, Cloud sync, Theme switch.
  - `<main role="main">` — Khu vực làm việc chính chứa bảng và kho nhân sự.
  - `<section aria-labelledby="...">` — Từng bảng Raid độc lập có tiêu đề ngữ nghĩa.
  - `<aside aria-label="Kho nhân sự">` — Cột chứa kho nhân sự và công cụ lọc/kéo thả.
  - `<footer>` — Bản quyền, hướng dẫn phím tắt, link liên hệ / donate.

---

## 6. Anti-Patterns (Những điều cấm kỵ)
- **[CẤM] Nhúng Emoji trong source code & nhãn UI:** Tuyệt đối không nhúng các ký tự emoji Unicode vào chuỗi mã nguồn, nhãn nút bấm, tab điều hướng, thông báo toast, badge hoặc tooltip. Luôn sử dụng icon vector SVG chuẩn hóa từ thư viện icon chuyên nghiệp (`lucide-react`) hoặc custom vector SVG (`FrogLogo.tsx`).
- **[CẤM] Hiệu ứng phát sáng Neon / Outer Glow:** Không dùng bóng màu xanh/tím neon xung quanh button hay card.
- **[CẤM] Nền đen tuyền (`#000000`):** Luôn dùng nền Rêu Đêm (`#0B1812` đến `#12241B`) để chống nhức mắt.
- **[CẤM] Hiệu ứng Gradient cầu vồng trên chữ lớn:** Giữ chữ màu đồng nhất để đọc nhanh.
- **[CẤM] Các thành phần đè lấn vị trí (`z-index` tùy tiện):** Mọi badge, text, icon phải có không gian riêng biệt, không được tràn chữ lên nhau.
- **[CẤM] Các animation dài dòng gây chậm trễ thao tác:** Chỉ dùng chuyển động tức thời <= 200ms cho phản hồi xúc giác.
