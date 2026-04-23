/**
 * src/config/db.js — Pool de conexiones MySQL con resiliencia para red inestable
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:                 process.env.DB_HOST || 'db-tunnel',
  port:                 parseInt(process.env.DB_PORT) || 3306,
  user:                 process.env.DB_USER,
  password:             process.env.DB_PASS,
  database:             process.env.DB_NAME,
  waitForConnections:   true,
  connectionLimit:      10,
  queueLimit:           0,
  enableKeepAlive:      true,
  keepAliveInitialDelay: 10000,
});

module.exports = pool;
