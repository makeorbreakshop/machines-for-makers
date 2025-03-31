import { createClient } from '@supabase/supabase-js';
import { YouTubeVideo, YouTubeVideoDatabase, MachineVideo, YouTubeChapter } from '../types/youtube';

export class YouTubeDbService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Save a YouTube video to the database
   */
  async saveVideo(video: YouTubeVideo): Promise<YouTubeVideoDatabase> {
    const { data, error } = await this.supabase
      .from('youtube_videos')
      .upsert(
        {
          youtube_id: video.id,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnailUrl,
          published_at: video.publishedAt,
          duration: video.duration,
          channel_id: video.channelId,
          status: 'new',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'youtube_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving video:', error);
      throw error;
    }

    return data;
  }

  /**
   * Save multiple YouTube videos to the database
   */
  async saveVideos(videos: YouTubeVideo[]): Promise<YouTubeVideoDatabase[]> {
    const videosToSave = videos.map((video) => ({
      youtube_id: video.id,
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnailUrl,
      published_at: video.publishedAt,
      duration: video.duration,
      channel_id: video.channelId,
      status: 'new',
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .from('youtube_videos')
      .upsert(videosToSave, { onConflict: 'youtube_id' })
      .select();

    if (error) {
      console.error('Error saving videos:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all YouTube videos
   */
  async getVideos(
    page = 1,
    pageSize = 10,
    status?: string
  ): Promise<{ videos: YouTubeVideoDatabase[]; count: number }> {
    let query = this.supabase
      .from('youtube_videos')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('published_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }

    return { videos: data || [], count: count || 0 };
  }

  /**
   * Get a single YouTube video by ID
   */
  async getVideo(id: string): Promise<YouTubeVideoDatabase> {
    const { data, error } = await this.supabase
      .from('youtube_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching video:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update the status of a YouTube video
   */
  async updateVideoStatus(id: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('youtube_videos')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating video status:', error);
      throw error;
    }
  }

  /**
   * Associate a YouTube video with a machine
   */
  async associateVideoWithMachine(
    youtubeVideoId: string,
    machineId: string
  ): Promise<void> {
    const { error } = await this.supabase.from('machine_videos').upsert(
      {
        machine_id: machineId,
        youtube_video_id: youtubeVideoId,
      },
      { onConflict: 'machine_id,youtube_video_id' }
    );

    if (error) {
      console.error('Error associating video with machine:', error);
      throw error;
    }
  }

  /**
   * Get all machines associated with a YouTube video
   */
  async getMachinesForVideo(
    youtubeVideoId: string
  ): Promise<{ id: string; name: string }[]> {
    const { data, error } = await this.supabase
      .from('machine_videos')
      .select('machines!fk_machine_videos_machine_id("id", "Machine Name")')
      .eq('youtube_video_id', youtubeVideoId);

    if (error) {
      console.error('Error fetching machines for video:', error);
      throw error;
    }

    return data?.map((item: any) => ({
      id: item.machines.id,
      name: item.machines['Machine Name'],
    })) || [];
  }

  /**
   * Save a transcript for a YouTube video
   */
  async saveTranscript(youtubeVideoId: string, content: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('transcripts')
      .insert({
        youtube_video_id: youtubeVideoId,
        content,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }

    // Update video status to transcribed
    await this.updateVideoStatus(youtubeVideoId, 'transcribed');

    return data.id;
  }

  /**
   * Get transcript for a YouTube video
   */
  async getTranscript(youtubeVideoId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('transcripts')
      .select('content')
      .eq('youtube_video_id', youtubeVideoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No transcript found
        return null;
      }
      console.error('Error fetching transcript:', error);
      throw error;
    }

    return data?.content || null;
  }

  /**
   * Save YouTube chapters as metadata in the database
   * This can be attached to a video to use for initial review structure
   */
  async saveChapters(youtubeVideoId: string, chapters: YouTubeChapter[]): Promise<void> {
    const { error } = await this.supabase
      .from('youtube_videos')
      .update({
        chapters: chapters,
        updated_at: new Date().toISOString(),
      })
      .eq('id', youtubeVideoId);

    if (error) {
      console.error('Error saving chapters:', error);
      throw error;
    }
  }
}

export default YouTubeDbService; 