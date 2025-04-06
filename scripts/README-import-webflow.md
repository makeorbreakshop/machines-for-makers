# Webflow CSV Import Tool

This tool imports data from a Webflow CSV export into the Supabase database, and then runs the review images migration script to handle any embedded images in the review content.

## How It Works

1. The script reads a CSV file exported from Webflow, which contains machine data including review content with image references
2. For each row in the CSV, the script:
   - Looks up the machine by slug/internal link
   - Updates the existing record or creates a new one
   - Checks if the review or Brandon's Take contains image references
3. After importing all data, if any reviews with images are found, the script automatically runs the review image migration tool
4. The review image migration will:
   - Extract all images from the review content
   - Download each image from Webflow
   - Optimize and convert images to WebP format
   - Upload images to Supabase storage
   - Update the image references in the review HTML
   - Create records in the images table

## Requirements

- Node.js 16 or higher
- Supabase project with access to the service role key
- CSV file exported from Webflow

## Setup

1. Ensure you have all the necessary dependencies installed:
   ```bash
   cd scripts
   npm install csv-parser @supabase/supabase-js dotenv uuid sharp cheerio node-fetch
   ```

2. Make sure you have a `.env` file in the scripts directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Usage

```bash
# Run a dry run to see what would be updated without making changes
node import-webflow-csv.js --dry-run

# Run in test mode for more detailed output without making changes
node import-webflow-csv.js --test

# Import from a specific CSV file
node import-webflow-csv.js --csv-path /path/to/your/file.csv

# Run with verbose output for debugging
node import-webflow-csv.js --verbose

# Actually import the data and process images
node import-webflow-csv.js
```

## Example Workflow

1. Export the machines data from Webflow as a CSV
2. Save the CSV file to your Downloads folder (the default location the script looks for)
3. Run the script with dry run first to check what would be updated:
   ```bash
   node import-webflow-csv.js --dry-run
   ```
4. If everything looks good, run the actual import:
   ```bash
   node import-webflow-csv.js
   ```
5. The script will automatically run the review image migration if it finds reviews with images

## Troubleshooting

If you encounter any issues:

1. Run with the `--verbose` flag to see more detailed output
2. Check the console for specific error messages
3. Make sure your Supabase credentials are correct in the .env file
4. Verify the CSV format matches what the script expects 

## Warning

This script will update existing records in your database based on the CSV data. It's recommended to make a backup of your database before running the import on production data. 