import passport = require('./passport');
import apiSetup = require('./api');


import * as express from 'express';
export = (app: express.Application) => {
	app.get('/', (req, res) => {
		if ((<any>req).isAuthenticated()) return res.redirect('/dashboard');
		res.render('index');
	});

	app.get('/dashboard', (req, res) => {
		if (!(<any>req).isAuthenticated()) return res.redirect('/');
		res.render('dashboard');
	});

	app.get('/dashboard/:botType', (req, res) => {
		if (!(<any>req).isAuthenticated()) return res.redirect('/');

		// let botType = req.params.botType;

		res.render('bot-dashboard');
	});

	app.get('/settings', (req, res) => {
		res.render('index');
	});

	apiSetup(app);

	passport(app);
}