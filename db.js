/*eslint-env node */
let mysql = require('mysql2');

function createCon(credentials) {
	let connection = mysql.createConnection({
		host: credentials.host,
		user: credentials.user,
		password: credentials.password,
		database: credentials.database
	});
	return connection;
}
/**
 * 
 * @param {String} query Sql query
 * @param {Object} connection database connection
 * @param {Function} callback function to run when done stuff
 */
function sendQuery(query, connection, callback) {
	connection.query(query, function (err, results, fields) { // add fields param if desired
		// if (err) throw err;
		// console.log(results); // results contains rows returned by server
		// console.log(fields); // fields contains extra meta data about results, if available    
		callback(err, results, fields);
	});
}

module.exports.createCon = createCon;
module.exports.sendQuery = sendQuery;