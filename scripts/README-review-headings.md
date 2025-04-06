# Review Headings Conversion Script

This script helps you identify and convert regular paragraph tags (`<p>`) to proper heading tags (`<h2>` and `<h3>`) in machine reviews across your database.

## Problem

The current review content often has section headings as regular paragraphs, which prevents them from receiving proper heading styles when displayed on the website.

## Solution

This interactive script:
1. Scans all machine reviews in the database
2. Identifies paragraphs that are likely to be headings
3. Allows you to choose which ones to convert and to what heading level
4. Generates SQL commands for the conversions
5. Optionally applies the changes directly to the database

## How to Use

### Prerequisites

Make sure you have the required Node.js packages installed:

```bash
npm install dotenv @supabase/supabase-js
```

### Running the Script

1. Navigate to the scripts directory:
   ```bash
   cd scripts
   ```

2. Run the script:
   ```bash
   node convert-review-headings.js
   ```

3. Choose a mode:
   - `a` - Process all reviews at once (generates SQL files but doesn't apply changes unless you confirm)
   - `i` - Interactive mode (review each potential heading one by one)

### Interactive Mode

In interactive mode, for each potential heading, you'll see:
- The text content
- The length in characters
- A prompt to decide what to do:
  - `2` - Convert to an `<h2>` tag (main section heading)
  - `3` - Convert to an `<h3>` tag (subsection heading)
  - `n` - Skip this paragraph (don't convert)
  - `q` - Quit the current analysis
  - Press Enter to use the default suggestion

After each machine is processed, you'll be asked if you want to apply the changes directly to the database.

### Generated Files

The script creates:
- A directory called `sql-fixes` with individual SQL files for each machine
- An `all-review-fixes.sql` file containing all SQL commands
- If using batch mode, an `approved-fixes.sql` file with just the approved changes

## How It Works

1. The script uses regex to find all `<p>` tags in the review content
2. It analyzes the text to determine if it's likely to be a heading based on:
   - Length (short paragraphs are likely headings)
   - Content patterns (like "Features", "Conclusion", etc.)
   - Punctuation (headings typically don't end with periods)
3. It generates SQL to convert the tags, preserving any ID attributes and inner HTML
4. The SQL is saved to files and optionally applied to the database

## Troubleshooting

- If the script fails to connect to the database, check your `.env` file and ensure it has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- If a SQL command fails to execute, it may be due to special characters in the HTML content. Check the SQL file and adjust if needed.

## Manual Verification

After applying changes, it's recommended to check a few reviews on the website to ensure the headings are displaying properly with the styling from the expert-review.tsx component. 