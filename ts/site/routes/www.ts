import passport = require('./passport');
import apiSetup = require('./api');
import discord = require('./discord');

import musicRoute = require('../../music/routes');

import * as express from 'express';
export = (app: express.Application, socketio) => {
	app.get('/', (req, res) => {
		if ((<any>req).isAuthenticated()) return res.redirect('/dashboard');
		res.render('index');
	});

	app.get('/dashboard', authed, (req, res) => {
		if (!(<any>req).isAuthenticated()) return res.redirect('/');
		res.render('dashboard');
	});

	render('/login');
	render('/invite');
	render('/docs');
	render('/status');

	app.get('/bot/:id([0-9A-Za-z]{24,32})', authed, (req, res) => {
		if (!(<any>req).isAuthenticated()) return res.redirect('/');
		res.render('bot/dashboard');
	});

	app.get('/settings', authed, (req, res) => {
		res.render('index');
	});

	var route = musicRoute(socketio);
	app.use(route.loc, route.route);

	apiSetup(app);
	passport(app);
	discord(app);

	app.get('/logout', authed, (req, res) =>{
		(<any>req).logout();
		res.redirect('/');
	});

	function render(url: string, fileName?: string) {
		fileName = fileName || url.replace('/', '');
		app.get(url, (_, res) => res.render(fileName));
	}
}

function authed(req, res, next) {
	if ((<any>req).isAuthenticated()) return next();
	res.status(500).send('Not Authed!');
}