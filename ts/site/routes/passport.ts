// @ts-ignore
import passportGoogleOauth = require('passport-google-oauth');
// @ts-ignore
import passportDiscord = require('passport-discord');
// @ts-ignore
import passportTwitch = require('passport-twitch');
import passport = require('passport');

import Users = require('../models/users');
import DiscordMembers = require('../../discord/models/members');

import config = require('@config');

const GoogleStrategy = passportGoogleOauth.OAuth2Strategy;
const DiscordStrategy = passportDiscord.Strategy;
const TwitchStrategy = passportTwitch.Strategy;

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


	// app.get('/invite/discord/:bot_id', (req, res, next) => {
	// 	passport.authenticate('discord', {
	// 		callbackURL: '/invite/discord/callback/' + req.params.bot_id,
	// 		permissions: 2134207671,
	// 		scope: config.passport.discord.scopeInvite
	// 	})(req, res, next);
	// });

	// app.get('/invite/discord/callback/:bot_id', passport.authenticate('discord', {
	// 	failureRedirect: '/'
	// }), (req, res) => {
	// 	let guild_id = req.query.guild_id;
	// 	let permissions = req.query.permissions;
	// 	let bot_id = req.params.bot_id;

	// 	if (req['user'] != null && guild_id != null && permissions != null && bot_id != null) {
	// 		Bots.findOne({ uid: bot_id }, (err, bot: any) => {
	// 			if (err != null) return console.error(err);

	// 			if (bot == null) {
	// 				DiscordServers.findOne({ server_id: guild_id }, (err, server) => {
	// 					if (err != null) return console.error(err);

	// 					if (server == null) {
	// 						server = new DiscordServers({
	// 							user_id: req['user'].id,
	// 							bot_id: bot.id,
	// 							server_id: guild_id,
	// 							permission: permissions
	// 						});

	// 						bot.app.name = 'disc';
	// 						bot.app.uid = server['server_id'];

	// 						// Call Bot - get info

	// 						server.save(() => {});
	// 						bot.save(() => {});
	// 					} else res.redirect('/error?error=Server already has a bot in it!');
	// 				});
	// 			} else res.redirect('/error?error=Bot id does not exist!');
	// 		});
	// 	} else res.redirect('/');
	// });

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
		(accessToken: string, refreshToken: string, profile: any, done: any) => {
			Users.findOne({ 'discord.id': profile.id }, (err, user: any) => {
				if (err != null) return done(err);

				if (user != null) {
					DiscordMembers.updateOne(
						{ user_id: user._id },
						{
							$set: {
								guilds: profile.guilds
							},
							$setOnInsert: {
								user_id: user._id,
								did: profile.id,
								name: profile.username,
								avatar: profile.avatar,
								mfa_enabled: profile.mfa_enabled,
								discriminator: profile.discriminator,
								connections: profile.connections
							}
						}, { upsert: true }).exec(() => done(null, user));
					// user.discord.guilds = profile.guilds;
					// user.save(() => done(null, user));

					return;
				}

				user = new Users({
					'discord.id': profile.id,
					'discord.token': accessToken
				});

				// guilds: [{ owner: Boolean, permissions: Number, icon: String, id: String, name: String }]

				user.save((err: any, doc: any) => {
					if (err) {
						console.log(err);
						return done(err, null);
					}

					DiscordMembers.updateOne({
						did: profile.id
					}, {
						$set: {
							user_id: doc._id,
							did: profile.id,
							name: profile.username,
							avatar: profile.avatar,
							mfa_enabled: profile.mfa_enabled,
							discriminator: profile.discriminator,
							connections: profile.connections,
							guilds: profile.guilds
						}
					}, { upsert: true }).exec();

					done(null, user);
				});
			});
		}
	));

	// Login
	passport.serializeUser((user: any, done) => {
		// console.log('passport.serializeUser:', user);
		done(null, user.id);
	});

	// Logout
	passport.deserializeUser((id: any, done) => {
		// console.log('passport.deserializeUser:', id);
		Users.findById(id, (err, user) => {
			if (user != null) console.log(user._id);
			// @ts-ignore
			done(err, user);
		});
	});
}