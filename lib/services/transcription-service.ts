import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { YouTubeService } from './youtube-service';
import YouTubeDbService from './youtube-db-service';
import OpenAI from 'openai';
import fs from 'fs';
import ytdl from 'ytdl-core';
import { pipeline } from 'stream/promises';
import path from 'path';
import { promises as fsPromises } from 'fs';
import * as os from 'os';

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
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
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
      
      // Create temporary directory if it doesn't exist
      const tmpDir = path.join(os.tmpdir(), 'youtube-transcription');
      try {
        await fsPromises.mkdir(tmpDir, { recursive: true });
      } catch (err: any) {
        console.log('Temp directory already exists or cannot be created');
      }
      
      // Set up file paths
      const audioFilePath = path.join(tmpDir, `${youtubeId}.mp3`);
      
      console.log(`Downloading audio to ${audioFilePath}`);
      
      // Download audio from YouTube
      try {
        const videoStream = ytdl(audioUrl, { 
          quality: 'highestaudio',
          filter: 'audioonly'
        });
        
        const writeStream = fs.createWriteStream(audioFilePath);
        
        // Use pipeline for proper error handling and cleanup
        await pipeline(videoStream, writeStream);
        
        console.log('Audio download complete');
      } catch (err: any) {
        console.error('Error downloading audio:', err);
        throw new Error(`Failed to download audio: ${err.message}`);
      }
      
      // Send to OpenAI
      try {
        console.log('Sending to OpenAI Whisper API');
        
        if (!this.openai) {
          throw new Error('OpenAI client not initialized - API key missing');
        }
        
        const fileStream = fs.createReadStream(audioFilePath);
        const fileName = path.basename(audioFilePath);
        
        // Create a transcription with OpenAI
        const transcription = await this.openai.audio.transcriptions.create({
          file: fileStream,
          model: 'whisper-1',
          response_format: 'text'
        });
        
        console.log('Transcription complete');
        
        // Clean up temp file
        try {
          await fsPromises.unlink(audioFilePath);
          console.log('Temporary audio file deleted');
        } catch (err: any) {
          console.warn('Could not delete temporary file:', err);
        }
        
        return { text: transcription };
      } catch (err: any) {
        console.error('Error with OpenAI transcription:', err);
        
        // Clean up temp file even if transcription fails
        try {
          await fsPromises.unlink(audioFilePath);
        } catch (cleanupErr: any) {
          console.warn('Could not delete temporary file during error cleanup:', cleanupErr);
        }
        
        throw new Error(`OpenAI transcription failed: ${err.message}`);
      }
    } catch (error: any) {
      console.error('Error in transcription process:', error);
      throw error;
    }
  }
}

export default TranscriptionService; 