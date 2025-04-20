-- 建立用戶資料表
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  team TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 讓匿名用戶可以創建新資料，但只能更新或刪除自己的資料
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous users to create profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can only update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can only delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Profiles are viewable by the user who owns it" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 建立比賽資料表
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_count INTEGER DEFAULT 1,
  qual_type TEXT DEFAULT 'fixed',
  qual_value INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 比賽資料表權限
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own tournaments" ON public.tournaments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own tournaments" ON public.tournaments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tournaments" ON public.tournaments
  FOR DELETE USING (auth.uid() = user_id);

-- 建立選手資料表
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  pool_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  rank INTEGER,
  victories INTEGER DEFAULT 0,
  touches_scored INTEGER DEFAULT 0,
  touches_received INTEGER DEFAULT 0,
  index_value FLOAT DEFAULT 0.0,
  is_dq BOOLEAN DEFAULT false,
  is_qualified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 選手資料表權限
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create players for their tournaments" ON public.players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can view players in their tournaments" ON public.players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update players in their tournaments" ON public.players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete players in their tournaments" ON public.players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );

-- 建立比賽結果表
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  phase TEXT NOT NULL, -- "pool" 或 "knockout"
  pool_id INTEGER, -- 如果是小組賽
  round_index INTEGER, -- 如果是淘汰賽
  match_index INTEGER NOT NULL,
  player1_id UUID REFERENCES public.players(id),
  player2_id UUID REFERENCES public.players(id),
  score1 INTEGER DEFAULT 0,
  score2 INTEGER DEFAULT 0,
  winner_id UUID REFERENCES public.players(id),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 比賽結果表權限
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create matches for their tournaments" ON public.matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can view matches in their tournaments" ON public.matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update matches in their tournaments" ON public.matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete matches in their tournaments" ON public.matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.user_id = auth.uid()
    )
  );

-- 用於自动更新 updated_at 時間戳的觸發器
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modified
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_tournaments_modified
BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_matches_modified
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION update_modified_column(); 
