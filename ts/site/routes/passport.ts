import passportGoogleOauth = require('passport-google-oauth');
import passportDiscord = require('passport-discord');
import passportTwitch = require('passport-twitch');
import passport = require('passport');

import Users = require('../models/users');
import config = require('../util/config');

let GoogleStrategy = passportGoogleOauth.OAuth2Strategy;
let DiscordStrategy = passportDiscord.Strategy;
let TwitchStrategy = passportTwitch.Strategy;

import * as express from 'express';
export = (app: express.Application) => {
	app.get('/auth/google', passport.authenticate('google', {
		scope : ['profile', 'email']
	}));
	app.get('/auth/google/callback', passport.authenticate('google', {
		successRedirect: '/', failureRedirect: '/'
	}), (req, res) => res.redirect('/'));

	
	app.get('/auth/discord', passport.authenticate('discord', {
		permissions: 66321471, scope: config.passport.discord.scope
	}));
	app.get('/auth/discord/callback', passport.authenticate('discord', {
		failureRedirect: '/'
	}), (req, res) => res.redirect('/'));


	// Goggle login
	// passport.use(new GoogleStrategy(
	// 	{
	// 		clientID: config.passport.google.clientID,
	// 		clientSecret: config.passport.google.clientSecret,
	// 		callbackURL: config.passport.google.callbackURL,
	// 		scopes: config.passport.google.scope
	// 	},
	// 	(req, token, refreshToken, profile, done) => {
	// 		process.nextTick(() => {
	// 			Users.findOne({ 'google.id' : profile.id }, (err, user) => {
	// 				if (err) return done(err);
	// 				if (user) return done(null, user);
		
	// 				user = new Users({
	// 					'google.id': profile.id,
	// 					'google.token': token,
	// 					'google.name': profile.displayName,
	// 					'google.email': profile.emails[0].value
	// 				});
		
	// 				user.save((err) => {
	// 					if (err) {
	// 						console.log(err);
	// 						return done(err, null);
	// 					}

	// 					done(null, user);
	// 				});
	// 			});
	// 		});
	// 	})
	// );

	passport.use(new DiscordStrategy(
		{
			clientID: config.passport.discord.clientID,
			clientSecret: config.passport.discord.clientSecret,
			callbackURL: config.passport.discord.callbackURL,
			scope: config.passport.discord.scope
		},
		(accessToken, refreshToken, profile, done) => {
			Users.findOne({ 'discord.id': profile.id }, (err, user) => {
				if (err) return done(err);
				if (user) return done(null, user);

				console.log(JSON.stringify(profile.connections, null, 4));
	
				user = new Users({
					'discord.id': profile.id,
					'discord.token': accessToken,
					'discord.name': profile.username,
					'discord.discriminator': profile.discriminator,
					'discord.connections': profile.connections
				});

				// guilds: [{ owner: Boolean, permissions: Number, icon: String, id: String, name: String }]
	
				user.save((err) => {
					if (err) {
						console.log(err);
						return done(err, null);
					}

					done(null, user);
				});
			});
		}
	));

	// Login
	passport.serializeUser((user, done) => {
		done(null, user.id);
	});

	// Logout
	passport.deserializeUser((id, done) => {
		Users.findById(id, (err, user) => {
			done(err, user);
		});
	});
}