-- ==============================================================================
-- GIẢI PHÁP KHẮC PHỤC TRIỆT ĐỂ LỖI LỘ THÔNG TIN (PII LEAK) TRONG SUPABASE / POSTGREST
-- Lỗi hiển thị trong DevTools: GET /rest/v1/profiles?select=*
-- Trả về: email, is_admin, phone, password_hash cho bất kỳ ai truy cập
-- ==============================================================================

-- BƯỚC 1: BẬT ROW LEVEL SECURITY (RLS) TRÊN BẢNG PROFILES GỐC
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- BƯỚC 2: THU HỒI QUYỀN TRUY VẤN TẤT CẢ (SELECT *) CỦA CLIENT ẨN DANH / KHÔNG PHẢI CHỦ TÀI KHOẢN
-- Chỉ cho phép người dùng xem thông tin nhạy cảm của CHÍNH HỌ
DROP POLICY IF EXISTS "Users can only select their own profile" ON profiles;
CREATE POLICY "Users can only select their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Cho phép người dùng chỉnh sửa hồ sơ của chính họ
DROP POLICY IF EXISTS "Users can only update their own profile" ON profiles;
CREATE POLICY "Users can only update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  -- Chặn người dùng tự nâng cấp quyền Admin qua client request
  AND (OLD.is_admin IS NOT DISTINCT FROM NEW.is_admin)
);

-- ==============================================================================
-- BƯỚC 3: TẠO "PUBLIC VIEW" AN TOÀN ĐỂ CLIENT TRUY VẤN DANH SÁCH THÀNH VIÊN
-- View này CHỈ CHỨA các cột công khai (id, username, bio, avatar, created_at)
-- TUYỆT ĐỐI KHÔNG CHỨA: email, is_admin, phone, password_hash
-- ==============================================================================
DROP VIEW IF EXISTS public_member_profiles;

CREATE VIEW public_member_profiles 
WITH (security_invoker = true) -- Hoặc false tùy cấu hình quyền
AS
SELECT 
  id,
  username,
  bio,
  created_at,
  is_premium
  -- Cột 'email' và 'is_admin' đã được loại bỏ hoàn toàn!
FROM profiles;

-- Cấp quyền đọc View an toàn này cho toàn bộ người dùng (kể cả chưa đăng nhập)
GRANT SELECT ON public_member_profiles TO anon, authenticated;

-- ==============================================================================
-- BƯỚC 4: THAY ĐỔI TRUY VẤN Ở FRONTEND (JAVASCRIPT / TYPESCRIPT)
-- Thay vì gọi:
--   const { data } = await supabase.from('profiles').select('*')
-- 
-- Hãy gọi:
--   const { data } = await supabase.from('public_member_profiles').select('id, username, bio, is_premium')
-- ==============================================================================
