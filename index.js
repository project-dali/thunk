/*eslint-env node */
const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const htmlDir = '/html';

const db = require('./db');
const secret = require('./db-secret');
let connection = db.createCon(secret.dbCredentials);

app.use('/static', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + htmlDir + '/landing.html');
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
	console.log(socket);
	const createDeviceEntry = (deviceID) => {
		let query = 'INSERT INTO thunk.device (id)';
		query += `VALUES (${deviceID});`;
		// console.log(query);
		db.sendQuery(query, connection, (err, results) => {
			// console.log(err);
			if (err) {
				if (err.errno === 1062) {
					// console.log('duplicate entry');
					deviceID = createDeviceID();
					console.log('recursively generate device ID: ' + deviceID);
					// return createDeviceEntry(deviceID);
				}
				throw err;
			}
			// console.log(results);
			// console.log('');
			return deviceID;
		});
	};
	let deviceID = createDeviceID();
	deviceID = createDeviceEntry(deviceID);

	socket.on('disconnect', function () {
		// console.log('user disconnected');
	});

	socket.on('join game', function () {
		// emit the room join page back to the socket
		socket.emit('advance to: join form', deviceID);
	});

	socket.on('new round', function () {

		rndResponses = 0;

		let query = `SELECT * FROM prompt
        ORDER BY RAND()
        LIMIT 1`;
		db.sendQuery(query, connection, (results) => {
			// console.log(results)
			let now = new Date();

			let roundData = {
				time: now.toISOString(),
				round: round,
				prompt_id: results[0].id,
				prompt: results[0].prompt,
				responses: []
			};

			let responseMsg = 'Time ' + now.toLocaleString() + '; Round ' + roundData.round +
				'; prompt_id=' + roundData.prompt_id + '; prompt: ' + roundData.prompt;

			fs.readFile('data.json', 'utf8', function (err, currentData) {
				if (err) throw err;

				// read data.json as json object
				jsonDataGlobal = JSON.parse(currentData);

				// push new round obj to rounds arr
				jsonDataGlobal.rounds.push(roundData);

				try {
					// rewrite data.json with the updated global json obj
					fs.writeFileSync('data.json', JSON.stringify(jsonDataGlobal, null, 2));

					// console.log('The User Response was appended to the file!');
				} catch (err) {
					console.log('we failed');
					throw err;
				}
			});

			// console.log(responseMsg)
			io.emit('chat message', responseMsg);
		});
		round++;

	});
});

http.listen(port, function () {
	console.log(`listening on /:${port}`);
});