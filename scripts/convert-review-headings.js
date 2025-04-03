// convert-review-headings.js
// Script to analyze each machine review and convert paragraph tags to proper heading tags

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables from parent directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing required environment variables.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are defined in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for confirmation
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer));
  });
}

// Function to analyze review content and identify potential headings
async function analyzeReviews() {
  console.log('Starting review heading analysis...');
  
  // Ask if user wants to process all at once or one by one
  const mode = await askQuestion('Do you want to process all reviews at once (a) or go through each one individually (i)? ');
  const interactive = mode.toLowerCase() === 'i';
  
  // Get all machines with review or brandon's take content
  const { data: machines, error } = await supabase
    .from('machines')
    .select('id, "Machine Name", "Review", "Brandon\'s Take"')
    .or('Review.neq.null,Brandon\'s Take.neq.null');

  if (error) {
    console.error('Error fetching machines:', error);
    return;
  }

  console.log(`Found ${machines.length} machines with review content.`);

  // Directory for SQL files
  const sqlDir = path.join(__dirname, 'sql-fixes');
  if (!fs.existsSync(sqlDir)) {
    fs.mkdirSync(sqlDir);
  }

  // Generate a SQL file with all commands
  const allSqlPath = path.join(sqlDir, 'all-review-fixes.sql');
  fs.writeFileSync(allSqlPath, '-- Auto-generated SQL commands to fix review headings\n\n');

  // SQL for applying changes directly
  let approvedSql = [];

  for (const machine of machines) {
    const machineName = machine['Machine Name'];
    const machineId = machine.id;
    console.log(`\nAnalyzing: ${machineName}`);

    // Analyze review content
    if (machine.Review) {
      const contentType = 'Review';
      const reviewSql = await analyzeContent(
        machineId, 
        machineName, 
        contentType, 
        machine.Review, 
        sqlDir, 
        allSqlPath, 
        interactive
      );
      if (reviewSql && reviewSql.length > 0) {
        approvedSql = approvedSql.concat(reviewSql);
        
        // If in interactive mode, offer to apply changes directly
        if (interactive) {
          const apply = await askQuestion(`Apply these ${contentType} changes to the database now? (y/n) `);
          if (apply.toLowerCase() === 'y') {
            console.log(`SQL commands for ${contentType} saved to files in ${sqlDir}`);
            console.log('Please apply these changes using the Supabase SQL editor or a database client.');
          }
        }
      }
    }

    // Analyze brandon's take content
    if (machine['Brandon\'s Take']) {
      const contentType = 'Brandon\'s Take';
      const takesSql = await analyzeContent(
        machineId, 
        machineName, 
        contentType, 
        machine['Brandon\'s Take'], 
        sqlDir, 
        allSqlPath, 
        interactive
      );
      if (takesSql && takesSql.length > 0) {
        approvedSql = approvedSql.concat(takesSql);
        
        // If in interactive mode, offer to apply changes directly
        if (interactive) {
          const apply = await askQuestion(`Apply these ${contentType} changes to the database now? (y/n) `);
          if (apply.toLowerCase() === 'y') {
            console.log(`SQL commands for ${contentType} saved to files in ${sqlDir}`);
            console.log('Please apply these changes using the Supabase SQL editor or a database client.');
          }
        }
      }
    }
  }

  // If there are still approved SQL statements and not in interactive mode
  if (!interactive && approvedSql.length > 0) {
    const approvedSqlPath = path.join(sqlDir, 'approved-fixes.sql');
    fs.writeFileSync(approvedSqlPath, approvedSql.join('\n\n'));
    console.log(`Approved SQL commands saved to: ${approvedSqlPath}`);
    
    const apply = await askQuestion('Apply all approved changes to the database now? (y/n) ');
    if (apply.toLowerCase() === 'y') {
      console.log('SQL execution through Supabase JS client is limited.');
      console.log('The SQL commands have been saved to files. Please run them using:');
      console.log('1. The Supabase dashboard SQL editor');
      console.log('2. A database client like pgAdmin or DBeaver');
      console.log(`3. Manual updates through your application's admin interface`);
    }
  }

  console.log(`\nAnalysis complete! SQL files have been generated in ${sqlDir}`);
  console.log(`All SQL commands combined in: ${allSqlPath}`);
  rl.close();
}

// Function to analyze content and generate SQL for a specific machine and content type
async function analyzeContent(machineId, machineName, contentType, content, sqlDir, allSqlPath, interactive) {
  console.log(`  Analyzing ${contentType}...`);

  // Extract all paragraph tags with HTML content
  const paragraphRegex = /<p(?:\s+id="(.*?)")?>(.+?)<\/p>/gs;
  const paragraphs = [];
  let match;

  while ((match = paragraphRegex.exec(content)) !== null) {
    const text = match[2]
      .replace(/<.*?>/g, '') // Remove HTML tags inside paragraph
      .trim();
    
    paragraphs.push({
      fullMatch: match[0],
      id: match[1] || '',
      htmlContent: match[2],
      text: text,
      isPotentialHeading: isPotentialHeading(text)
    });
  }

  // Filter to potential headings
  const potentialHeadings = paragraphs.filter(p => p.isPotentialHeading);
  
  if (potentialHeadings.length === 0) {
    console.log(`  No potential headings found in ${contentType}`);
    return [];
  }

  console.log(`  Found ${potentialHeadings.length} potential headings in ${contentType}`);

  // Generate SQL commands
  let sqlCommands = `-- ${machineName} - ${contentType} fixes\n`;
  let approvedSql = [];
  
  for (let i = 0; i < potentialHeadings.length; i++) {
    const heading = potentialHeadings[i];
    
    // Default to h2 for most headings, but suggest h3 for longer ones
    let headingTag = 'h2';
    if (heading.text.length > 60) {
      headingTag = 'h3';
    }
    
    if (interactive) {
      console.log(`\n  Potential heading (${i+1}/${potentialHeadings.length}):`);
      console.log(`  Text: "${heading.text}"`);
      console.log(`  Length: ${heading.text.length} characters`);
      
      // Offer options
      const response = await askQuestion(`  Convert to heading? (2=h2, 3=h3, n=no, q=quit) [${headingTag === 'h2' ? '2' : '3'}]: `);
      
      if (response.toLowerCase() === 'q') {
        console.log('  Quitting analysis...');
        return approvedSql;
      }
      
      if (response === '2') {
        headingTag = 'h2';
      } else if (response === '3') {
        headingTag = 'h3';
      } else if (response.toLowerCase() === 'n') {
        console.log('  Skipping this heading.');
        continue;
      } else if (response.trim() === '') {
        // Use default
      } else {
        console.log('  Invalid input, using default.');
      }
    }
    
    // Create new tag replacement
    let newTag;
    if (heading.id) {
      newTag = `<${headingTag} id="${heading.id}">${heading.htmlContent}</${headingTag}>`;
    } else {
      newTag = `<${headingTag}>${heading.htmlContent}</${headingTag}>`;
    }
    
    // Escape for SQL
    const escapedMatch = heading.fullMatch.replace(/'/g, "''");
    const escapedNewTag = newTag.replace(/'/g, "''");
    
    // Create SQL statement
    const sql = `UPDATE machines SET "${contentType}" = REPLACE("${contentType}", '${escapedMatch}', '${escapedNewTag}') WHERE id = '${machineId}';`;
    
    sqlCommands += sql + '\n';
    
    if (interactive) {
      console.log(`  Converting to <${headingTag}> tag.`);
      approvedSql.push(sql);
    } else {
      approvedSql.push(sql);
    }
  }

  // Write to machine-specific file
  const safeFileName = machineName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filePath = path.join(sqlDir, `${safeFileName}-${contentType.toLowerCase()}.sql`);
  fs.writeFileSync(filePath, sqlCommands);

  // Append to all-sql file
  fs.appendFileSync(allSqlPath, sqlCommands + '\n');

  console.log(`  SQL commands written to: ${filePath}`);
  
  return approvedSql;
}

// Function to determine if a paragraph is likely a heading
function isPotentialHeading(text) {
  text = text.trim();
  
  // If it's very short, it's likely a heading
  if (text.length < 60 && text.length > 3) return true;
  
  // Common heading patterns
  const headingPatterns = [
    /^(unboxing|design|features|performance|software|connectivity|comparison|pricing|conclusion|specifications|overview|final thoughts|setup|usability)/i,
    /^(why|how|what|the best|top \d+)/i,
    /^.+ (features|overview|review|performance|comparison|vs\.?|or|versus)/i,
    /^.+ (pros|cons|benefits|drawbacks|advantages|disadvantages)/i,
    /^(pros|cons|benefits|drawbacks|advantages|disadvantages)( and | & |: )/i
  ];
  
  // Check if text ends with common punctuation that's NOT typical of headings
  if (text.endsWith('.') || text.endsWith('!') || text.endsWith('?')) {
    // If it's a short sentence ending with punctuation, it could still be a heading
    if (text.length < 40) return true;
    
    // Longer text with punctuation is less likely to be a heading
    return headingPatterns.some(pattern => pattern.test(text));
  }
  
  // No ending punctuation makes it more likely to be a heading
  return text.length < 100 || headingPatterns.some(pattern => pattern.test(text));
}

// Main execution
analyzeReviews().catch(err => {
  console.error('Error running script:', err);
  rl.close();
}); 