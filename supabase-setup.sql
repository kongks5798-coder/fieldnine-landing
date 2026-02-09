-- =============================================
-- Field Nine OS — Supabase Setup Script
-- Supabase Dashboard → SQL Editor 에서 실행하세요
-- =============================================

-- 1. projects 테이블 생성
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT DEFAULT '',
  prompt TEXT DEFAULT '',
  files JSONB DEFAULT '{}'::jsonb,
  deployed_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);

-- 2. RLS (Row Level Security) 설정
-- 단일 사용자 앱이므로 anon 키에 전체 접근 허용
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON public.projects;
CREATE POLICY "Allow all for anon" ON public.projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('assets', 'assets', true, 5242880, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/svg+xml','application/pdf','text/plain']),
  ('deployments', 'deployments', true, 2097152, ARRAY['text/html','text/css','application/javascript','text/javascript'])
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS 정책 (공개 읽기 + anon 업로드/삭제)
-- assets 버킷
DROP POLICY IF EXISTS "Public read assets" ON storage.objects;
CREATE POLICY "Public read assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "Allow upload assets" ON storage.objects;
CREATE POLICY "Allow upload assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'assets');

DROP POLICY IF EXISTS "Allow delete assets" ON storage.objects;
CREATE POLICY "Allow delete assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'assets');

-- deployments 버킷
DROP POLICY IF EXISTS "Public read deployments" ON storage.objects;
CREATE POLICY "Public read deployments" ON storage.objects
  FOR SELECT USING (bucket_id = 'deployments');

DROP POLICY IF EXISTS "Allow upload deployments" ON storage.objects;
CREATE POLICY "Allow upload deployments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'deployments');

DROP POLICY IF EXISTS "Allow update deployments" ON storage.objects;
CREATE POLICY "Allow update deployments" ON storage.objects
  FOR UPDATE USING (bucket_id = 'deployments');

-- 5. 검증 쿼리
SELECT 'projects table' AS resource, count(*) AS rows FROM public.projects
UNION ALL
SELECT 'storage buckets', count(*) FROM storage.buckets WHERE id IN ('assets', 'deployments');
