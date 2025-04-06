/**
 * Webflow CSV Import Script
 * 
 * This script imports machine data from a Webflow CSV export file into the Supabase database.
 * It updates existing records based on machine slugs ("Internal link") and then runs the
 * review image migration script to process any images in the review content.
 */

// Required dependencies
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

// Properly handle the CSV path argument
let CSV_PATH;
const csvPathIndex = args.indexOf('--csv-path');
if (csvPathIndex !== -1 && csvPathIndex + 1 < args.length) {
  CSV_PATH = args[csvPathIndex + 1];
} else {
  // Default path to the CSV file in Downloads
  CSV_PATH = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'Machines or Makers Lasers (1).csv');
}

// Create Supabase client with service role key (admin access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Stats for tracking progress
const stats = {
  totalRows: 0,
  updatedRecords: 0,
  newRecords: 0,
  skippedRecords: 0,
  errors: 0,
  reviewsWithImages: 0
};

// Main import function
async function importCsvData() {
  try {
    console.log(`Starting import from CSV file: ${CSV_PATH}`);
    
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`Error: CSV file not found at ${CSV_PATH}`);
      process.exit(1);
    }
    
    if (TEST_MODE) {
      console.log('Running in TEST MODE - No changes will be made to the database');
    }
    
    if (DRY_RUN) {
      console.log('Running in DRY RUN mode - Will show what would be updated but not modify the database');
    }
    
    // Read the CSV file
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_PATH)
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
          stats.totalRows++;
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`Read ${rows.length} rows from the CSV file`);
    
    // Process each row
    for (const row of rows) {
      await processRow(row);
    }
    
    // Final report
    console.log('\n----- Import Summary -----');
    console.log(`Total rows processed: ${stats.totalRows}`);
    console.log(`Records updated: ${stats.updatedRecords}`);
    console.log(`New records created: ${stats.newRecords}`);
    console.log(`Records skipped: ${stats.skippedRecords}`);
    console.log(`Errors encountered: ${stats.errors}`);
    console.log(`Reviews with images: ${stats.reviewsWithImages}`);
    
    if (TEST_MODE || DRY_RUN) {
      console.log('\nThis was a TEST/DRY RUN. No changes were committed to the database.');
    } else {
      console.log('\nImport completed successfully!');
    }
    
    // Run review image migration if needed and not in dry run mode
    if (stats.reviewsWithImages > 0 && !DRY_RUN && !TEST_MODE) {
      console.log('\nFound reviews with images. Running review image migration script...');
      runReviewImageMigration();
    }
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Process a single row from the CSV
async function processRow(row) {
  try {
    const slug = row['Internal link'];
    if (!slug) {
      console.warn('Row missing Internal link (slug), skipping');
      stats.skippedRecords++;
      return;
    }
    
    console.log(`\nProcessing machine: ${row['Machine Name']} (slug: ${slug})`);
    
    // Check if machine already exists in database
    const { data: existingMachines, error: lookupError } = await supabase
      .from('machines')
      .select('id, "Internal link"')
      .eq('Internal link', slug);
    
    if (lookupError) {
      console.error(`Error looking up machine with slug ${slug}:`, lookupError);
      stats.errors++;
      return;
    }
    
    // Checking for images in the review content
    const hasImagesInReview = row['Review'] && row['Review'].includes('<img');
    const hasImagesInBrandonsTake = row["Brandon's Take"] && row["Brandon's Take"].includes('<img');
    
    if (hasImagesInReview || hasImagesInBrandonsTake) {
      stats.reviewsWithImages++;
      console.log(`Found images in review content for ${row['Machine Name']}`);
    }
    
    if (existingMachines && existingMachines.length > 0) {
      // Update existing record
      const existingMachine = existingMachines[0];
      console.log(`Updating existing machine: ${row['Machine Name']} (ID: ${existingMachine.id})`);
      
      if (VERBOSE) {
        console.log('Existing data:', existingMachine);
        console.log('New data (partial):', {
          'Machine Name': row['Machine Name'],
          'Review': row['Review'] ? `${row['Review'].substring(0, 100)}...` : null,
          "Brandon's Take": row["Brandon's Take"] ? `${row["Brandon's Take"].substring(0, 100)}...` : null
        });
      }
      
      if (!TEST_MODE && !DRY_RUN) {
        const { error: updateError } = await supabase
          .from('machines')
          .update(row)
          .eq('id', existingMachine.id);
        
        if (updateError) {
          console.error(`Error updating machine ${existingMachine.id}:`, updateError);
          stats.errors++;
          return;
        }
        
        console.log(`Updated machine record: ${existingMachine.id}`);
        stats.updatedRecords++;
      } else {
        console.log(`TEST/DRY RUN: Would update machine record: ${existingMachine.id}`);
        stats.updatedRecords++;
      }
    } else {
      // Create new record
      console.log(`Creating new machine: ${row['Machine Name']}`);
      
      if (!TEST_MODE && !DRY_RUN) {
        const { data: newMachine, error: createError } = await supabase
          .from('machines')
          .insert(row)
          .select();
        
        if (createError) {
          console.error(`Error creating machine record for ${row['Machine Name']}:`, createError);
          stats.errors++;
          return;
        }
        
        console.log(`Created new machine record: ${newMachine[0].id}`);
        stats.newRecords++;
      } else {
        console.log(`TEST/DRY RUN: Would create new machine record for ${row['Machine Name']}`);
        stats.newRecords++;
      }
    }
  } catch (error) {
    console.error(`Error processing row for ${row['Machine Name']}:`, error);
    stats.errors++;
  }
}

// Run the review image migration script
function runReviewImageMigration() {
  try {
    console.log('Executing review image migration script...');
    const scriptPath = path.join(__dirname, 'migrate-review-images.js');
    
    // Execute the script and capture output
    const output = execSync(`node ${scriptPath}`, { encoding: 'utf8' });
    console.log(output);
    
    console.log('Review image migration completed successfully!');
  } catch (error) {
    console.error('Error running review image migration script:', error);
  }
}

// Display usage information if --help is specified
if (args.includes('--help')) {
  console.log(`
Webflow CSV Import Script
-------------------------

Usage: node import-webflow-csv.js [options]

Options:
  --test               Run in test mode without committing changes
  --dry-run            Show what would be updated but don't modify the database
  --verbose            Display more detailed logs
  --csv-path <path>    Path to the CSV file (default: ~/Downloads/Machines or Makers Lasers (1).csv)
  --help               Display this help message

Examples:
  node import-webflow-csv.js                     Run the full import
  node import-webflow-csv.js --test              Test the import without making changes
  node import-webflow-csv.js --csv-path ./my-data.csv  Use a specific CSV file
  `);
  process.exit(0);
}

// Run the script
importCsvData(); 