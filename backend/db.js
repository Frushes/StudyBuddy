const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : null
};

let pool;

async function initDB() {
  const dbName = process.env.DB_NAME || 'studybuddy_db';
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.end();

    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        host VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure table structure exists, but never drop them!
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        room_id VARCHAR(255),
        sender VARCHAR(255),
        text TEXT,
        type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whiteboard_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(255),
        x0 FLOAT,
        y0 FLOAT,
        x1 FLOAT,
        y1 FLOAT,
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database and tables initialized successfully');
    return pool;
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    console.error('Make sure MySQL is running and credentials in .env are correct.');
    process.exit(1);
  }
}

function getPool() {
  return pool;
}

module.exports = { initDB, getPool };
