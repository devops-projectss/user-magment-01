require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST, // or process.env.DB_SERVER
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },
  port: 1433,
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = sql.connect(config)
  .then(pool => {
    console.log('✅ Connected to Azure SQL');
    return pool;
  })
  .catch(err => {
    console.error('❌ Connection failed:', err);
    throw err;
  });

// MySQL-style compatibility layer (for legacy code)
const db = {
  query: async (sqlQuery, values = [], callback) => {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      
      // Bind inputs if values are provided
      values.forEach((val, index) => {
        request.input(`param${index}`, val);
        sqlQuery = sqlQuery.replace('?', `@param${index}`);
      });
      
      const result = await request.query(sqlQuery);
      
      if (callback) {
        callback(null, result.recordset);
      } else {
        return result.recordset;
      }
    } catch (err) {
      if (callback) {
        callback(err, null);
      } else {
        throw err;
      }
    }
  }
};

// Export both for compatibility
module.exports = {
  // For new Azure SQL controllers
  sql,
  poolPromise,
  // For legacy MySQL-style usage
  db,
  // Default export for backward compatibility
  query: db.query
};
