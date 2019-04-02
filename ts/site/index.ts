import http = require('http');
import socketio = require('socket.io');

import express = require('express');

import bodyParser = require('body-parser');
import cookieParse = require('cookie-parser');
import morgan = require('morgan');

import session = require('express-session');
import connectMongo = require('connect-mongo');

import mongoose = require('mongoose');
// import vhost = require('vhost');

import config = require('@config');

let app = express();
let MongoStore = connectMongo(session);
let server = http.createServer(app);


let io = socketio(server);

if (config.debug) mongoose.set('debug', true);

mongoose.Promise = global.Promise;
mongoose.connect(config.database, { useNewUrlParser: true });


app.set('port', config.port);
app.set('view engine', 'ejs');
app.set('trust proxy', true);


// app.use(cloudflare.restore({ update_on_start: true }));
app.use(morgan('common'));
app.use(cookieParse());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
// app.use(bodyParser.raw({ type: '*/*' }));

app.use(session({
	secret: config.session_secret,
	resave: true,
	saveUninitialized: false,
	cookie: {
		maxAge: 86400000 * 365
		//, secure: true
	},
	store: new MongoStore({ mongooseConnection: mongoose.connection })
}));


console.info('Host:', config.baseUrl);
console.info('Port:', config.port);


let www = require('./vhost/www')(io);
app.use(www);

// app.use(vhost(globalOpts.config.baseUrl, www));
// app.use(vhost('www.' + globalOpts.config.baseUrl, www));

server.listen(app.get('port'), () => console.log('Started server.'));
