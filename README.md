# Thunk

## About

1...2...Thunk!

Thunk is a game that inspires creativity, through quick thinking and clever limitations.

## Usage

- The Player view is available at [thunk.fun](https://thunk.fun/)
- The Host/Game Master view is available at [thunk.fun/host](https://thunk.fun/host)
- The System Data/Player Responses view is available at [thunk.fun/data](https://thunk.fun/data)

To conduct a Thunk round 1 playtest with this app, read the [full usage instructions](https://docs.google.com/document/d/1dOuF8cvLDkad-D1MXc76qy7BtDXmql0kFkSh1Df-mzY/edit).

## System Requirements

Requires [nodejs/npm installation](https://nodejs.org/en/). 
Using data on localhost requires
Note: This project uses the jQuery CDN on the client.

## Installation

Clone the repo into your preferred directory. Navigate to that directory in the terminal, then install this project's node depencies with:

    npm install

If you would like to test locally, you will need a local [mysql installation](https://dev.mysql.com/downloads/mysql/) and a mysql server/interface such as [mysql Workbench](https://www.mysql.com/products/workbench/). 

Setup a login/password on your local sql. Create a new file in the Thunk project repository called `db-secret.js` and add the following information, replacing `$username` and `$password` with the login credentials you just created (by default the username will be root, unless you specified otherwise):

```js
const dbCredentials = {
    host: "localhost",
    user: "$username",
    password: "$password",
    database: "thunk"
}

module.exports.dbCredentials = dbCredentials;
```

To import the database schema and data, run this [sql import script](https://b7s9.com/quick-drop/export-3.sql) in mysql workbench. You are now ready to begin local development.

## Test

To test on local, navigate to the root directory of the app and run:

    npm start

The app will be available on [localhost:3000](http://localhost:3000).

## Deploy 

Log in to the remote server as the shared non-root user, navigate to ~/thunk/

```shell
$ git pull
$ git checkout master
$ pm2 restart thunk
```

If any new npm packages were added,
```shell
$ npm install
$ pm2 restart thunk
```
