-- Create review_drafts table for storing AI-generated review drafts
CREATE TABLE IF NOT EXISTS public.review_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  title TEXT,
  structure JSONB,
  content TEXT,
  rating SMALLINT,
  generation_status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for frequently accessed columns
CREATE INDEX IF NOT EXISTS review_drafts_youtube_video_id_idx ON public.review_drafts (youtube_video_id);
CREATE INDEX IF NOT EXISTS review_drafts_machine_id_idx ON public.review_drafts (machine_id);
CREATE INDEX IF NOT EXISTS review_drafts_generation_status_idx ON public.review_drafts (generation_status);

-- Add is_ai_generated column to reviews table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'is_ai_generated'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add youtube_video_id column to reviews table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'youtube_video_id'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN youtube_video_id UUID REFERENCES public.youtube_videos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add generation_status column to reviews table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'generation_status'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN generation_status TEXT;
  END IF;
END $$;

-- Add RLS policies
ALTER TABLE public.review_drafts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with drafts
CREATE POLICY admin_all_drafts ON public.review_drafts
  FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM public.user_profiles WHERE auth.uid() = id)
  ); 