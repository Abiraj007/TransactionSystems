const { Pool } = require("pg");

// PostgreSQL connection pool - ONLY CHANGED HOST
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',       
  host: process.env.PGHOST || 'localhost',  // CHANGED: Use environment variable
  database: process.env.PGDATABASE || 'myproject',   
  password: process.env.PGPASSWORD || 'Abiraj007',   
  port: process.env.PGPORT || 5432,
  // Add connection timeout
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = pool;