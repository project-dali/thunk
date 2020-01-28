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

app.get('/index', function (req, res) {
	res.render('index.njk');
});

app.get('/join', function (req, res) {
	res.render('join.njk');
});

app.get('/host-instructions', function (req, res) {
	res.render('host-instructions.njk');
});
// --------------------------------------------------------
// Global Functions
// --------------------------------------------------------
/**
 * generates a random 8 digit numeric deviceID
 * @returns string
 */
const createDeviceID = () => {
	let deviceID = '';
	for (let i = 0; i < 8; i++) {
		deviceID += String(Math.floor(Math.random() * 10));
	}
	return deviceID;
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
				}
				throw err;
			}
			return __deviceID;
		});
		return __deviceID;
	};

	let deviceID = createDeviceEntry(createDeviceID());
	socket.emit('test', deviceID);

	socket.on('disconnect', function () {
		let query = 'DELETE FROM thunk.device ';
		query += `WHERE id=${deviceID};`;
		db.sendQuery(query, connection, (err, results) => {
			if (err) {
				throw err;
			}
		});
	});

	socket.on('join game', function () {
		// emit the room join page back to the socket
		socket.emit('advance to: join form');
	});

	socket.on('host game', function () {
		// emit the host instructions page back to the socket
		socket.emit('advance to: host instructions', '');
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

		let createRoom = (callback) => {
			let __roomID;
			let query = 'INSERT INTO thunk.room (is_playing)';
			query += 'VALUES (0);';
			db.sendQuery(query, connection, (err, results, fields) => {
				if (err) {
					throw err;
				}
				__roomID = results.insertId;
				callback(__roomID);
			});
		};

		createRoom((roomID) => {
			console.log(roomID);
			socket.emit('advance to: waiting room', roomID);
		});
	});
});
// --------------------------------------------------------
// Show me da wae
// --------------------------------------------------------
http.listen(port, function () {
	console.log(`listening on /:${port}`);
});