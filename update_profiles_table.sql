-- 擴展 profiles 表以包含更多用戶資訊
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS team TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 確保所有現有記錄都有這些列
UPDATE public.profiles
SET phone = '', team = '', bio = '', avatar_url = ''
WHERE phone IS NULL OR team IS NULL OR bio IS NULL OR avatar_url IS NULL;

-- 確保 profiles 表有正確的 id 列和主鍵
DO $$ 
BEGIN
  -- 檢查主鍵是否存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_pkey' AND conrelid = 'public.profiles'::regclass
  ) THEN
    -- 添加主鍵約束
    ALTER TABLE public.profiles ADD PRIMARY KEY (id);
  END IF;
END $$;

-- 設置儲存桶和權限
BEGIN;

-- 創建新的存儲桶，如果它尚未存在
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', false) 
ON CONFLICT (id) DO NOTHING;

-- 允許匿名用戶創建頭像文件
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;

CREATE POLICY "Anyone can upload an avatar" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- 允許用戶讀取自己的頭像
DROP POLICY IF EXISTS "Avatar Owner can select" ON storage.objects;

CREATE POLICY "Avatar Owner can select" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 允許用戶更新自己的頭像
DROP POLICY IF EXISTS "Avatar Owner can update" ON storage.objects;

CREATE POLICY "Avatar Owner can update" ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 允許用戶刪除自己的頭像
DROP POLICY IF EXISTS "Avatar Owner can delete" ON storage.objects;

CREATE POLICY "Avatar Owner can delete" ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT; 