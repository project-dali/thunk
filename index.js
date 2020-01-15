const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const htmlDir = '/html';
const commonDir = '/common';
const playerDir = '/player';
const masterDir = '/master';

let round = 0;
let rndResponses = 0;
let jsonDataGlobal = '';
const jsonInit = {
    "rounds": []
}
const db = require('./db');
const secret = require('./db-secret');

let connection = db.createCon(secret.dbCredentials);
let query = '';

const initializeJSON = (location, data) => {
    try {
        // write initial file structure
        fs.writeFileSync(location, JSON.stringify(data, null, 2));
    } catch (err) {
        throw err;
    }
}

initializeJSON('data.json', jsonInit);

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
}

io.on('connection', function (socket) {

    // generate deviceID
    let deviceID = createDeviceID();
    // set deviceID in db
    query = '';
    query += 'INSERT INTO thunk.device (id)';
    query += `VALUES (${deviceID})`
    // send query to db
    // if value is already used, generate a new one    

    socket.on('join game', function () {
        // emit the room join page back to the socket
        socket.emit('advance to: join form', deviceID);
    })

    socket.on('chat message', function (msg) {

        //increment index of total user responses in this round
        rndResponses++;

        let msgData = {
            response_num: rndResponses,
            message: msg
        };

        fs.readFile('data.json', 'utf8', function (err, currentData) {
            if (err) throw err;

            // read data.json as json object
            jsonDataGlobal = JSON.parse(currentData);

            // get most recent round obj and push to its responses arr
            let currentRoundParent = jsonDataGlobal.rounds[jsonDataGlobal.rounds.length - 1];
            currentRoundParent.responses.push(msgData);

            try {
                // rewrite data.json with the updated global json obj
                fs.writeFileSync('data.json', JSON.stringify(jsonDataGlobal, null, 2));

                // console.log('The User Response was appended to the file!');
            } catch (err) {
                throw err;
            }
        });

        // console.log('user msg: ' + msg);
        io.emit('chat message', msg);
    });

    socket.on('new game', function () {
        round = 1;
        usedPrompts = [];
        rndResponses = 0;
        // console.log('New game started!');
    })

    socket.on('new round', function () {

        rndResponses = 0;

        query = `SELECT * FROM prompt
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
                    throw err;
                }
            });

            // console.log(responseMsg)
            io.emit('chat message', responseMsg);
        });
        round++;

    });

    socket.on('send survey', function () {
        let responseMsg = 'survey mode initiated';
        // console.log(responseMsg);

        io.emit('chat message', responseMsg)
        io.emit('take survey');
    });

    socket.on('disconnect', function () {
        // console.log('user disconnected');
    });

});

http.listen(port, function () {
    console.log(`listening on /:${port}`);
});