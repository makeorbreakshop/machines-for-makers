import sharp from 'sharp';
import path from 'path';

interface OptimizeImageResult {
  optimizedBuffer: Buffer;
  optimizedFileName: string;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
  processingInfo: {
    resized: boolean;
    format: string;
  };
}

/**
 * Optimizes an image buffer using Sharp.
 * Resizes if wider than 1200px, converts to WebP, and generates a unique filename.
 * @param buffer The original image buffer.
 * @param originalFileName The original filename to base the new name on.
 * @returns An object containing the optimized buffer, filename, dimensions, and processing info.
 */
export async function optimizeImage(buffer: Buffer, originalFileName: string): Promise<OptimizeImageResult> {
  let originalWidth = 0;
  let originalHeight = 0;
  let optimizedWidth = 0;
  let optimizedHeight = 0;
  let optimizedBuffer: Buffer;
  const processingInfo = {
    resized: false,
    format: 'unknown',
  };

  try {
    const originalMetadata = await sharp(buffer).metadata();
    originalWidth = originalMetadata.width || 0;
    originalHeight = originalMetadata.height || 0;
    processingInfo.format = originalMetadata.format || 'unknown';
    console.log(`Original dimensions: ${originalWidth}x${originalHeight}, Format: ${processingInfo.format}`);
  } catch (err) {
    console.error("Error reading image metadata:", err);
    // Use default dimensions if metadata reading fails
  }

  try {
    const sharpInstance = sharp(buffer);

    if (originalWidth > 1200) {
      sharpInstance.resize({ width: 1200, withoutEnlargement: true });
      processingInfo.resized = true;
      console.log('Image resized to max 1200px width.');
    }

    optimizedBuffer = await sharpInstance
      .webp({ quality: 80, effort: 4 }) // Effort 4 is a good balance
      .toBuffer();

    const optimizedMetadata = await sharp(optimizedBuffer).metadata();
    optimizedWidth = optimizedMetadata.width || originalWidth; // Fallback if metadata fails
    optimizedHeight = optimizedMetadata.height || originalHeight; // Fallback
    processingInfo.format = 'image/webp';
    console.log(`Image optimized successfully to ${optimizedWidth}x${optimizedHeight} WebP`);

  } catch (err) {
    console.error("Image optimization failed:", err);
    // If optimization fails, fall back to the original buffer
    optimizedBuffer = buffer;
    optimizedWidth = originalWidth;
    optimizedHeight = originalHeight;
    // Keep original format info if optimization failed
  }

  const timestamp = Date.now();
  const fileNameWithoutExt = path.parse(originalFileName).name;
  const sanitizedFileName = fileNameWithoutExt
    .replace(/[^a-z0-9_\-]/gi, '_') // Allow underscores and hyphens
    .toLowerCase()
    .substring(0, 100); // Limit length
  
  const optimizedFileName = `${sanitizedFileName}_${timestamp}.webp`;

  return {
    optimizedBuffer,
    optimizedFileName,
    originalWidth,
    originalHeight,
    optimizedWidth,
    optimizedHeight,
    processingInfo
  };
}

/**
 * Ensures a folder exists in Supabase storage by uploading a placeholder file if needed.
 * @param supabase Supabase client instance.
 * @param bucketName The name of the bucket.
 * @param folderPath The path of the folder to check/create.
 */
export async function ensureSupabaseFolderExists(supabase: any, bucketName: string, folderPath: string): Promise<void> {
    if (!folderPath || folderPath === '/') return; // Don't create root or empty folder path
    
    try {
        // Check if folder exists by trying to list its contents (limit 1 for efficiency)
        const { data: folderContents, error: listError } = await supabase.storage
            .from(bucketName)
            .list(folderPath, { limit: 1 });

        // If listing is successful and folder is not empty, it exists
        if (!listError && folderContents && folderContents.length >= 0) {
            // console.log(`Folder "${folderPath}" already exists.`);
            return; // Folder exists
        }
        
        // Handle specific error indicating the folder doesn't exist
        // Supabase might return an error or an empty array if the folder doesn't exist
        if (listError && listError.message.includes("The resource was not found")) {
             console.log(`Folder "${folderPath}" doesn't exist. Creating...`);
        } else if (!listError && (!folderContents || folderContents.length === 0)) {
             console.log(`Folder "${folderPath}" appears empty or doesn't exist. Creating placeholder...`);
        } else if (listError) {
            // Log other unexpected errors but attempt creation anyway
            console.error(`Error checking folder "${folderPath}":`, listError.message);
        }
        
        // Create an empty .placeholder file to ensure the folder path is registered
        const placeholderFileName = `.placeholder_${Date.now()}`;
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(`${folderPath}/${placeholderFileName}`, new Blob([]), { // Use Blob for empty file
                contentType: 'application/octet-stream',
                upsert: false, // Don't overwrite existing placeholders unnecessarily
            });

        if (uploadError) {
            // Log error but don't necessarily fail the main upload
            console.error(`Error creating placeholder in folder "${folderPath}":`, uploadError.message);
        } else {
             console.log(`Placeholder created in folder "${folderPath}".`);
        }

    } catch (err: any) {
        console.error(`Error during folder check/creation for "${folderPath}":`, err.message);
        // Continue anyway, the main upload might still work
    }
} 