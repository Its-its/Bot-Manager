import { Server } from 'socket.io';

import path = require('path');
import express = require('express');

import passport = require('passport');


export = (socketio: Server) => {
	let app = express();

	app.set('view engine', 'ejs');
	app.set('views', path.join(__dirname, '../../../app/views'));
	app.use(express.static(path.join(__dirname, '../../../app/public')));
	// app.set('trust proxy', true);

	app.use(passport.initialize());
	app.use(passport.session());

	require('../routes/www')(app, socketio);

	app.use((req, res) => {
		res.status(500).send('Something Broke!');
	});

	return app;
};