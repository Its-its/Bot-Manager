import passportGoogleOauth = require('passport-google-oauth');
import passportDiscord = require('passport-discord');
import passportTwitch = require('passport-twitch');
import passport = require('passport');

import Users = require('../models/users');
import Bots = require('../models/bots');
import DiscordServers = require('../models/discord_servers');

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


	app.get('/invite/discord/:bot_id', (req, res, next) => {
		passport.authenticate('discord', {
			callbackURL: '/invite/discord/callback/' + req.params.bot_id,
			permissions: 2134207671,
			scope: config.passport.discord.scopeInvite
		})(req, res, next);
	});

	app.get('/invite/discord/callback/:bot_id', passport.authenticate('discord', {
		failureRedirect: '/'
	}), (req, res) => {
		let guild_id = req.query.guild_id;
		let permissions = req.query.permissions;
		let bot_id = req.params.bot_id;

		if (req.user != null && guild_id != null && permissions != null && bot_id != null) {
			Bots.findOne({ uid: bot_id }, (err, bot: any) => {
				if (err != null) return console.error(err);

				if (bot == null) {
					DiscordServers.findOne({ server_id: guild_id }, (err, server) => {
						if (err != null) return console.error(err);
		
						if (server == null) {
							server = new DiscordServers({
								user_id: req.user.id,
								bot_id: bot.id,
								server_id: guild_id,
								permission: permissions
							});
							
							bot.app.name = 'disc';
							bot.app.uid = server['server_id'];

							// Call Bot - get info

							server.save(() => {});
							bot.save(() => {});
						} else res.redirect('/error?error=Server already has a bot in it!');
					});
				} else res.redirect('/error?error=Bot id does not exist!');
			});
		} else res.redirect('/');
	});

	app.get('/auth/discord', passport.authenticate('discord', {
		scope: config.passport.discord.scopeAuth
	}));

	app.get('/auth/discord/callback', passport.authenticate('discord', {
		failureRedirect: '/'
	}), (req, res) => res.redirect('/'));

	passport.use(new DiscordStrategy(
		{
			clientID: config.passport.discord.clientID,
			clientSecret: config.passport.discord.clientSecret,
			callbackURL: config.passport.discord.callbackURL,
			scope: config.passport.discord.scopeInvite
		},
		(accessToken, refreshToken, profile, done) => {
			Users.findOne({ 'discord.id': profile.id }, (err, user: any) => {
				if (err) return done(err);
				if (user) {
					if (user.discord.guilds.length == 0) {
						user.discord.guilds = profile.guilds;
						user.save(() => {});
					}

					return done(null, user);
				}

				// console.log(JSON.stringify(profile.connections, null, 4));
	
				user = new Users({
					'discord.id': profile.id,
					'discord.token': accessToken,
					'discord.name': profile.username,
					'discord.avatar': profile.avatar,
					// 'discord.provider': profile.provider,
					'discord.mfa_enabled': profile.mfa_enabled,
					'discord.discriminator': profile.discriminator,
					// 'discord.connections': profile.connections,
					'discord.guilds': profile.guilds
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