/*eslint-env node */
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

app.use('/static', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	// res.sendFile(__dirname + htmlDir + '/landing.html');
	res.render('index.njk');
});

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

io.on('connection', function (socket) {
	console.log('new connection');
	const createDeviceEntry = (__deviceID) => {
		let query = 'INSERT INTO thunk.device (id)';
		query += `VALUES (${__deviceID});`;
		db.sendQuery(query, connection, (err, results) => {
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

	socket.on('goto landing', function () {
		// emit the landing page back to the socket
		socket.emit('advance to: landing pg', '');
	});

	socket.on('join game', function () {
		// emit the room join page back to the socket
		socket.emit('advance to: join form', deviceID);
	});

	socket.on('host game', function () {
		// emit the host instructions page back to the socket
		socket.emit('advance to: host instructions', '');
	});

	socket.on('create game', function () {
		// emit the waiting room page back to the socket
		socket.emit('advance to: waiting room', '' /* ADD ROOM CODE HERE */);
	});

	// socket.on('new round', function () {

	// 	rndResponses = 0;

	// 	let query = `SELECT * FROM prompt
	//     ORDER BY RAND()
	//     LIMIT 1`;
	// 	db.sendQuery(query, connection, (results) => {
	// 		// console.log(results)
	// 		let now = new Date();

	// 		let roundData = {
	// 			time: now.toISOString(),
	// 			round: round,
	// 			prompt_id: results[0].id,
	// 			prompt: results[0].prompt,
	// 			responses: []
	// 		};

	// 		let responseMsg = 'Time ' + now.toLocaleString() + '; Round ' + roundData.round +
	// 			'; prompt_id=' + roundData.prompt_id + '; prompt: ' + roundData.prompt;

	// 		fs.readFile('data.json', 'utf8', function (err, currentData) {
	// 			if (err) throw err;

	// 			// read data.json as json object
	// 			jsonDataGlobal = JSON.parse(currentData);

	// 			// push new round obj to rounds arr
	// 			jsonDataGlobal.rounds.push(roundData);

	// 			try {
	// 				// rewrite data.json with the updated global json obj
	// 				fs.writeFileSync('data.json', JSON.stringify(jsonDataGlobal, null, 2));

	// 				// console.log('The User Response was appended to the file!');
	// 			} catch (err) {
	// 				console.log('we failed');
	// 				throw err;
	// 			}
	// 		});

	// 		// console.log(responseMsg)
	// 		io.emit('chat message', responseMsg);
	// 	});
	// 	round++;

	// });
});

http.listen(port, function () {
	console.log(`listening on /:${port}`);
});