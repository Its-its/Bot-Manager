import express = require('express');
import mongoose = require('mongoose');

import DiscordServers = require('../models/discord_servers');
import Bots = require('../models/bots');

// Layout
// /api
//    /dashboard
//       /status
//          /    ? botType
//    /bots
//       /create
//       /remove
//       /edit
//    /


export = (app: express.Application) => {
	// api/
	let route = express.Router();

	route.use(function(req, res, next) {
		if ((<any>req).isAuthenticated()) return next();

		// TODO: Check body for user uid.
		res.send({ error: 'Not Authenticated' });
	});



	// api/dashboard/
	let dashboard = express.Router();

	dashboard.post('/status', (req, res) => {
		let botType = req.body.botType;

		if (botType != null) {
			botType = botType.toLowerCase();
			
			if (botType != 'twitch' && botType != 'discord' && botType != 'youtube')
				return res.send({ error: 'Invalid.' });

			let botParam = `${botType}_bots`;

			req.user
			.populate(botParam, (err, resp) => {
				if (err != null) return res.send({ error: err });

				res.send({
					data: {
						bots: resp[botParam].map(item => {
							return {
								confirmation_id: item.confirmation_id,
								created_at: item.created_at,
								custom_token: item.custom_token,
								server_id: item.server_id,
								edited_at: item.edited_at,
								is_active: item.is_active,
								is_disconnected: item.is_disconnected,
								is_registered: item.is_registered,
								displayName: item.displayName
							};
						})
					}
				});
			});

			return;
		}

		req.user.populate('listeners', (err, resp) => {
			res.send({
				error: err,
				data: resp.listeners.map(b => {
					return {
						displayName: b.displayName,
						uid: b.uid,
						is_active: b.is_active,
						created_at: b.created_at,
						apps: b.apps
					};
				})
			});
		});
	});

	dashboard.post('/create', (req, res) => {
		if (req.user.bots.amount >= 2) return res.send({ error: 'Max Bot count reached!' });

		let bot = new Bots({
			user_id: req.user.id,
			uid: uniqueID()
		});

		bot.save((err) => {
			if (err != null) return res.send({ error: err });

			req.user.bots.amount++;
			req.user.save(() => {
				res.send({ data: 'Created!' });
			});
		});
	});



	// api/bot/
	let bots = express.Router();

	bots.post('/status', (req, res) => {
		let id = req.body.id;

		Bots.findOne({ uid: id }, (err, bot: any) => {
			res.send({
				error: err,
				data: err != null ? null : {
					user: {
						twitch: {
							linked: req.user.twitch.id != null
						},
						discord: {
							linked: req.user.discord.id != null
						},
						youtube: {
							linked: req.user.youtube.id != null
						}
					},
					bot: {
						displayName: bot.displayName,
						active: bot.is_active,
						uid: bot.uid,
						app: bot.app,
						created: bot.created_at,
						edited: bot.edited_at
					}
				}
			});
		});
	});

	bots.post('/set', (req, res) => {
		let id = req.body.id;
		let name = req.body.name;

		Bots.findOne({ uid: id }, (err, bot: any) => {
			if (err != null) return res.send({ error: 'Error! ID not found!' });

			if (bot.app == null) {
				var modelName = toModelName(name);

				if (modelName == null) return res.send({ error: 'Incorrect Listener Name' });

				var Model = mongoose.model(modelName);
				
				var listener = <any>new Model({
					user_id: req.user.id,
					bot_id: bot.id,
					uid: uniqueID()
				});

				listener.save(() => {
					bot.app = {
						name: name,
						uid: listener.uid
					};

					bot.save(() => {
						res.send({ data: 'Success!' });
					});
				});
			} else {
				//
			}
		});
	});

	// api/listener/
	let listeners = express.Router();

	listeners.post('/status', (req, res) => {
		let id = req.body.id;
		let name = req.body.name;

		var modelName = toModelName(name);
		if (modelName == null) return res.send({ error: 'Incorrect Listener Name' });

		mongoose.model(modelName)
		.findOne({ uid: id }, (err, doc: any) => {
			if (name == 'disc') {
				//
			} else {
				res.send({ poo: 'poo' });
			}
		});
	});

	listeners.post('/create', (req, res) => {
		let botId = req.body.botId;
		let type = req.body.type; // yt, disc, etc..
		let userId = req.user.id;
	});

	// bots.post('/create', (req, res) => {
	// 	let botType = req.body.botType;

	// 	if (botType != null) {
	// 		botType = botType.toLowerCase();

	// 		if (botType == 'twitch') {
	// 			//
	// 		} else if (botType == 'discord') {
	// 			if (req.user.bots.discord_amount > 0)
	// 				return res.send({ error: 'Exceeding Maximum Discord bots!' });

	// 			let discordBot = new DiscordBot({
	// 				user_id: req.user._id,
	// 				confirmation_id: confirmID()
	// 			});

	// 			discordBot.save((err) => {
	// 				if (err != null) return res.send({ error: err });

	// 				req.user.bots.discord_amount++;
	// 				req.user.save(() => {
	// 					res.send({ data: 'Successful' });
	// 				});
	// 			});

	// 		} else if (botType == 'youtube') {
	// 			//
	// 		}
	// 	}
	// });

	route.use('/dashboard', dashboard);
	route.use('/bot', bots);
	route.use('/listener', listeners);

	app.use('/api', route);
}


function confirmID() {
	return block() + block() + '-' + block() + block() + block() + '-' + block();

	function block() {
		return Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1);
	}
}

function uniqueID() {
	return block() + block() + block() + block() + block() + block() + block() + block();

	function block() {
		return Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1);
	}
}

function toModelName(name) {
	if (name == 'disc') return 'discord_servers';
	if (name == 'yt') return 'youtube_channels';
	if (name == 'ttv') return 'twitch_channels';
	return null;
}