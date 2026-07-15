const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Load environment variables manually from .env
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const firstEquals = trimmed.indexOf('=');
        if (firstEquals !== -1) {
          const key = trimmed.slice(0, firstEquals).trim();
          let value = trimmed.slice(firstEquals + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  // Ignore loader error
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
      .map(stmt => {
        return stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0);

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
