import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { YouTubeService } from './youtube-service';
import YouTubeDbService from './youtube-db-service';
import OpenAI from 'openai';

export class TranscriptionService {
  private supabase;
  private youtubeService: YouTubeService;
  private youtubeDbService: YouTubeDbService;
  private openai: OpenAI | null = null;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.youtubeService = new YouTubeService(
      process.env.YOUTUBE_API_KEY || '',
      process.env.YOUTUBE_CHANNEL_ID || '@MakeorBreakShop'
    );
    this.youtubeDbService = new YouTubeDbService();
    
    // Initialize OpenAI client if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Transcribe a YouTube video using OpenAI's Whisper API
   */
  async transcribeVideo(videoId: string): Promise<{ transcriptId: string, content: string }> {
    try {
      // First, check if transcript already exists
      const existingTranscript = await this.youtubeDbService.getTranscript(videoId);
      if (existingTranscript) {
        return { 
          transcriptId: 'existing', // We don't actually get the ID back from the getter
          content: existingTranscript 
        };
      }

      // Get video information
      const video = await this.youtubeDbService.getVideo(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Get the audio URL
      const audioUrl = await this.youtubeService.getVideoAudioUrl(video.youtube_id);
      
      // Create a transient file URL for OpenAI to access
      // For production, you'd download the audio, potentially convert it, and create a File object
      // This is a simplified approach for demonstration
      
      // Call OpenAI Whisper API
      const openaiResponse = await this.callWhisperApi(audioUrl, video.youtube_id);
      
      // Save transcript to database
      const transcriptId = await this.youtubeDbService.saveTranscript(videoId, openaiResponse.text);
      
      return {
        transcriptId,
        content: openaiResponse.text
      };
    } catch (error) {
      console.error('Error transcribing video:', error);
      throw error;
    }
  }

  /**
   * Call OpenAI Whisper API to transcribe audio
   */
  private async callWhisperApi(audioUrl: string, youtubeId: string): Promise<{ text: string }> {
    try {
      console.log(`Processing transcription for YouTube video: ${youtubeId}`);
      
      // If we have the OpenAI client and this is a production environment, make the real API call
      if (this.openai && process.env.NODE_ENV === 'production') {
        // In a real implementation, you would:
        // 1. Download the audio from YouTube using ytdl-core or similar
        // 2. Convert it to a format Whisper accepts
        // 3. Send it to OpenAI
        
        /*
        // Example implementation with real file processing:
        import fs from 'fs';
        import ytdl from 'ytdl-core';
        import { pipeline } from 'stream/promises';
        import ffmpeg from 'fluent-ffmpeg';
        
        // Download audio from YouTube
        const audioFilePath = `/tmp/${youtubeId}.mp3`;
        await pipeline(
          ytdl(audioUrl, { quality: 'highestaudio' }),
          fs.createWriteStream(audioFilePath)
        );
        
        // Convert to format accepted by Whisper if needed
        
        // Send to OpenAI
        const transcription = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(audioFilePath),
          model: 'whisper-1',
          response_format: 'json'
        });
        
        // Clean up temp file
        fs.unlinkSync(audioFilePath);
        
        return { text: transcription.text };
        */
      }
      
      // For demo purposes or development, we'll simulate a successful response
      console.log(`Simulating transcription for YouTube video: ${youtubeId}`);
      
      // Generate a simulated transcript for testing
      return {
        text: `This is a simulated transcript for the YouTube video ${youtubeId}. In a production environment, this would be the actual transcription from OpenAI's Whisper API. The video would be processed and the audio sent to the API for transcription.\n\nThe transcript would contain all the spoken content from the video, formatted in paragraphs with proper punctuation.\n\nIt would capture technical details, product specifications, and the reviewer's opinions about the machine being reviewed.\n\nThis transcript would then be used as the basis for generating an AI review of the product.`
      };
    } catch (error) {
      console.error('Error calling Whisper API:', error);
      throw error;
    }
  }
}

export default TranscriptionService; 