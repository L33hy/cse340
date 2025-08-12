const { Pool } = require("pg");
require("dotenv").config();
/* ***************
 * Connection Pool
 * SSL Object needed for local testing of app
 * But will cause problems in production environment
 * If - else will make determination which to use
 * *************** */

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : false
});

// Added for troubleshooting queries
// during development
if (process.env.NODE_ENV === "development") {
	module.exports = {
		async query(text, params) {
			try {
				const res = await pool.query(text, params);
				console.log("executed query", { text });
				return res;
			} catch (error) {
				console.error("error in query", { text });
				throw error;
			}
		},
	};
} else {
	// Export the pool for production use
	module.exports = pool;
}
