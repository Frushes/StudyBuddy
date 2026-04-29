const { initDB } = require('./db');

(async () => {
  console.log("Testing DB Initialization...");
  try {
    const pool = await initDB();
    const [rows] = await pool.query('SHOW TABLES');
    console.log("Tables found:", rows);
    console.log("DB connection verified! Exiting...");
    process.exit(0);
  } catch (e) {
    console.error("Test failed:", e);
    process.exit(1);
  }
})();
