-- Add analytics columns to youtube_videos table
ALTER TABLE youtube_videos
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislike_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category_id TEXT,
ADD COLUMN IF NOT EXISTS live_broadcast_content TEXT,
ADD COLUMN IF NOT EXISTS default_language TEXT,
ADD COLUMN IF NOT EXISTS default_audio_language TEXT,
ADD COLUMN IF NOT EXISTS analytics_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN view_count > 0 THEN ((like_count + comment_count)::NUMERIC / view_count::NUMERIC) * 100
    ELSE 0
  END
) STORED;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_youtube_videos_published_at ON youtube_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_view_count ON youtube_videos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_engagement_rate ON youtube_videos(engagement_rate DESC);

-- Add column to track which machines are primarily featured (not just mentioned)
ALTER TABLE machine_videos
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS relevance_score NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS notes TEXT;