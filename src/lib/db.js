import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

// Initializing connection to Turso DB (libSQL) using environment variables
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

/**
 * Executes a single SQL query that returns rows.
 * @param {string} sql - SQL statement
 * @param {Array} [params] - Parameter values
 * @returns {Promise<Array>} List of rows matching the query
 */
export async function query(sql, params = []) {
  try {
    const res = await client.execute({ sql, args: params });
    return res.rows;
  } catch (err) {
    console.error('Database query error:', err, 'SQL:', sql);
    throw err;
  }
}

/**
 * Executes a write/update SQL statement.
 * @param {string} sql - SQL statement
 * @param {Array} [params] - Parameter values
 * @returns {Promise<Object>} Execution result summary
 */
export async function execute(sql, params = []) {
  try {
    const res = await client.execute({ sql, args: params });
    return {
      rowsAffected: res.rowsAffected,
      lastInsertRowid: res.lastInsertRowid
    };
  } catch (err) {
    console.error('Database execution error:', err, 'SQL:', sql);
    throw err;
  }
}

/**
 * Executes multiple SQL statements in a transaction.
 * @param {Array<Object>} statements - Array of { sql, args } objects
 * @returns {Promise<Array>} Results of each statement execution
 */
export async function batch(statements) {
  try {
    return await client.batch(statements);
  } catch (err) {
    console.error('Database batch transaction error:', err);
    throw err;
  }
}

/**
 * Runs migration scripts to set up schemas if they do not exist.
 * @returns {Promise<void>}
 */
export async function initializeDb() {
  try {
    const migrationPath = path.join(process.cwd(), 'migrations', '0001_init.sql');
    if (fs.existsSync(migrationPath)) {
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');
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

      const batchStmts = statements.map(sql => ({
        sql: sql.endsWith(';') ? sql : sql + ';',
        args: []
      }));
      
      await batch(batchStmts);
      console.log('✅ Database schema migration successfully initialized!');
    } else {
      console.warn(`⚠️ Migration file not found at ${migrationPath}`);
    }
  } catch (err) {
    console.error('❌ Failed to auto-initialize DB:', err);
  }
}

