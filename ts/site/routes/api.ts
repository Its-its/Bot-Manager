import express = require('express');
import mongoose = require('mongoose');

import * as redis from 'redis';

import generate = require('nanoid/generate');

import Commands = require('../../models/commands');
import DiscordServers = require('../../discord/models/servers');
import DiscordMembers = require('../../discord/models/members');
import Users = require('../models/users');
import Bots = require('../models/bots');

import discordUtils = require('../../discord/utils');

import config = require('../util/config');

let redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });


const MAX_BOTS = 3;

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

			console.error('uhhh, ' + botType);
			res.send({ error: 'Unknown.' });

			// if (validBots.indexOf(botType) == -1) return res.send({ error: 'Invalid.' });

			// var botParam = botType + '_bots';

			// req['user']
			// .populate(botParam, (err, resp) => {
			// 	if (err != null) return res.send({ error: err });

			// 	res.send({
			// 		data: {
			// 			bots: resp[botParam].map(item => {
			// 				return {
			// 					created_at: item.created_at,
			// 					// custom_token: item.custom_token,
			// 					server_id: item.server_id,
			// 					edited_at: item.edited_at,
			// 					is_active: item.is_active,
			// 					is_disconnected: item.is_disconnected,
			// 					is_registered: item.is_registered,
			// 					displayName: item.displayName
			// 				};
			// 			})
			// 		}
			// 	});
			// });

			return;
		}

		console.log('/status populate lis');
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
						selectedBot: Bots.collectionToName(b.botType)
					};
				})
			});
		});
	});

	dashboard.post('/create', (req, res) => { // TODO: "this.listeners is not a funtion"
		console.log('/create pre');
		var user = req['user'];

		if (!user.admin && user.bots.amount >= MAX_BOTS) return res.send({ error: 'Max Bot count reached!' });

		const bot = new Bots({
			user_id: user.id,
			uid: uniqueID()
		});

		bot.save((err) => {
			if (err != null) return res.send({ error: err });

			Users.updateOne({ _id: user._id }, { $inc: { 'bots.amount': 1 } }).exec(() => {
				console.log('/create post');
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
				// TODO: Remove
				DiscordMembers.findOne({ user_id: req['user'].id }, (err, member) => {
					var data = {
						user: {
							twitch: {
								linked: req['user'].twitch.id != null
							},
							discord: {
								linked: req['user'].discord.id != null,
								guilds: member['guilds']
									.filter(g => discordUtils.getPermissions(g.permissions).has(discordUtils.Permissions.FLAGS.ADMINISTRATOR))
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
	
					// TODO: Remove? Just send type of bot?
					bot.getBot((err, app) => {
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
	bots.delete('/:bid', (req, res) => {
		Bots.findOneAndRemove({ uid: req.params.bid }, (err, bot) => {
			if (err != null) return res.status(500).send({ error: err });
			if (bot == null) return res.status(500).send({ error: 'Bot doesn\'t exist.' });

			// TODO: Disable.

			var user = req['user'];
			
			Users.updateOne({ _id: user._id }, { $inc: { 'bots.amount': -1 } })
			.exec(() => res.send({ res: 'success' }));
		});
	});


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


	//! Ranks
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


	//! Roles
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


	//! Moderation
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


	//! Permissions
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


	//! Intervals
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


	route.use('/bots', bots);
	route.use('/dashboard', dashboard);


	app.use('/api', route);
}



function uniqueID() {
	return generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32);
}