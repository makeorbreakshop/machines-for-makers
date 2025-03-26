// Apply Supabase migrations script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Check for required environment variables
const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables. Please check your .env.local file.');
  process.exit(1);
}

// Function to apply a SQL file to Supabase
async function applySqlFile(filePath) {
  try {
    console.log(`Applying SQL migration: ${path.basename(filePath)}`);
    
    // Read SQL file content
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the SQL using the Supabase REST API
    const url = `${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
    
    // Using curl for simplicity
    const command = `
      curl -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \\
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \\
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \\
      -H "Content-Type: application/json" \\
      -d '{"sql": ${JSON.stringify(sql)}}'
    `;
    
    // Execute command
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ Successfully applied ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error applying ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// Main function to apply all migrations
async function applyMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found.');
    process.exit(1);
  }
  
  // Get all SQL files in the migrations directory
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(migrationsDir, file))
    .sort(); // Apply in alphabetical order
  
  console.log(`Found ${migrationFiles.length} migration files.`);
  
  // Apply each migration
  let successCount = 0;
  for (const file of migrationFiles) {
    const success = await applySqlFile(file);
    if (success) successCount++;
  }
  
  console.log(`\nMigration summary: ${successCount}/${migrationFiles.length} migrations applied successfully.`);
}

// Run the migrations
applyMigrations().catch(err => {
  console.error('Migration process failed:', err);
  process.exit(1);
}); 