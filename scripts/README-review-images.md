# Review Images Migration Script

This script migrates images from Webflow CDN to Supabase storage for product reviews. It performs the following tasks:

1. Finds machines with reviews containing `<img>` tags (in either "Review" or "Brandon's Take" fields)
2. For each image:
   - Extracts the source URL and alt text
   - Downloads the image from Webflow CDN
   - Optimizes it (resizes if larger than 1200px, converts to WebP format)
   - Uploads to Supabase storage with a unique name
   - Creates a record in the `images` table
   - Replaces the original image URL in the HTML with the new Supabase URL
3. Updates the machine's record with the modified HTML content

## Prerequisites

Before running the script, make sure you have:

1. Node.js installed (v14 or later recommended)
2. Supabase project set up with:
   - `machines` table containing reviews
   - `images` table set up with the correct schema
   - `images` storage bucket created
3. Environment variables in `.env` file:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (admin access)

## Required Dependencies

Install the following dependencies:

```bash
npm install @supabase/supabase-js cheerio sharp node-fetch uuid dotenv
```

## Running the Script

The script supports several command-line options:

```bash
# Run the full migration
node migrate-review-images.js

# Run in test mode (processes only one machine without committing changes)
node migrate-review-images.js --test

# Test with a specific machine ID
node migrate-review-images.js --test --machine-id <UUID>

# Show more detailed logs
node migrate-review-images.js --verbose

# Display help information
node migrate-review-images.js --help
```

## Features

The script includes several advanced features:

1. **Test Mode**: Run without committing changes to verify functionality
2. **Source Type Tracking**: Images are labeled as either `"review"` or `"brandons-take"` in the database
3. **Sort Order Preservation**: Images maintain their original order in the review content
4. **Source ID Tracking**: Associates images with specific sections of content
5. **Image Optimization**: Resizes large images and converts all to WebP format
6. **Comprehensive Error Handling**: Continues processing even if individual images fail

## Database Integration

The script creates records in the `images` table with the following fields:

- `id`: A unique UUID for the image record
- `machine_id`: Reference to the machine the image belongs to
- `url`: The public URL to the Supabase-hosted image
- `alt_text`: Alternative text extracted from the original image tag
- `source_type`: Either `"review"` or `"brandons-take"` to indicate the source
- `source_id`: A unique identifier for the content section
- `sort_order`: The position of the image in the content
- `created_at`: Timestamp of when the record was created

## Monitoring Progress

The script outputs detailed logs during execution:
- Which machines are being processed
- Image downloads and optimizations
- Database updates
- Error information if any

## Error Handling

The script includes error handling to:
- Skip images that can't be processed
- Continue to the next machine if one fails
- Report errors in the final summary
- Clean up temporary files even if errors occur

## Post-Migration Tasks

After running the script:
1. Verify that images are displaying correctly in reviews
2. Check the Supabase storage bucket to ensure images were uploaded
3. Review the database to confirm new image records
4. Consider backing up the Webflow CDN images as a precaution

## Troubleshooting

If you encounter issues:

- Check the console output for specific error messages
- Verify Supabase credentials and permissions
- Ensure the storage bucket exists and is accessible
- Check network connectivity for downloading images from Webflow
- Try running in test mode with a specific machine ID to isolate issues
