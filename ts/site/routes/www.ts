import { Server } from 'socket.io';
import * as express from 'express';

import stripe = require('./stripe');
import passport = require('./passport');
import apiSetup = require('./api');
import discord = require('./discord');

import musicRoute = require('../../music/routes');


export = (app: express.Application, socketio: Server) => {
	app.get('/', (req, res) => {
		if (req.isAuthenticated()) return res.redirect('/dashboard');
		res.render('index');
	});

	app.get('/dashboard', authed, (req, res) => {
		if (!req.isAuthenticated()) return res.redirect('/');
		res.render('dashboard');
	});

	render('/login');
	render('/invite');
	render('/docs');
	render('/status');

	app.get('/bot/:id([0-9A-Za-z]{24,32})', authed, (req, res) => {
		if (!req.isAuthenticated()) return res.redirect('/');
		res.render('bot/dashboard');
	});

	app.get('/settings', authed, (req, res) => {
		res.render('index');
	});

	stripe(app);

	var route = musicRoute(socketio);
	app.use(route.loc, route.route);

	apiSetup(app);
	passport(app);
	discord(app);

	app.get('/logout', authed, (req, res) =>{
		req.logout();
		res.redirect('/');
	});

	function render(url: string, fileName?: string) {
		fileName = fileName || url.replace('/', '');
		app.get(url, (_, res) => res.render(fileName!));
	}
}

function authed(req: express.Request, res: express.Response, next: express.NextFunction) {
	if (req.isAuthenticated()) return next();
	res.status(500).send('Not Authed!');
}