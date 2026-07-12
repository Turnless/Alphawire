const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Load environment variables from .env
try {
  require('dotenv').config();
} catch (e) {
  // If dotenv isn't installed globally/locally yet, we'll continue
}

async function init() {
  const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';

  console.log(`🔌 Connecting to database at: ${url}`);
  const client = createClient({ url, authToken });

  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', '0001_init.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at ${migrationPath}`);
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Split statements by semicolon while ignoring semicolons inside quotes/comments if simple
    // A robust way for this schema is to split by semicolon followed by newline
    const statements = sqlContent
      .split(/;\s*[\r\n]+/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🚀 Executing ${statements.length} migration statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      // Append semicolon back for execution validation
      const sql = stmt.endsWith(';') ? stmt : stmt + ';';
      
      console.log(`   Running: ${sql.split('\n')[0]}...`);
      await client.execute(sql);
    }

    console.log('✅ Database schema migration successfully applied!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

init();
