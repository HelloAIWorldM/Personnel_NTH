# Stitch UI/UX Prompts — NTH Raid & Bang Chiến

## How to use

1. Paste **Prompt 0** first to establish the shared visual system in one Stitch project.
2. Then paste each screen prompt in sequence. All prompts assume the same project and deliberately reuse the same shell, tokens, and Vietnamese product language.
3. If generating a screen in a separate Stitch project, prepend Prompt 0 to that screen prompt.

The product is a Vietnamese guild-operations web app for an MMORPG. It helps guild leaders arrange raid rosters, assign parties, maintain a reusable personnel pool, manage guild-war teams, record attendance, and export/share boards. It is a focused coordination tool, not a fantasy game landing page.

---

## Prompt 0 — Shared visual system and application shell

```text
Design the desktop-first responsive web application shell for “NTH Raid & Bang Chiến”, a Vietnamese MMORPG guild-operations tool. The users are guild leaders and raid leaders who need to scan and edit dense rosters quickly, often during evening gameplay.

Create an original, calm dark operations-console style inspired by the precision and information density of Linear, but do not copy any brand. Use near-black #0B0D12 canvas, layered charcoal surfaces, 1px cool-gray borders, off-white text, muted slate secondary text, and a restrained indigo #6D6AF6 primary action. The Bang Chiến mode may use amber-to-rose only as its mode identifier. Reserve each class color for class chips/data only; never use those colors as large decoration. No gradients except the small Bang Chiến mode marker. No fantasy character art, loot, medieval ornament, glassmorphism, or oversized rounded cards.

Use Be Vietnam Pro (or Inter fallback), strong Vietnamese hierarchy, 8px spacing rhythm, 10–12px rounded corners, 44px minimum tap targets, keyboard-visible focus, high contrast, and icons with text labels. Use a compact left sidebar on desktop and a mobile bottom navigation. Desktop content area: 12-column grid, maximum 1440px. The app shell has:
- left sidebar: NTH mark; two primary modes “Raid” and “Bang Chiến”; board switcher section; quick links; user avatar/settings at bottom
- top bar: breadcrumb/active board title, last saved state, theme toggle, compact actions for Sheets, Cloud, Backup, and Export
- contextual board tabs below top bar, horizontally scrollable on mobile
- command palette/search trigger in the top bar
- small non-blocking toast region at bottom right

Use realistic Vietnamese UI content and example labels such as “RAID 1 · THU 20:30”, “NIÊN DU”, “Kho Nhân Sự”, “Phân Nhóm PT”, “Xuất & Chia sẻ”, “BANG CHIẾN TUẦN 4”. Design light mode as a true alternate token set, not a separate layout. Show desktop at 1440px and add a small mobile behavior annotation, but prioritize the desktop production screen.
```

## Prompt 1 — Raid roster workspace

```text
Using the established NTH Raid & Bang Chiến design system, design the primary “Bảng Xếp Raid” workspace for an active board called “RAID 1 · THU 20:30 · NIÊN DU”. This is the core editing screen and must feel fast, calm, and trustworthy under time pressure.

Layout: main workspace plus a collapsible right “Kho Nhân Sự” drawer. At the top, show a compact board identity card with inline-editable raid name, schedule, and boss. Directly below, show a composition summary: 12/12 filled, Tank 2, Healer 3, DPS 7; show click-to-filter class chips for the 11 classes. Then use a segmented local navigation: Bảng Xếp Raid, Tổng Quan, Kho Nhân Sự, Phân Nhóm PT.

The main panel is a polished editable table, not cards: columns STT, Ingame, Môn phái, Logged by, PT, and a compact row action menu. Include 12 rows with representative Vietnamese names. Each class is an accessible labeled colored chip, for example “Thiết Y · Tank”, “Tố Vấn · Healer”, “Thần Tương · DPS”. Make empty states clearly editable. Support inline text editing, class dropdown, logged-by autofill, reorder drag handle, present checkbox, duplicate-name warning, duplicate “logged by” warning, and a subtle “+ Thêm vị trí” row at the bottom. Add a sticky table toolbar with search/filter, “Điền nhanh Logged by”, “Hiện chia PT”, undo, and a prominent “Xuất & Chia sẻ” button.

In the right personnel drawer, display searchable draggable member cards with class chip, availability status, current assignment, and “+ Xếp” action. Show a slim hint explaining users can drag a member into a roster row. Include an empty-slot highlight as a drag target. Make table headers sticky and allow horizontal scroll on tablet without losing the first column. Include a compact mobile annotation: roster becomes a horizontally scrollable table; tapping STT opens the actions sheet.
```

## Prompt 2 — Raid party manager

```text
Using the established design system, design “Phân Nhóm PT” for the active Raid board. This screen helps a raid leader balance a 12-person roster across parties without losing sight of Tank, Healer, and DPS coverage.

Top area: heading “Phân Nhóm PT”, short helper text, overall balance health indicator, and buttons “Chia đều 2 PT”, “Cân bằng Tank/Heal”, “Thêm nhóm PT”. Explain results with concise, non-intrusive status copy.

Below, create a responsive two-column party-board layout with “PT 1” and “PT 2”. Each party panel has an editable title, six ordered player rows, role totals (Tank / Heal / DPS), count 6/6, and warnings such as “Thiếu Healer” or “Trùng Ingame”. Player rows have order number, drag handle, name, class chip, logged-by metadata, present state, and a quick move-to-party control. Add a third dashed drop zone for creating another party. Make completed/healthy teams calm, warnings visually distinct but not alarming, and empty slots obvious.

Show an optional narrow right panel called “Gợi ý đội hình” that recommends a move only when it improves role balance, for example “Chuyển LinhAnh (Tố Vấn) sang PT 2”. Include approve and dismiss controls; never make automatic changes silently. On mobile, party panels stack and each member row exposes large Move up, Move down, and Chuyển nhóm controls instead of relying on drag and drop.
```

## Prompt 3 — Personnel pool

```text
Using the established design system, design the “Kho Nhân Sự” screen: a reusable guild member directory that supports finding, editing, and assigning players to raid boards.

Start with a concise KPI strip: total personnel, Chưa xếp, Đã xếp, Có mặt. Beneath it, show a wide search input “Tìm theo Ingame, Logged by hoặc Class...”, status filters (Tất cả, Chưa xếp, Đã xếp, Chưa có trong bảng hiện tại), class chips with counts, and a primary “Thêm nhân sự” button. Offer a secondary action “Lấy từ Raid” that imports members from the active roster.

Use a dense, friendly data table with columns Ingame, Môn phái, Logged by, Ghi chú, Trạng thái, Đang xếp ở, and actions. Show a row example with a colored accessible class chip, status tag “Chưa xếp” or “Có mặt”, and assignment information such as “RAID 1 · STT 04”. Row actions: “+ Xếp vào RAID 1”, edit, remove from active board, and delete from storage; destructive actions must be quieter and confirmable. Put quick inline add/edit in a compact expandable panel rather than a full-screen form.

Design three deliberate states: populated list, no search results with a clear reset-filter action, and empty-first-use state that offers “Thêm nhân sự” and “Lấy từ Raid”. At mobile width, convert rows into compact cards with the same actions and keep the primary assignment action visible.
```

## Prompt 4 — All raid boards overview

```text
Using the established design system, design “Tổng Quan Tất Cả Bảng” for a guild leader coordinating multiple raid boards at once.

At the top, show clear at-a-glance metrics: 4 bảng Raid, 39/48 vị trí đã điền, 3 vị trí thiếu Healer, 5 nhân sự chưa xếp. Include filters for schedule/date, boss, readiness, and a search field. Primary action: “+ Tạo Bảng Raid”.

Main content: a responsive grid of board status cards, not a generic analytics dashboard. Each card includes board name, schedule, boss, filled capacity, thin readiness progress bar, role coverage mini-icons/counts, assigned party count, and a direct “Mở bảng” action. Highlight issues only when actionable, e.g. “Thiếu 1 Healer” or “2 tên trùng”. Use the indigo accent for the selected/ready state and restrained amber for attention. Include a small list of “Cần xử lý trước” that links to the exact board row/party needing attention.

Include a compact weekly timeline/list view toggle to help leaders scan upcoming raids. Keep data density high, avoid charts that do not lead to a decision, and make cards safe for touch on tablet/mobile.
```

## Prompt 5 — Create a raid board

```text
Using the established design system, design a focused modal for creating a new Raid board. Title: “Tạo Bảng Raid Mới”; subtitle: “Chọn khởi điểm phù hợp, bạn luôn có thể chỉnh sửa sau.”

The form has three visible inputs: Tên bảng (prefilled “RAID 5”), Lịch Raid (example “THU 20:30”), and Boss / Ải (example “NIÊN DU”). Then present three large but compact selectable template cards with radio controls and short explanations:
1. “Bảng trống theo định dạng Raid 1” — recommended, starts with 12 class slots.
2. “Điền từ Kho Nhân Sự” — preserves the Raid 1 class layout and prefers unassigned members.
3. “Sao chép từ bảng hiện tại” — clones names, classes, logged-by values, and parties.

Show a small live preview of the 12-slot composition beside/below the selection, including class chips and party split. Footer actions: “Huỷ” and primary “Tạo Bảng RAID 5”. Clearly validate blank required fields inline. On mobile, this becomes a bottom sheet with the primary action pinned at the bottom.
```

## Prompt 6 — Export, privacy, and sharing

```text
Using the established design system, design the “Xuất & Chia sẻ” workflow as a right-side sheet or large modal for a Raid board. The goal is to let a leader safely send the roster to Discord, Zalo, Messenger, or spreadsheets.

Header: active board title and a simple data-presence indicator. First section: “Bảo mật thông tin” with an explanatory line and three visually clear privacy choices: “Đầy đủ”, “Che (Tr***ng)”, and “Ẩn hẳn (---)” for player names/logged-by fields. Include a compact preview thumbnail of the export result that changes with the selection.

Second section: “Ảnh” with primary “Chụp & Sao chép ảnh”, secondary “Tải PNG chất lượng cao”, and an accessible fallback success state for browsers that block clipboard image writes. Third section: “Tệp” with cards for “Tải Excel (.xls) có màu & khung”, “Tải CSV”, and “Sao chép văn bản”. Fourth section: “Chia sẻ nhanh” with “Sao chép link chỉ xem” and a short sharing permission note.

Use clear progress/success/error states. Keep potentially sensitive export choices explicit. The screen must feel like a polished productivity tool, not an operating-system file dialog. On mobile, actions are full-width, ordered by frequency, with the privacy choice never hidden below the fold.
```

## Prompt 7 — Google Sheets sync

```text
Using the established design system, design a modal called “Đồng bộ với Google Sheets”. It connects the active raid roster to a user’s Google Drive.

First-state view: an illustrated-but-minimal Google account connection panel, a factual one-sentence permission explanation, and a clear “Đăng nhập với Google” button. Do not show Google branding beyond the standard multicolor G icon.

Connected-state view: show the authenticated user identity compactly with avatar, display name, email, and “Đăng xuất”. Then show exactly two action cards:
- “Tạo bảng tính mới trên Google Drive” with board title, current row count, and primary “Xuất file”.
- “Nhập danh sách từ Google Sheet có sẵn” with a URL or spreadsheet-ID field and “Nhập” button.

Design loading state, insufficient-permission explanation with a retry action, imported-success confirmation, and export success confirmation with “Mở Google Sheet ngay”. Make error messages readable in Vietnamese and never blame the user. Use emerald only as a contextual integration/success accent; retain the shared dark console appearance.
```

## Prompt 8 — Cloud sync and backup safety

```text
Using the established design system, design two related safety workflows for NTH Raid & Bang Chiến.

First, design the “Đồng bộ Đám mây” modal. Explain in one sentence that the same Guild ID lets trusted members see and arrange shared data. Show summary counts for personnel, Raid boards, and Bang Chiến boards. Give one prominent “Mã Phòng / Bang (Guild ID)” input with an example “nth_guild”, copy/share affordance, and a clearly labeled automatic-sync toggle. Provide two actions with careful hierarchy: “Đẩy dữ liệu lên Cloud” and “Tải dữ liệu từ Cloud”. Before pulling, show a conflict-safe comparison state that explains what will replace local data and requires confirmation. Include last-sync time, connecting state, success state, and a recoverable error state.

Second, design the “Sao lưu & Khôi phục” modal. Top section: “Tạo bản sao ngay” with a download JSON action. Next: “Khôi phục từ tệp” with drop zone, file-validation state, and before/after summary. Last: “Bản chụp tự động gần đây” as a compact list with timestamp, board counts, personnel count, and “Khôi phục” actions. Make restoring destructive/reversible state understandable: confirm what will change, offer export-first, and never hide it behind a vague warning. Use calm indigo and data-storage iconography, not alarm colors, except for irreversible confirmation.
```

## Prompt 9 — Class color customizer

```text
Using the established design system, design “Tùy Chỉnh Màu Sắc Môn Phái” as a full-featured configuration modal. This tool applies colors consistently to roster tables, exports, and spreadsheets.

Top area: three selectable preset cards, “Mặc định (Chuẩn ảnh)”, “Pastel Dịu Mắt”, and “Neon Nổi Bật”, each with a small swatch preview. Include a quiet “Đặt lại tất cả về mặc định” action. Beneath, present an accessible two-column list of all classes. Each row has an actual class-chip preview, role and short code, current HEX value, color-picker trigger, editable hex field, and per-class reset action if customized. Include an optional quick-swatches strip.

Make contrast safety visible: if a chosen color reduces text contrast, show a suggestion/automatic text-color preview. Class colors are functional data, so show labels and role names rather than relying only on color. Footer: explain that changes auto-save across Raid, exports, and Excel; close with “Hoàn tất”. On mobile, use one column and pin the footer.
```

## Prompt 10 — Guild War board hub

```text
Using the established NTH system, design the Bang Chiến board hub for “BANG CHIẾN TUẦN 4”. This is an operations workspace distinct from Raid mode but clearly part of the same product.

Use amber-to-rose sparingly to identify Bang Chiến mode; the rest remains dark, precise, and data-dense. Top board identity area includes inline-editable title, schedule “T7 20:00 & CN 20:00”, target “Công Thành / Đẩy Trụ”, member count, and actions “Sao chép link”, “Nhân bản”, and a guarded delete menu. Below, show three large numbered workflow tabs with strong descriptions:
1. “Bảng Nhân Sự” — roster and eligibility.
2. “Sơ Đồ Chia Team Bang Chiến” — team allocation.
3. “Bảng Điểm Danh & Báo Cáo” — attendance and readiness.

Include a compact readiness strip: total members, assigned to team, unassigned, attendance threshold met, and notable gaps. Add a “Quay lại Raid” contextual link. Design empty state for a new board that guides the user through the three steps rather than showing a blank wall of content. Mobile should retain the workflow order with large, thumb-friendly segmented tabs.
```

## Prompt 11 — Guild War roster

```text
Using the established design system, design the Bang Chiến “Bảng Nhân Sự” tab. This is a large roster where leaders prepare people for war, then assign them to teams.

Header controls: search “Tìm Ingame, Discord...”, filters for Môn phái, Chức vụ, Tham gia, and Team; primary “Thêm nhân sự”; secondary “Dán danh sách”; tertiary “Nhập từ Kho Raid”. The quick-add form includes Ingame, Môn phái, Chức vụ (Bang Chủ, Phó Bang, Trưởng Lão, Đường Chủ, Tinh Anh, Lead Tổng, Lead Team, Thành Viên, Học Đồ), participation (Cả hai, Bang chiến, Raid, Dự bị), Discord, and team.

Use a high-density editable table with columns: STT, Tên Ingame, Lưu Phái, Chức Vụ, Tham Gia, Team Bang Chiến, Discord, Thao Tác. Team options are Mid, Cơ động, Đẩy trụ, Chưa xếp; keep Top/Bot visible as strategic labels if relevant to the team map. Rows should support edit/save/cancel, remove, and an immediate team dropdown. Class chips must show class + role; use role labels for accessibility.

Provide a bulk-paste panel that accepts “Tên Ingame - Môn Phái - Discord” or pasted spreadsheet rows, previews parsed entries, identifies invalid rows, and lets the user import only valid entries. Include a compact footer summary showing team counts and “Chưa xếp”. Design an intentional empty state and responsive mobile cards with edit and assign controls.
```

## Prompt 12 — Guild War team map

```text
Using the established design system, design the Bang Chiến “Sơ Đồ Chia Team Bang Chiến” tab. The functional goal is to place roster members into a comprehensible battle formation and quickly export it.

Top: heading, compact instruction about dragging, status showing assigned/unassigned players, then action buttons “Copy ảnh”, “Tải PNG”, and “Copy danh sách Discord”. Do not make the screen look like a game map; use a structured tactical board.

Central panel: a clear battle layout divided into strategic zones “Top”, “Mid”, “Bot”, “Cơ động”, and “Đẩy trụ”. Within each zone, show party sections PT 1–PT 4 with six numbered slots. A filled slot contains member name, class chip, role indicator, Discord mini-tag, and remove-to-reserve action. Empty slots are obvious drop targets. Support drag/drop and click-to-place. The design must make team composition and empty capacity visible in seconds.

Alongside or beneath it, show an “Hàng dự bị / Chưa xếp” panel with search, draggable member cards, filters, and clear availability. Include a compact visual legend for zones and roles. Add a screenshot/export-ready preview state and a browser-clipboard fallback state where generated image can be copied or downloaded. On mobile, zones stack in the strategic order and reserve cards remain easy to drag or tap-assign.
```

## Prompt 13 — Guild War attendance and report

```text
Using the established design system, design the Bang Chiến “Bảng Điểm Danh & Báo Cáo” tab for tracking attendance across sessions and identifying reliable participants.

Top summary: target attendance threshold control labeled “Chỉ tiêu Đạt” set to 4, results “Đạt / Chưa đạt”, report date, and “+ Thêm buổi chiến”. Show a small explanation that a member qualifies when they meet the target number of sessions.

Main area: a spreadsheet-like but polished attendance matrix. Frozen left columns are Ingame, Môn phái, Chức vụ, Team, and attendance result. Session columns include “Tuần 1/T1”, “Tuần 1/T2”, “Tuần 2”, “Tuần 3/T1”, “Tuần 3/T2”, “Tuần 4”; each has a date and bulk toggle. Cells are large enough to toggle using a checkmark, and rows automatically calculate n/6 and a clear Đạt / Chưa đạt badge. Allow session rename, bulk mark-all, delete a session, and create a new session.

Add a right/upper insight panel that lists people below target and team-level attendance health, with links to roster/team assignment. Design export/report action at the end. On mobile, transform the matrix into a person-first detail card or horizontally scrollable table with frozen identity column, never a cramped unreadable grid.
```

## Prompt 14 — Create a Guild War board

```text
Using the established design system, design the “Tạo Bảng Bang Chiến” modal. It should be a quick setup for a guild leader, visually related to the Raid-board creator but with warm Bang Chiến identity accents.

Fields: Tên bảng, default “BANG CHIẾN TUẦN 5”; Lịch chiến, placeholder “T7 20:00 & CN 20:00”; and Mục tiêu, placeholder “Chiếm Lãnh Địa / Đẩy Trụ”. Then offer two clear radio-template options: “Bảng trống (Khuyến nghị)” and “Nạp từ Kho Raid”. The Raid option previews how many reusable members will be imported and lets the user decide whether to prefill their class/Discord data.

Show a concise preview of the default six attendance sessions and the five strategic zones (Top, Mid, Bot, Cơ động, Đẩy trụ). Place “Huỷ” and primary “Tạo Bảng Bang Chiến” in a sticky footer. Validate fields in Vietnamese and retain form values after validation errors. On mobile, make this a bottom sheet with the CTA fixed above safe area.
```

## Prompt 15 — Mobile interaction layer

```text
Using the established design system, design the mobile-first interaction patterns for NTH Raid & Bang Chiến at 390px width. Show two focused mobile screens side by side.

Screen A: the Raid roster with a compact top bar, board selector, composition chips, and horizontally scrollable roster. Demonstrate the “row action sheet” opened by tapping STT 04. The bottom sheet identifies the player and exposes large one-handed actions: Di chuyển lên, Di chuyển xuống, Chuyển sang PT 1 / PT 2, Đổi môn phái, Điền Logged by = Ingame, and destructive Xoá vị trí. Use safe spacing, a drag handle only as a secondary affordance, and a dismissible scrim.

Screen B: “Chọn môn phái” bottom sheet for a selected player. Header includes player name and current class. Show an accessible two-column selectable grid of class + role chips with their meaningful colors. Include a “Tùy chỉnh đổi màu môn phái” link and a close affordance. Make it clear that color is supplemented by name and role.

Across mobile, use a bottom navigation with Raid, Bang Chiến, Kho Nhân Sự, and Thêm. Keep top-level actions under an overflow menu except Export. Use 44–48px touch targets, sheet actions reachable by thumb, and preserve all core desktop capabilities without crowding.
```

## Optional Prompt 16 — Support / coffee modal

```text
Using the established design system, design a small optional “Ủng hộ tác giả” modal for a free community tool. It must feel warm, grateful, and unobtrusive—not like a payment checkout.

Use a compact dark modal with a small coffee icon, title “Mời tác giả một ly cà phê”, a supplied QR-code image placeholder, bank/account details, and a “Copy số tài khoản” button with copied confirmation. Add a short friendly Vietnamese thank-you note and a single close action. Keep the modal visually separate from operational tasks, avoid guilt language, and never interrupt core flows.
```

---

## UX handoff checklist

- Preserve Vietnamese as the primary interface language and use concrete guild terminology.
- Treat class colors as structured, accessible data; pair every color with a class/role label.
- Use optimistic saving with a visible “Đã lưu” state and an undo where a quick local edit can be reversed.
- Use confirmation plus a clear impact summary for deletes, restores, Cloud pulls, and anything that may overwrite local work.
- Keep heavy table editing on desktop but provide first-class mobile sheets/cards rather than shrinking tables to unreadable dimensions.
- Do not invent player statistics, monetization, combat simulation, social feeds, or user roles that are not part of the product.
