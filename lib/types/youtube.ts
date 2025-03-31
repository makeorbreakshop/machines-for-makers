export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  duration: string;
  channelId: string;
  channelTitle: string;
}

export interface YouTubeVideoDatabase {
  id: string;
  youtube_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  duration: string;
  channel_id: string;
  status: 'new' | 'transcribed' | 'review_generated' | 'published';
  created_at: string;
  updated_at: string;
}

export interface YouTubeTranscript {
  id: string;
  youtube_video_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MachineVideo {
  id: string;
  machine_id: string;
  youtube_video_id: string;
  created_at: string;
}

export interface YouTubeChapter {
  title: string;
  start_time: number;
  end_time?: number;
} 