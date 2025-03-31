-- Create youtube_videos table
CREATE TABLE IF NOT EXISTS youtube_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  duration TEXT,
  channel_id TEXT,
  chapters JSONB,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create machine_videos junction table
CREATE TABLE IF NOT EXISTS machine_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  youtube_video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(machine_id, youtube_video_id)
);

-- Add fields to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS youtube_video_id UUID REFERENCES youtube_videos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS generation_status TEXT;

-- Add fields to images table
ALTER TABLE images
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS source_id UUID,
ADD COLUMN IF NOT EXISTS timestamp TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_machine_videos_machine_id ON machine_videos(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_videos_youtube_video_id ON machine_videos(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_status ON youtube_videos(status);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_youtube_id ON youtube_videos(youtube_id);

-- Add chapters column to youtube_videos table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'youtube_videos'
        AND column_name = 'chapters'
    ) THEN
        ALTER TABLE youtube_videos
        ADD COLUMN chapters JSONB;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_youtube_videos_youtube_id ON youtube_videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_status ON youtube_videos(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_youtube_video_id ON transcripts(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_machine_videos_machine_id ON machine_videos(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_videos_youtube_video_id ON machine_videos(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_reviews_youtube_video_id ON reviews(youtube_video_id);

-- Add or update any missing constraints
ALTER TABLE transcripts
DROP CONSTRAINT IF EXISTS fk_transcripts_youtube_video_id,
ADD CONSTRAINT fk_transcripts_youtube_video_id 
FOREIGN KEY (youtube_video_id) REFERENCES youtube_videos(id) ON DELETE CASCADE;

ALTER TABLE machine_videos
DROP CONSTRAINT IF EXISTS fk_machine_videos_machine_id,
ADD CONSTRAINT fk_machine_videos_machine_id 
FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE;

ALTER TABLE machine_videos
DROP CONSTRAINT IF EXISTS fk_machine_videos_youtube_video_id,
ADD CONSTRAINT fk_machine_videos_youtube_video_id 
FOREIGN KEY (youtube_video_id) REFERENCES youtube_videos(id) ON DELETE CASCADE;

ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS fk_reviews_youtube_video_id,
ADD CONSTRAINT fk_reviews_youtube_video_id 
FOREIGN KEY (youtube_video_id) REFERENCES youtube_videos(id) ON DELETE SET NULL; 