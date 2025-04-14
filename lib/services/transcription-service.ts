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
import youtubeDl from 'youtube-dl-exec';
import ytDlpModule from 'yt-dlp-exec';

// Properly type the ytDlp module with create method
const ytDlp = ytDlpModule as typeof ytDlpModule & { create: (binaryPath: string) => typeof ytDlpModule };

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
        console.log('Found existing transcript:', existingTranscript.id);
        return { 
          transcriptId: existingTranscript.id,
          content: existingTranscript.content 
        };
      }

      // Get video information
      const video = await this.youtubeDbService.getVideo(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      console.log(`Generating transcript for video: ${video.title} (${video.youtube_id})`);

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
   * Force regenerate a transcript for a YouTube video, even if one already exists
   */
  async regenerateTranscript(videoId: string): Promise<{ transcriptId: string, content: string }> {
    try {
      // Get video information
      const video = await this.youtubeDbService.getVideo(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      console.log(`Regenerating transcript for video: ${video.title} (${video.youtube_id})`);

      // Get the audio URL
      const audioUrl = await this.youtubeService.getVideoAudioUrl(video.youtube_id);
      
      // Call OpenAI Whisper API
      const openaiResponse = await this.callWhisperApi(audioUrl, video.youtube_id);
      const transcriptContent = openaiResponse.text;
      
      // First delete existing transcript if any
      await this.youtubeDbService.deleteTranscript(videoId);
      
      // Save new transcript to database
      const transcriptId = await this.youtubeDbService.saveTranscript(videoId, transcriptContent);
      
      return {
        transcriptId,
        content: transcriptContent
      };
    } catch (error) {
      console.error('Error regenerating transcript:', error);
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
      
      // Download audio from YouTube with improved error handling
      try {
        // Direct YouTube URL format
        const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
        console.log(`Using YouTube URL: ${youtubeUrl}`);
        
        // Add retry logic for downloads
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`Download attempt ${attempt}/${maxRetries} with ytdl-core...`);
            
            // First attempt: Using ytdl-core with advanced options
            const videoStream = ytdl(youtubeUrl, { 
              quality: 'highestaudio',
              filter: 'audioonly',
              highWaterMark: 1024 * 1024 * 10, // 10MB buffer
              requestOptions: {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                  'Accept': '*/*',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Origin': 'https://www.youtube.com',
                  'Referer': 'https://www.youtube.com/'
                }
              }
            });
            
            // Add error event handling for the stream
            videoStream.on('error', (err) => {
              console.error(`Video stream error on attempt ${attempt}:`, err);
            });
            
            videoStream.on('info', (info, format) => {
              console.log(`Video info received on attempt ${attempt}:`, format.audioBitrate, format.container);
            });
            
            const writeStream = fs.createWriteStream(audioFilePath);
            writeStream.on('error', (err) => {
              console.error(`Write stream error on attempt ${attempt}:`, err);
            });
            
            // Use pipeline for proper error handling and cleanup
            await pipeline(videoStream, writeStream);
            
            console.log(`Audio download complete with ytdl-core on attempt ${attempt}`);
            
            // If we got here, download succeeded, break out of retry loop
            break;
          } catch (ytdlErr) {
            lastError = ytdlErr;
            console.error(`ytdl-core download failed on attempt ${attempt}:`, ytdlErr);
            
            // Delete partially downloaded file if it exists
            try {
              if (fs.existsSync(audioFilePath)) {
                await fsPromises.unlink(audioFilePath);
                console.log(`Deleted partial file after failed attempt ${attempt}`);
              }
            } catch (cleanupErr) {
              console.warn(`Could not delete partial file: ${cleanupErr}`);
            }
            
            // If we've tried all ytdl-core attempts, fall back to yt-dlp as primary fallback
            if (attempt === maxRetries) {
              console.log('All ytdl-core attempts failed, trying yt-dlp as primary fallback');
              
              // Try multiple youtube-dl configurations
              try {
                // Try download with yt-dlp first (more modern)
                console.log('Trying yt-dlp-exec with global binary...');
                
                // Use the globally installed yt-dlp
                const ytDlpPath = '/opt/homebrew/bin/yt-dlp';
                // Create a new instance of yt-dlp with the global binary path
                const ytDlpGlobal = ytDlp.create(ytDlpPath);
                
                await ytDlpGlobal(youtubeUrl, {
                  extractAudio: true,
                  audioFormat: 'mp3',
                  audioQuality: 0,
                  output: audioFilePath,
                  noCheckCertificate: true,
                  noWarnings: true,
                  preferFreeFormats: true,
                  addHeader: 'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                  forceIpv4: true,
                  noPlaylist: true,
                  retries: 3,
                  format: 'bestaudio/best'
                });
                
                console.log('Audio download complete with yt-dlp-exec');
                
                // Verify file exists and has content
                const stats = await fsPromises.stat(audioFilePath);
                if (stats.size === 0) {
                  throw new Error('Downloaded file is empty');
                }
                
                break; // Success, exit the retry loop
              } catch (ytDlpErr: any) {
                console.error('yt-dlp-exec download failed, trying youtube-dl-exec as secondary fallback:', ytDlpErr);
                
                try {
                  console.log('Trying youtube-dl-exec with extended options...');
                  
                  await youtubeDl(youtubeUrl, {
                    extractAudio: true,
                    audioFormat: 'mp3',
                    audioQuality: 0, 
                    output: audioFilePath,
                    noCheckCertificates: true,
                    noWarnings: true,
                    preferFreeFormats: true,
                    addHeader: [
                      'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                      'Accept:*/*',
                      'Origin:https://www.youtube.com',
                      'Referer:https://www.youtube.com/'
                    ],
                    forceIpv4: true,
                    noPlaylist: true,
                    retries: 3,
                    youtubeSkipDashManifest: true,
                    format: 'bestaudio/best'
                  });
                  
                  console.log('Audio download complete with youtube-dl-exec');
                  
                  // Verify file exists and has content
                  const stats = await fsPromises.stat(audioFilePath);
                  if (stats.size === 0) {
                    throw new Error('Downloaded file is empty');
                  }
                  
                  break; // Success, exit the retry loop
                } catch (youtubeDlErr: any) {
                  console.error('All download methods failed:', youtubeDlErr);
                  throw new Error(`All download methods failed. YouTube may be blocking downloads: ${youtubeDlErr.message}`);
                }
              }
            } else {
              // Not the last attempt yet for ytdl-core, add exponential backoff
              const backoffTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
              console.log(`Retrying ytdl-core download in ${backoffTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
          }
        }
        
        // If we tried all retries and still have an error, throw it
        if (lastError && !fs.existsSync(audioFilePath)) {
          throw lastError;
        }
      } catch (err: any) {
        console.error('Error downloading audio after all attempts:', err);
        // Create a more descriptive error message
        let errorMessage = `Failed to download audio: ${err.message}`;
        if (err.message?.includes('functions') || err.message?.includes('extract')) {
          errorMessage = 'YouTube download failed. This may be due to YouTube restrictions or a temporary issue.';
        }
        throw new Error(errorMessage);
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
          response_format: 'verbose_json'
        });
        
        console.log('Transcription complete');
        
        // Clean up temp file
        try {
          await fsPromises.unlink(audioFilePath);
          console.log('Temporary audio file deleted');
        } catch (err: any) {
          console.warn('Could not delete temporary file:', err);
        }
        
        // Format the response with timestamps
        const formattedText = this.formatTranscriptWithTimestamps(transcription);
        
        return { text: formattedText };
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

  private formatTranscriptWithTimestamps(transcription: any): string {
    if (!transcription || !transcription.segments) {
      return transcription.text || '';
    }

    // Format each segment with its timestamp
    const formattedSegments = transcription.segments.map((segment: any) => {
      // Format timestamp as [MM:SS.ms]
      const startTimeInSeconds = segment.start;
      const minutes = Math.floor(startTimeInSeconds / 60);
      const seconds = Math.floor(startTimeInSeconds % 60);
      const milliseconds = Math.floor((startTimeInSeconds % 1) * 1000);
      
      const formattedTime = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}]`;
      
      return `${formattedTime} ${segment.text}`;
    });

    // Join all segments with newlines
    return formattedSegments.join('\n');
  }
}

export default TranscriptionService; 