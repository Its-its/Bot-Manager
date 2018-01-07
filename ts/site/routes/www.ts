import passport = require('./passport');
import apiSetup = require('./api');


import * as express from 'express';
export = (app: express.Application) => {
	app.get('/', (req, res) => {
		if ((<any>req).isAuthenticated()) return res.redirect('/dashboard');
		res.render('index');
	});

	app.get('/dashboard', authed, (req, res) => {
		if (!(<any>req).isAuthenticated()) return res.redirect('/');
		res.render('dashboard');
	});

	app.get('/bot/:id([0-9A-Za-z]{32})', authed, (req, res) => {
		if (!(<any>req).isAuthenticated()) return res.redirect('/');
		res.render('bot-dashboard');
	});

	app.get('/settings', authed, (req, res) => {
		res.render('index');
	});

	apiSetup(app);
	passport(app);

	app.get('/logout', authed, (req, res) =>{
		(<any>req).logout();
		res.redirect('/');
	});

	app.use((req, res) => {
		res.status(500).send('Something Broke!');
	});
}

function authed(req, res, next) {
	if ((<any>req).isAuthenticated()) return next();
	res.status(500).send('Not Authed!');
}