-- ==============================================================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ СЕМЕЙНОГО ВИШЛИСТА (SUPABASE + AUTH)
-- ==============================================================================

-- 1. Профили зарегистрированных пользователей
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  birthday DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Семейные группы / круги
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Члены семейных групп
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- 4. Желания / Подарки
CREATE TABLE IF NOT EXISTS public.wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link_url TEXT,
  image_url TEXT,
  price NUMERIC(10, 2),
  currency TEXT DEFAULT '₽',
  priority TEXT CHECK (priority IN ('must_have', 'nice_to_have', 'dream')) DEFAULT 'nice_to_have',
  event_tag TEXT DEFAULT 'Без повода',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Секретные бронирования («Анти-спойлер»)
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wish_id UUID REFERENCES public.wishes(id) ON DELETE CASCADE UNIQUE NOT NULL,
  reserved_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ТРИГГЕР: АВТОМАТИЧЕСКИЙ ПРОФИЛЬ ПРИ РЕГИСТРАЦИИ В SUPABASE AUTH
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- БЕЗОПАСНОСТЬ: ROW LEVEL SECURITY (RLS) БЕЗ РЕКУРСИИ
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Family groups
DROP POLICY IF EXISTS "Family groups viewable by members" ON public.family_groups;
DROP POLICY IF EXISTS "Family groups viewable by authenticated users" ON public.family_groups;
CREATE POLICY "Family groups viewable by authenticated users"
  ON public.family_groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create family groups" ON public.family_groups;
CREATE POLICY "Users can create family groups"
  ON public.family_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 3. Group members
DROP POLICY IF EXISTS "Group members viewable by members of same group" ON public.group_members;
DROP POLICY IF EXISTS "Group members viewable by authenticated users" ON public.group_members;
CREATE POLICY "Group members viewable by authenticated users"
  ON public.group_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. Wishes
DROP POLICY IF EXISTS "Wishes viewable by group members" ON public.wishes;
CREATE POLICY "Wishes viewable by group members"
  ON public.wishes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own wishes" ON public.wishes;
CREATE POLICY "Users can insert own wishes"
  ON public.wishes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own wishes" ON public.wishes;
CREATE POLICY "Users can update own wishes"
  ON public.wishes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own wishes" ON public.wishes;
CREATE POLICY "Users can delete own wishes"
  ON public.wishes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. Reservations (АНТИ-СПОЙЛЕР)
-- Владелец подарка НИ ПРИ КАКИХ УСЛОВИЯХ не видит бронь на свой подарок!
DROP POLICY IF EXISTS "Anti-spoiler: reservation hidden from wish owner" ON public.reservations;
CREATE POLICY "Anti-spoiler: reservation hidden from wish owner"
  ON public.reservations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishes
      WHERE wishes.id = reservations.wish_id
      AND wishes.user_id != auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can reserve wishes of others" ON public.reservations;
CREATE POLICY "Users can reserve wishes of others"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (
    reserved_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.wishes
      WHERE wishes.id = reservations.wish_id
      AND wishes.user_id != auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can cancel own reservation" ON public.reservations;
CREATE POLICY "Users can cancel own reservation"
  ON public.reservations FOR DELETE TO authenticated
  USING (reserved_by = auth.uid());

-- ==============================================================================
-- МИГРАЦИЯ: ПОДДЕРЖКА TELEGRAM MINI APP И ПЛАТФОРМЫ MAX (Zero-Click Auth)
-- ==============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_profiles_max_user_id ON public.profiles(max_user_id);
