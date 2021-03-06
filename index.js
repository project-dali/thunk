/*eslint-env node */
// --------------------------------------------------------
// Import/Config
// --------------------------------------------------------
const express = require('express');
const app = express();
app.set('view engine', 'nunjucks');

const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

const db = require('./db');
const secret = require('./db-secret');
let connection = db.createCon(secret.dbCredentials);

let deviceID = '';

const nunjucks = require('nunjucks');
nunjucks.configure('views', {
	autoescape: true,
	express: app
});
nunjucks.configure('views', {
	autoescape: true
});

// --------------------------------------------------------
// Express Routes
// --------------------------------------------------------
app.use('/static', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.render('index.njk');
});

// Grabs the name of the view from the request, stores it in a variable, and then renders the correct Nunjucks file from that variable.
app.get('/:view', function (req, res) {
	let view = req.params.view;
	if(view !== 'favicon.ico') res.render(view + '.njk');
});

// --------------------------------------------------------
// Global Functions
// --------------------------------------------------------
/**
 * generates a random 8 digit numeric deviceID
 * @returns string
 */
const createDeviceID = () => {
	let __deviceID = '';
	for (let i = 0; i < 8; i++) {
		__deviceID += String(Math.floor(Math.random() * 10));
	}
	return __deviceID;
};
// --------------------------------------------------------
// Received Socket Events
// --------------------------------------------------------
io.on('connection', function (socket) {
	console.log('new connection');

	const createDeviceEntry = (__deviceID) => {
		let query = 'INSERT INTO thunk.device (id)';
		query += `VALUES (${__deviceID});`;
		db.sendQuery(query, connection, (err, results, fields) => {
			if (err) { // if duplicate entry, make a new code and try again
				if (err.errno === 1062) {
					__deviceID = createDeviceID();
					createDeviceEntry(__deviceID);
				} else {
					throw err; // else, throw an error
				}
			}
			socket.emit('store device id', __deviceID);
			return __deviceID;
		});
		return __deviceID;
	};

	let roomID = '';

	socket.on('send device id',function(__deviceID){
		if(__deviceID === null) {
			deviceID = createDeviceEntry(createDeviceID());
		} else {
			deviceID = createDeviceEntry(__deviceID);
		}
	});

	socket.on('disconnect', function () {
		if(deviceID !== '') {
			let query = 'DELETE FROM thunk.device ';
			query += `WHERE id=${deviceID};`;
			db.sendQuery(query, connection, (err, results, fields) => {
				if (err) {
					throw err;
				}
			});
		}
	});

	socket.on('join game', function () {
		// emit the room join page back to the socket
		socket.emit('advance to: join form');
	});

	socket.on('submit room code', function (formData) {
		/**
		 * Searches database to see if this room code exists
		 * @param {string} __roomID 6 digit room code
		 * @returns {boolean} does this roomID exist?
		 */
		let roomIDExists = (__roomID) => {
			return new Promise((resolve) => {
				let query = `SELECT * FROM thunk.room WHERE id='${__roomID}';`;

				db.sendQuery(query, connection, (err, results, fields) => {
					if (err) { // if duplicate entry, make a new code and try again
						throw err;
					}
					if (results.length > 0) { // a room with this ID exists
						resolve(true);
					} else {
						resolve(false);
					}
				});
			});
		};

		/**
		 * Sets the thunk.device room_id field to __roomID for
		 * the provided deviceID
		 * @param {string} __roomID 6 digit room code
		 * @param {string} __deviceID 10 digit device code
		 */
		let updateDeviceRoom = (__roomID, __deviceID) => {
			let query = `UPDATE thunk.device 
			SET room_id = (${__roomID}) 
			WHERE id='${__deviceID}';`;
			db.sendQuery(query, connection, (err, results, fields) => {
				if (err) {
					throw err;
				}
				console.log(results);
				// return true;
			});
		};

		// roomID inherited from on.connection scope
		roomID = formData['room-code'];
		roomID = db.mysql_real_escape_string(roomID);

		roomIDExists(roomID).then((value) => {
			if (value) {
				updateDeviceRoom(roomID, deviceID);
				socket.join(roomID);
				socket.emit('advance to: nickname picker');
			} else {
				// send back to the client that this room doesn't exist
				// we should do this in a better way probably idk
				socket.emit('invalid input', 'This room code does not exist.');
			}
		});
	});

	socket.on('host game', function () {
		// emit the host instructions page back to the socket
		socket.emit('advance to: host instructions');
	});

	socket.on('create room', function () {
		/**
		 * generates random 6 digit room code
		 * @returns string roomID
		 */
		let createRoomID = () => {
			let roomID = '';
			for (let i = 0; i < 6; i++) {
				roomID += String(Math.floor(Math.random() * 10));
			}
			return roomID;
		};

		let createRoom = (__roomID, callback) => {
			let query = 'INSERT INTO thunk.room (id)';
			query += `VALUES (${__roomID});`;
			db.sendQuery(query, connection, (err, results, fields) => {
				if (err) { // if duplicate entry, make a new code and try again
					if (err.errno === 1062) {
						__roomID = createRoomID();
						createRoom(__roomID);
					} // if another SQL error, stop everything
					throw err;
				}
				callback(__roomID);
			});
		};
		let roomID = createRoomID();
		createRoom(roomID, (roomID) => {
			socket.emit('advance to: waiting room', roomID);
		});
	});

	socket.on('start game', function () {
		socket.emit('advance to: standby');
	});
});
// --------------------------------------------------------
// Show me da wae
// --------------------------------------------------------
http.listen(port, function () {
	console.log(`listening on /:${port}`);
});