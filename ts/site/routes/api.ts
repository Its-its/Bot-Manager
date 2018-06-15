import express = require('express');
import mongoose = require('mongoose');

import * as redis from 'redis';

import generate = require('nanoid/generate');

import Commands = require('../../models/commands');
import DiscordServers = require('../../discord/models/servers');
import DiscordMembers = require('../../discord/models/members');
import Bots = require('../models/bots');

import config = require('../util/config');

let redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });


// Layout
// /api
//    /dashboard
//       /status
//          /    ? botType
//    /bots
//       /create
//       /remove
//       /edit

interface EnsureOpts {
	[test: string]: EnsureArgs | string;
}


type EnsureItems = EnsureNumber | EnsureArray;

interface EnsureNumber {
	type: 'number' | 'string' | 'boolean' | 'array';
	value?: any;

	$min?: number;
	$max?: number;

	$filter?: (value: any) => boolean;
}


interface EnsureArray {
	type: EnsureItems[];
	value?: any[];

	$min?: number;
	$max?: number;

	$filter?: (value: any) => boolean;
}

type EnsureArgs = {
	fieldLocation?: 'body' | 'params';
	required?: boolean; // Default: false
	default?: any;
} & EnsureItems;

type CorrectedArgs = {
	fieldName: string;
} & EnsureArgs;


function ensure(opts: EnsureOpts) {
	var corrected: CorrectedArgs[] = [];

	for (var key in opts) corrected.push(correctOpts(key, opts[key]));

	// console.log(JSON.stringify(corrected, null, 4));

	function correctOpts(key, item): CorrectedArgs {
		if (typeof item == 'string') {
			return {
				fieldLocation: 'body',
				fieldName: key,
				type: <any>item,
				required: false,
				default: null
			};
		} else {
			var obj = Object.assign({
				fieldLocation: 'body',
				fieldName: key,
				required: false,
				default: null
			}, item);

			if (Array.isArray(obj.type)) {
				obj.type = obj.type.map(a => correctOpts(null, a));
			}

			return obj;
		}
	}

	function verify(item: EnsureItems): { value?: any, err?: any; } {
		var value = item.value;

		if (Array.isArray(item.type)) {
			var errorMsg = verify(Object.assign({}, item, { type: 'array' }));
			if (errorMsg.err != null) return errorMsg;

			var fixed = [];

			for(var i = 0; i < errorMsg.value.length; i++) {
				var msg = verify(Object.assign({}, item.type[0], { value: errorMsg.value[i] }));
				if (msg.err != null) return msg;
				fixed.push(msg.value);
			}

			return { value: fixed };
		}

		switch(item.type) {
			case 'number':
				if (typeof value != 'number') return { err: 'Field "%s" is supposed to be a number!' };
				if (item.$min != null && value < item.$min) return { err: 'Field "%s" is too small!' };
				if (item.$max != null && value > item.$max) return { err: 'Field "%s" is too big!' };
				break;
			case 'string':
				if (typeof value != 'string') return { err: 'Field "%s" is supposed to be a string!' };
				if (item.$min != null && value.length < item.$min) return { err: 'Field "%s" is too short!' };
				if (item.$max != null && value.length > item.$max) return { err: 'Field "%s" is too long!' };
				break;
			case 'boolean':
				if (typeof value == 'string') {
					if (value != 'true' && value != 'false') return { err: 'Field "%s" is supposed to be a boolean!' };
					value = (value == 'true');
				}
				if (typeof value != 'boolean') return { err: 'Field "%s" is supposed to be a boolean!' };	
				break;
			case 'array':
				if (!Array.isArray(value)) return { err: 'Field "%s" is supposed to be an array!' };
				if (item.$filter != null) value.filter(item.$filter);
				if (item.$min != null && value.length < item.$min) return { err: 'Field "%s" is too short!' };
				if (item.$max != null && value.length > item.$max) return { err: 'Field "%s" is too long!' };
				break;
			// case 'object':
			// 	if (Array.isArray(value) || typeof value != 'object') return 'Field "%s" is supposed to be an object!';
			// 	break;
		}

		return { value: value };
	}

	return function(req, res, next) {
		for(var i = 0; i < corrected.length; i++) {
			var item = corrected[i];

			item.value = req[item.fieldLocation][item.fieldName];

			// Check if exists.
			if (item.value == null) {
				if (item.required) return res.status(400).send({ error: 'Missing required field "' + item.fieldName  });
				if (item.default != null) req[item.fieldLocation][item.fieldName] = item.default;
				continue;
			}

			var errorMsg = verify(item);
			if (errorMsg.err != null) return res.status(400).send({ error: errorMsg.err.replace('%s', item.fieldName) });
			req[item.fieldLocation][item.fieldName] = errorMsg.value;
		}

		next();
	}
}

const validBots = [ 'twitch', 'discord', 'youtube' ];

export = (app: express.Application) => {
	// api/
	let route = express.Router();

	route.use(function(req, res, next) {
		if ((<any>req).isAuthenticated()) return next();

		// TODO: Check body for user uid.
		res.status(400).send({ error: 'Not Authenticated' });
	});


	// api/dashboard/
	let dashboard = express.Router();

	dashboard.post('/status', (req, res) => {
		var botType = req.body.botType;

		//
		if (botType != null) {
			botType = botType.toLowerCase();

			if (validBots.indexOf(botType) == -1) return res.send({ error: 'Invalid.' });

			var botParam = botType + '_bots';

			req['user']
			.populate(botParam, (err, resp) => {
				if (err != null) return res.send({ error: err });

				res.send({
					data: {
						bots: resp[botParam].map(item => {
							return {
								created_at: item.created_at,
								// custom_token: item.custom_token,
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

		// Main Dashboard
		req['user'].populate('listeners', (err, resp) => {
			res.send({
				error: err,
				data: resp.listeners.map(b => {
					return {
						displayName: b.displayName,
						uid: b.uid,
						is_active: b.is_active,
						created_at: b.created_at,
						selectedBot: (<any>Bots).collectionToName(b.botType)
					};
				})
			});
		});
	});

	dashboard.post('/create', (req, res) => {
		if (req['user'].bots.amount >= 2) return res.send({ error: 'Max Bot count reached!' });

		let bot = new Bots({
			user_id: req['user'].id,
			uid: uniqueID()
		});

		bot.save((err) => {
			if (err != null) return res.send({ error: err });

			req['user'].bots.amount++;
			req['user'].save(() => {
				res.send({ data: 'Created!' });
			});
		});
	});



	// api/bots/
	let bots = express.Router();

	bots.post('/status', (req, res) => {
		var id = req.body.id;

		Bots.findOne({ uid: id }, (err, bot) => {
			if (err == null && bot != null) {
				DiscordMembers.findOne({ user_id: req['user'].id }, (err, member) => {
					var data = {
						user: {
							twitch: {
								linked: req['user'].twitch.id != null
							},
							discord: {
								linked: req['user'].discord.id != null,
								guilds: member['guilds']
									.filter(g => new Permissions(g.permissions).has(Permissions.FLAGS.ADMINISTRATOR))
									.map(g => { return { id: g.id, name: g.name }})
							},
							youtube: {
								linked: req['user'].youtube.id != null
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
	
					bot.getBot((err, app) => { // TODO: Remove? Just send type of bot?
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
				});
			} else res.send({ error: err || 'Bot doesn\'t exist.' });
		});
	});

	// Get Bot
	// bots.get('/:bid', (req, res) => {
	// 	// 
	// });

	// Update Bot
	// bots.put('/:bid', (req, res) => {
	// 	// 
	// });

	// Delete Bot
	// bots.delete('/:bid', (req, res) => {
	// 	// 
	// });


	//! Commands

	// Get All Bot Commands
	bots.get('/:bid/commands', registerBot, (req, res) => {
		var bot = req['bot'];
		// var { bid } = req.params;

		// Bots.findOne({ uid: bid }, (err, bot) => {
		//	if (err != null) return res.send({ error: err });

		DiscordServers.findOne({ _id: bot.botId })
		.populate('command_ids')
		.exec((err, doc) => {
			if (err != null) return res.send({ error: err });

			res.send({
				data: doc['command_ids'].map(c => {
					return {
						id: c['uid'],
						alias: c['alias'],
						params: c['params'],
						enabled: doc.server.moderation.disabledCustomCommands.indexOf(c['uid']) == -1
					}
				})
			});
		});
		// });
	});

	// Create Bot Command
	bots.post('/:bid/commands', ensure({
		alias: {
			type: [
				{ type: 'string', $min: 1 }
			],
			required: true,
			$min: 1,
			$filter: (text => /^[a-z0-9]+$/i.test(text))
		},
		enabled: {
			type: 'boolean',
			default: false
		},
		params: {
			type: 'array',
			required: true,
			$min: 1,
			$max: 2
		}
	}), registerBot, (req, res) => {
		var { bid, cid } = req.params;

		var { alias, enabled, params } = req.body;

		var bot = req['bot'];

		// Bots.findOne({ uid: bid }, (err, bot) => {
		// 	if (err == null) {
		DiscordServers.findOne({ _id: bot.botId })
		.populate('command_ids')
		.exec((err, doc) => {
			if (err != null) return res.status(500).send({ error: err });

			var commands: DiscordBot.Command[] = <any>doc.command_ids;

			if (commands.length > 20) return res.status(500).send({ error: 'Maximum Commands used in bot.' })

			for(var i = 0; i < commands.length; i++) {
				var cmd = commands[i];

				// New Command Alias's
				for(var a = 0; a < alias.length; a++) {
					if (cmd.alias.indexOf(alias[a].toLowerCase()) != -1) {
						return res.send({ error: 'A Command with one or more of those alias\'s exists!' });
					}
				}
			}

			if (!checkCommandParams(params)) {
				return res.status(500).send({ error: 'Params is not valid.' });
			}

			new Commands({
				uid: uniqueID(),
				alias: alias,
				params: [ params[0] ]
			})
			.save((err, prod) => {
				if (err != null) {
					console.error(err);
					return res.status(500).send({ error: 'An Error occured while trying to add the command! Try again in a minute.' });
				}

				var addTo = {
					command_ids: prod.id
				};

				if (!enabled) {
					addTo['server.moderation.disabledCustomCommands'] = prod['uid'];
				}

				DiscordServers.updateOne(
					{ _id: doc.id }, 
					{ $addToSet: addTo }
				).exec();

				doc.server.commands = (<any[]>doc.command_ids).map(c => {
					return { id: c.uid, alias: c.alias, params: c.params };
				});

				var newComm = {
					id: prod['uid'],
					alias: prod['alias'],
					params: prod['params'],
					enabled: enabled
				};

				doc.server.commands.push(newComm);

				redisGuildsClient.set(doc.server_id, JSON.stringify(doc['server']), () => {
					res.send({ data: newComm });
				});
			});
		});
		// 	} else res.status(500).send({ error: err });
		// });
	});

	// Get Single Bot Command
	// bots.get('/:bid/commands/:cid', (req, res) => {
	// 	// 
	// });

	// Update Bot Command
	bots.put('/:bid/commands/:cid', ensure({
		alias: {
			type: [
				{ type: 'string', $min: 1 }
			],
			required: true,
			$min: 1,
			$filter: (text => /^[a-z0-9]+$/i.test(text))
		},
		enabled: {
			type: 'boolean',
			default: false
		},
		params: {
			type: 'array',
			required: true,
			$min: 1,
			$max: 2
		}
	}), registerBot, (req, res) => {
		var { bid, cid } = req.params;

		var { alias, enabled, params } = req.body;

		var bot = req['bot'];

		// Bots.findOne({ uid: bid }, (err, bot) => {
		// 	if (err != null) {
		// 		console.error(err);
		// 		res.status(500).send({ error: 'An Error Occured while trying to grab the bot.' });
		// 		return;
		// 	}

		// 	if (bot == null) return res.status(500).send({ error: 'Bot does not exist!' });

		DiscordServers.findOne({ _id: bot.botId }, (err, server) => {
			if (err != null) {
				console.error(err);
				res.status(500).send({ error: 'An Error Occured while trying to grab the bot.' });
				return;
			}

			if (server == null) return res.status(500).send({ error: 'Server does not exist!' });

			Commands.findOneAndUpdate(
				{ uid: cid }, 
				{
					$set: {
						alias: alias,
						params: params,
						edited_at: Date.now()
					}
				}, (err, comm) => {
				if (err != null) {
					console.error(err);
					res.status(500).send({ error: 'An Error Occured while trying to grab the bot.' });
					return;
				}

				if (comm == null) return res.status(500).send({ error: 'Command does not exist!' });


				if (!enabled && server.server.moderation.disabledCustomCommands.indexOf(cid) == -1) {
					DiscordServers.updateOne(
						{ _id: server.id },
						{ $addToSet: { 'server.moderation.disabledCustomCommands': cid } }
					).exec();
				} else if (enabled && server.server.moderation.disabledCustomCommands.indexOf(cid) != -1) {
					DiscordServers.updateOne(
						{ _id: server.id },
						{ $pull: { 'server.moderation.disabledCustomCommands': cid } }
					).exec();
				}


				res.send({
					id: cid,
					alias: alias,
					params: params,
					enabled: enabled
				});
			});
		});
		// });
	});

	// Delete Command from Bot
	bots.delete('/:bid/commands/:cid', registerBot, (req, res) => {
		var { bid, cid } = req.params;

		var bot = req['bot'];

		// Bots.findOne({ uid: bid }, (err, bot) => {
		// 	if (err != null) {
		// 		console.error(err);
		// 		res.status(500).send({ error: 'An Error Occured while trying to find the bot.' });
		// 		return;
		// 	}

		// 	if (bot == null) return res.status(500).send({ error: 'Bot does not exist!' });

		DiscordServers.findOne({ _id: bot.botId }, (err, server) => {
			if (err != null) {
				console.error(err);
				res.status(500).send({ error: 'An Error Occured while trying to find the server.' });
				return;
			}

			if (server == null) return res.status(500).send({ error: 'Server does not exist!' });

			Commands.findOneAndRemove({ uid: cid }, (err, comm) => {
				if (err != null) {
					console.error(err);
					res.status(500).send({ error: 'An Error Occured while trying to remove the command.' });
					return;
				}

				if (comm == null) return res.status(500).send({ error: 'Command does not exist!' });

				DiscordServers.updateOne(
					{ _id: server.id },
					{ $pull: { 'server.moderation.disabledCustomCommands': cid } }
				).exec();

				var index = server.command_ids.indexOf(comm._id);
				if (index != -1) server.command_ids.splice(index, 1);
				

				server.save(() => {
					res.send({});
				});
			});
		});
		// });
	});


	//! Phrases
	// bots.get('/:bid/phrases', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.post('/:bid/phrases', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/phrases/:pid', (req, res) => {
	// 	var { bid, pid } = req.params;
	// });

	// bots.delete('/:bid/phrases/:pid', (req, res) => {
	// 	var { bid, pid } = req.params;
	// });


	// //! Ranks
	// bots.get('/:bid/ranks', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.post('/:bid/ranks', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/ranks/:rid', (req, res) => {
	// 	var { bid, rid } = req.params;
	// });

	// bots.delete('/:bid/ranks/:rid', (req, res) => {
	// 	var { bid, rid } = req.params;
	// });


	// //! Roles
	// bots.get('/:bid/roles', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.post('/:bid/roles', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/roles/:rid', (req, res) => {
	// 	var { bid, rid } = req.params;
	// });

	// bots.delete('/:bid/roles/:rid', (req, res) => {
	// 	var { bid, rid } = req.params;
	// });


	// //! Moderation
	// bots.get('/:bid/moderation', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.post('/:bid/moderation', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/moderation/:mid', (req, res) => {
	// 	var { bid, mid } = req.params;
	// });

	// bots.delete('/:bid/moderation/:mid', (req, res) => {
	// 	var { bid, mid } = req.params;
	// });


	// //! Permissions
	// bots.get('/:bid/permissions', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.post('/:bid/permissions', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/permissions/:pid', (req, res) => {
	// 	var { bid, pid } = req.params;
	// });

	// bots.delete('/:bid/permissions/:pid', (req, res) => {
	// 	var { bid, pid } = req.params;
	// });


	// //! Intervals
	// bots.get('/:bid/intervals', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.post('/:bid/intervals', (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/intervals/:iid', (req, res) => {
	// 	var { bid, iid } = req.params;
	// });

	// bots.delete('/:bid/intervals/:iid', (req, res) => {
	// 	var { bid, iid } = req.params;
	// });

	function registerBot(req: express.Request, res: express.Response, next: express.NextFunction) {
		Bots.findOne({ uid: req.params.bid }, (err, bot) => {
			if (err != null) return res.status(500).send({ error: err });
			if (bot == null) return res.status(500).send({ error: 'Bot doesn\'t exist.' });
			req['bot'] = bot;
			next();
		});
	}

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
	// 				user_id: req['user'].id,
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


	route.use('/bots', bots);
	route.use('/dashboard', dashboard);

	app.use('/api', route);
}

function checkCommandParams(param: any | any[]): boolean {
	if (Array.isArray(param)) {
		for(var i = 0; i < param.length; i++) {
			if (!checkCommandParams(param[i])) return false;
		}
		return true;
	}

	if (typeof param != 'object' || Array.isArray(param)) return false;

	// TODO

	return true;
}

function confirmID() {
	return block() + block() + '-' + block() + block() + block() + '-' + block();

	function block() {
		return Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1);
	}
}

function uniqueID() {
	return generate('0123456789abcdefghijklmnopqrstuvwxyz', 32);
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
		for (const perm in Permissions.FLAGS)
			serialized[perm] = this.has(perm, checkAdmin);
		return serialized;
	}

	toArray(checkAdmin = true) {
		return Object.keys(Permissions.FLAGS).filter(perm => this.has(perm, checkAdmin));
	}

	*[Symbol.iterator]() {
		const keys = this.toArray();
		while (keys.length) yield keys.shift();
	}

	static resolve(permission: number | Permissions | Array<string> | string): number {
		if (typeof permission === 'number' && permission >= 0) return permission;
		if (permission instanceof Permissions) return permission.bitfield;
		if (Array.isArray(permission)) return permission.map(p => this.resolve(p)).reduce((prev, p) => prev | p, 0);
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