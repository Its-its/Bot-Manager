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
			if (err == null) {
				var data = {
					user: {
						twitch: {
							linked: req.user.twitch.id != null
						},
						discord: {
							linked: req.user.discord.id != null,
							guilds: req.user.discord.guilds
								.filter(g => new Permissions(g.permissions).has(8))
								.map(g => { return { id: g.id, name: g.name }})
						},
						youtube: {
							linked: req.user.youtube.id != null
						}
					},
					bot: {
						displayName: bot.displayName,
						active: bot.is_active,
						uid: bot.uid,
						app: null,
						created: bot.created_at,
						edited: bot.edited_at
					}
				};
				
				bot.getApp((err, app) => {
					if (app != null) {
						delete app['__v'];
						delete app['_id'];
						delete app['user_id'];
						delete app['server_id'];
						delete app['bot_id'];
					}

					data.bot.app = app;

					res.send({ data: data });
				});
			} else res.send({ error: err });
		});
	});

	// bots.post('/set', (req, res) => {
	// 	let id = req.body.id;
	// 	let name = req.body.name;

	// 	Bots.findOne({ uid: id }, (err, bot: any) => {
	// 		if (err != null) return res.send({ error: 'Error! ID not found!' });

	// 		if (bot.app == null) {
	// 			var modelName = Bots['appName'](name);

	// 			if (modelName == null) return res.send({ error: 'Incorrect Listener Name' });

	// 			var Model = mongoose.model(modelName);
				
	// 			var listener = <any>new Model({
	// 				user_id: req.user.id,
	// 				bot_id: bot.id,
	// 				uid: uniqueID()
	// 			});

	// 			listener.save(() => {
	// 				bot.app = {
	// 					name: name,
	// 					id: listener.uid
	// 				};

	// 				bot.save(() => {
	// 					res.send({ data: 'Success!' });
	// 				});
	// 			});
	// 		} else {
	// 			//
	// 		}
	// 	});
	// });

	// api/listener/
	let listeners = express.Router();

	listeners.post('/status', (req, res) => {
		let id = req.body.id;
		let type = req.body.type;

		var modelName = Bots['appName'](type);
		if (modelName == null) return res.send({ error: 'Incorrect Listener Name' });

		mongoose.model(modelName)
		.findOne({ uid: id }, (err, doc: any) => {
			//
			res.send({ poo: 'poo' });
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


class Permissions {
	public bitfield;

	constructor(permissions) {
		this.bitfield = Permissions.resolve(permissions);
	}

	has(permission, checkAdmin = true) {
		if (permission instanceof Array) return permission.every(p => this.has(p, checkAdmin));
			permission = Permissions.resolve(permission);
		if (checkAdmin && (this.bitfield & Permissions.FLAGS.ADMINISTRATOR) > 0) return true;
			return (this.bitfield & permission) === permission;
	}

	missing(permissions, checkAdmin = true) {
		if (!(permissions instanceof Array)) permissions = new Permissions(permissions).toArray(false);
			return permissions.filter(p => !this.has(p, checkAdmin));
	}

	freeze() {
		return Object.freeze(this);
	}

	add(...permissions) {
		let total = 0;
		for (let p = permissions.length - 1; p >= 0; p--) {
			const perm = Permissions.resolve(permissions[p]);
			total |= perm;
		}
		if (Object.isFrozen(this)) return new Permissions(this.bitfield | total);
		this.bitfield |= total;
		return this;
	}

	remove(...permissions) {
		let total = 0;
		for (let p = permissions.length - 1; p >= 0; p--) {
			const perm = Permissions.resolve(permissions[p]);
			total |= perm;
		}
		if (Object.isFrozen(this)) return new Permissions(this.bitfield & ~total);
		this.bitfield &= ~total;
		return this;
	}

	serialize(checkAdmin = true) {
		const serialized = {};
		for (const perm in Permissions.FLAGS) serialized[perm] = this.has(perm, checkAdmin);
		return serialized;
	}

	toArray(checkAdmin = true) {
		return Object.keys(Permissions.FLAGS).filter(perm => this.has(perm, checkAdmin));
	}

	*[Symbol.iterator]() {
		const keys = this.toArray();
		while (keys.length) yield keys.shift();
	}

	static resolve(permission) {
		if (typeof permission === 'number' && permission >= 0) return permission;
		if (permission instanceof Permissions) return permission.bitfield;
		if (permission instanceof Array) return permission.map(p => this.resolve(p)).reduce((prev, p) => prev | p, 0);
		if (typeof permission === 'string') return this.FLAGS[permission];
		throw new Error('PERMISSIONS_INVALID');
	}

	static FLAGS = {
		CREATE_INSTANT_INVITE: 1 << 0,
		KICK_MEMBERS: 1 << 1,
		BAN_MEMBERS: 1 << 2,
		ADMINISTRATOR: 1 << 3,
		MANAGE_CHANNELS: 1 << 4,
		MANAGE_GUILD: 1 << 5,
		ADD_REACTIONS: 1 << 6,
		VIEW_AUDIT_LOG: 1 << 7,

		VIEW_CHANNEL: 1 << 10,
		SEND_MESSAGES: 1 << 11,
		SEND_TTS_MESSAGES: 1 << 12,
		MANAGE_MESSAGES: 1 << 13,
		EMBED_LINKS: 1 << 14,
		ATTACH_FILES: 1 << 15,
		READ_MESSAGE_HISTORY: 1 << 16,
		MENTION_EVERYONE: 1 << 17,
		USE_EXTERNAL_EMOJIS: 1 << 18,

		CONNECT: 1 << 20,
		SPEAK: 1 << 21,
		MUTE_MEMBERS: 1 << 22,
		DEAFEN_MEMBERS: 1 << 23,
		MOVE_MEMBERS: 1 << 24,
		USE_VAD: 1 << 25,

		CHANGE_NICKNAME: 1 << 26,
		MANAGE_NICKNAMES: 1 << 27,
		MANAGE_ROLES: 1 << 28,
		MANAGE_WEBHOOKS: 1 << 29,
		MANAGE_EMOJIS: 1 << 30,
	};

	static ALL = (<any>Object).values(Permissions.FLAGS).reduce((all, p) => all | p, 0);

	static DEFAULT = 104324097;
}