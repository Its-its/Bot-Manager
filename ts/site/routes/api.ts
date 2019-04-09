import express = require('express');
import mongoose = require('mongoose');
import request = require('request');

import * as redis from 'redis';

import generate = require('nanoid/generate');

import Commands = require('../../models/commands');
import DiscordServers = require('../../discord/models/servers');
import DiscordMembers = require('../../discord/models/members');
import Users = require('../models/users');
import Bots = require('../models/bots');

import Intervals = require('../../models/intervals');
import Phrases = require('../../models/phrases');

import discordUtils = require('../../discord/utils');
import DiscordServer = require('../../discord/bot/GuildServer');
import discordClient = require('../../discord/guildClient');

import config = require('@config');
import { CustomDocs, DiscordBot, Nullable } from '@type-manager';



const redisGuildsClient = redis.createClient({
	host: config.redis.address,
	port: config.redis.port,
	db: config.redis.guildsDB
});




function getDiscordServer(id: string, cb: (server?: DiscordServer) => any) {
	redisGuildsClient.get(id, (err, str) => {
		if (err != null) { console.error(err); return cb(); }
		if (str == null) return cb();

		cb(new DiscordServer(id, JSON.parse(str)));
	});
}



const MAX_BOTS = 5;

// Layout
// /api
//    /dashboard
//       /status
//          /    ? botType
//    /bots
//       /create
//       /remove
//       /edit

type EnsureArgsTypes = EnsureArgs | string;

interface EnsureOpts {
	[test: string]: EnsureArgsTypes | Array<EnsureArgsTypes>;
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
	fieldName: Nullable<string>;
} & EnsureArgs;


function ensure(opts: EnsureOpts) {
	const corrected: CorrectedArgs[][] = [];

	for (var key in opts) corrected.push(correctOpts(key, opts[key]));

	function correctOpts(key: Nullable<string>, item: EnsureArgsTypes | EnsureArgsTypes[]): CorrectedArgs[] {
		// Type 'CorrectedArgs[][]' is not assignable to type 'CorrectedArgs[]'.
		// 	Type 'CorrectedArgs[]' is not assignable to type 'CorrectedArgs'.
		// 		Type 'CorrectedArgs[]' is not assignable to type '{ fieldName: string; } & { fieldLocation?: "body" | "params" | undefined; required?: boolean | undefined; default?: any; } & EnsureArray'.
		// 		Property 'fieldName' is missing in type 'CorrectedArgs[]' but required in type '{ fieldName: string; }'.ts(2322)
		// 	api.ts(97, 2): 'fieldName' is declared here.

		if (Array.isArray(item)) return item.map(i => correctOpts(key, i)[0]);

		if (typeof item == 'string') {
			return [
				{
					fieldLocation: 'body',
					fieldName: key,
					type: <any>item,
					required: false,
					default: null
				}
			];
		} else {
			var obj = Object.assign({
				fieldLocation: 'body',
				fieldName: key,
				required: false,
				default: null
			}, item);

			if (Array.isArray(obj.type)) {
				obj.type = obj.type.map(a => correctOpts(null, a)[0]);
			}

			return [obj];
		}
	}

	function verifyCorrectValue(item: EnsureItems): { value?: any, err?: any; } {
		var value = item.value;

		// Array Object...
		if (Array.isArray(item.type)) {
			var errorMsg = verifyCorrectValue(Object.assign({}, item, { type: 'array' }));
			if (errorMsg.err != null) return errorMsg;

			var fixed = [];

			for(var i = 0; i < errorMsg.value.length; i++) {
				var msg = verifyCorrectValue(Object.assign({}, item.type[0], { value: errorMsg.value[i] }));
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
					if (value == 'true' || value == 'false') {
						value = (value == 'true');
					} else if (value == 'on' || value == 'off') {
						value = (value == 'on');
					} else {
						return { err: 'Field "%s" is supposed to be a boolean!' };
					}
				}
				if (typeof value != 'boolean') return { err: 'Field "%s" is supposed to be a boolean!' };
				break;
			case 'array':
				if (!Array.isArray(value)) return { err: 'Field "%s" is supposed to be an array!' };
				if (item.$filter != null) value.filter(item.$filter);
				if (item.$min != null && value.length < item.$min) return { err: 'Field "%s" is too short!' };
				if (item.$max != null && value.length > item.$max) return { err: 'Field "%s" is too long!' };
				break;
			// case 'any':
			// 	break;
			// case 'object':
			// 	if (Array.isArray(value) || typeof value != 'object') return 'Field "%s" is supposed to be an object!';
			// 	break;
		}

		return { value: value };
	}

	return function(req: express.Request, res: express.Response, next: express.NextFunction) {
		for(var i = 0; i < corrected.length; i++) {
			var items = corrected[i];

			var subErrorMsg = [];

			for(var s = 0; s < items.length; s++) {
				var item = items[s];

				item.value = req[item.fieldLocation!][item.fieldName!];

				// Check if exists.
				if (item.value == null) {
					if (item.required) return res.status(400).send({ error: 'Missing required field "' + item.fieldName });
					if (item.default != null) req[item.fieldLocation!][item.fieldName!] = item.default;
					continue;
				}

				var returnMsg = verifyCorrectValue(item);

				if (returnMsg.err != null) {
					subErrorMsg.push(returnMsg.err.replace('%s', item.fieldName));
				} else {
					req[item.fieldLocation!][item.fieldName!] = returnMsg.value;
					subErrorMsg = [];
				}
			}

			if (subErrorMsg.length != 0) return res.status(400).send({ error: subErrorMsg });
		}

		next();
	}
}

const validBots = [ 'twitch', 'discord', 'youtube' ];

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

function refreshToken(refresh_token: string, cb: (err?: any, response?: TokenResponse) => any) {
	request.post(
		'https://discordapp.com/api/oauth2/token',
		{
			form: {
				refresh_token: refresh_token,
				grant_type: 'refresh_token',
				client_id: config.passport.discord.clientID,
				client_secret: config.passport.discord.clientSecret,
				redirect_uri: config.passport.discord.callbackURL,
				scope: config.passport.discord.scopeAuth.join(' ')
			},
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		},
		(err, resp, body) => {
			if (err != null) return cb(err);

			try {
				var parsed = JSON.parse(body);

				if (parsed.error != null) cb(parsed.error_description);
				else cb(undefined, parsed);
			} catch(e) {
				cb('Unable to parse token body..');
			}
		}
	);
}

function registerBot(req: express.Request, res: express.Response, next: express.NextFunction) {
	var botId = (req.params.bid || req.body.bid);

	if (botId == null) return res.status(500).send({ error: 'Bot doesn\'t exist.' });


	Bots.findOne({ uid: botId }, (err, bot) => {
		if (err != null) return res.status(500).send({ error: err });
		if (bot == null) return res.status(500).send({ error: 'Bot doesn\'t exist.' });
		// @ts-ignore
		req['bot'] = bot;
		next();
	});
}

function apiBots() {
	// api/bots/
	const bots = express.Router();

//#region Main

	bots.post('/status', registerBot, (req, res) => {
		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];
		var user: CustomDocs.web.UsersDocument = req.user;

		res.send({
			data: {
				user: {
					twitch: {
						linked: user.twitch.id != null
					},
					discord: {
						linked: user.discord.id != null
					},
					youtube: {
						linked: user.youtube.id != null
					}
				},
				bot: {
					type: bot.botType == null ? null : Bots.collectionToName(bot.botType).toLowerCase(),
					displayName: bot.displayName,
					active: bot.is_active,
					uid: bot.uid,
					created: bot.created_at,
					edited: bot.edited_at
				}
			}
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

//#endregion


//#region Commands

	// Get All Bot Commands
	bots.get('/:bid/commands', registerBot, (req, res) => {
		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.populate('command_ids')
		.exec((err, doc: CustomDocs.discord.ServersPopulatedDocument) => {
			if (err != null) return res.send({ error: err });

			var discordServer: DiscordBot.ServerDocument = JSON.parse(doc.server);
			var disabledCommands = discordServer.moderation.disabledCustomCommands || [];

			res.send({
				data: doc.command_ids.map(c => {
					return {
						id: c.pid,
						alias: c.alias,
						params: c.params,
						enabled: disabledCommands.indexOf(c.pid) == -1
					}
				})
			});
		});
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

		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.populate('command_ids')
		.exec((err, doc: CustomDocs.discord.ServersPopulatedDocument) => {
			if (err != null) return res.status(500).send({ error: err });
			if (doc == null) return res.status(500).send({ error: 'Unable to find Discord Server.' });

			var commands = doc.command_ids;

			if (commands.length >= 20) return res.status(500).send({ error: 'Maximum Commands used in bot.' })

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

				DiscordServers.updateOne(
					{ _id: doc.id },
					{ $addToSet: { 	command_ids: prod.id } }
				).exec();

				getDiscordServer(doc.server_id, server => {
					if (server == null) {
						res.send({
							data: {
								pid: prod.pid,
								alias: prod.alias,
								params: prod.params,
								enabled: enabled
							}
						});
						return;
					}

					server.commands.push({
						_id: prod._id,
						pid: prod.pid,
						alias: prod.alias,
						params: prod.params
					});

					if (!enabled) {
						if (server.moderation.disabledCustomCommands == null) {
							server.moderation.disabledCustomCommands = [];
						}

						server.moderation.disabledCustomCommands.push(prod.pid);
					}

					server.save();

					res.send({
						data: {
							pid: prod.pid,
							alias: prod.alias,
							params: prod.params,
							enabled: enabled
						}
					});
				});
			});
		});
	});

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
		params: [
			// {
			// 	type: 'array', // TODO: Deep check
			// 	required: true,
			// 	$min: 1,
			// 	$max: 2
			// },
			{
				type: 'string', // TODO: Deep check
				required: true
			}
		]
	}), registerBot, (req, res) => {
		var { bid, cid } = req.params;

		var { alias, enabled, params } = req.body;

		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

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

				var discordServer: DiscordBot.ServerDocument = JSON.parse(server.server);

				var disabledCommands = discordServer.moderation.disabledCustomCommands || [];

				if (!enabled && disabledCommands.indexOf(cid) == -1) {
					getDiscordServer(server.server_id, server => {
						if (server == null) return;

						if (server.moderation.disabledCustomCommands == null) {
							server.moderation.disabledCustomCommands = [];
						}

						server.moderation.disabledCustomCommands.push(cid);

						server.save();
					});
				} else if (enabled && disabledCommands.indexOf(cid) != -1) {
					getDiscordServer(server.server_id, server => {
						if (server == null) return;

						if (server.moderation.disabledCustomCommands == null) {
							server.moderation.disabledCustomCommands = [];
						}

						var indexOf = server.moderation.disabledCustomCommands.indexOf(cid);
						if (indexOf != -1) server.moderation.disabledCustomCommands.splice(indexOf, 1);

						server.save();
					});
				}


				res.send({
					id: cid,
					alias: alias,
					params: params,
					enabled: enabled
				});
			});
		});
	});

	// Delete Command from Bot
	bots.delete('/:bid/commands/:cid', registerBot, (req, res) => {
		var { bid, cid } = req.params;

		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

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

				getDiscordServer(server.server_id, server => {
					if (server == null) return;

					if (server.moderation.disabledCustomCommands == null) {
						server.moderation.disabledCustomCommands = [];
					}

					var indexOf = server.moderation.disabledCustomCommands.indexOf(cid);
					if (indexOf != -1) server.moderation.disabledCustomCommands.splice(indexOf, 1);

					if (comm.alias[0] != null) server.removeCommand(comm.alias[0]);

					server.save();
				});

				var index = server.command_ids.indexOf(comm._id);
				if (index != -1) server.command_ids.splice(index, 1);

				server.save(() => {
					res.send({});
				});
			});
		});
	});

//#endregion


//#region Phrases

	// Get All Bot Phrases
	bots.get('/:bid/phrases', registerBot, (req, res) => {
		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.populate('phrase_ids')
		.exec((err, doc: CustomDocs.discord.ServersPopulatedDocument) => {
			if (err != null) return res.send({ error: err });

			res.send({
				data: doc.phrase_ids.map(c => {
					return {
						id: c.pid,
						enabled: c.enabled == null ? false : c.enabled,
						ignoreCase: c.ignoreCase,
						phrases: c.phrases,
						responses: c.responses
					}
				})
			});
		});
	});

	// TODO: Double Check | responses can be incorrect.
	bots.post('/:bid/phrases', ensure({
		phrases: {
			type: [
				{ type: 'string', $min: 1 }
			],
			required: true,
			$min: 1
		},
		responses: {
			type: 'array',
			required: true,
			$min: 1,
			$max: 2
		},
		enabled: {
			type: 'boolean',
			default: false
		},
		ignoreCase: {
			type: 'boolean',
			default: true
		}
	}), registerBot, (req, res) => {
		var { bid, cid } = req.params;

		var { enabled, ignoreCase, phrases, responses } = req.body;

		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.populate('phrase_ids')
		.exec((err, doc: CustomDocs.discord.ServersPopulatedDocument) => {
			if (err != null) return res.status(500).send({ error: err });
			if (doc == null) return res.status(500).send({ error: 'Unable to find Discord Server.' });

			var phrasesPopulated = doc.phrase_ids;

			if (phrasesPopulated.length >= 20) return res.status(500).send({ error: 'Maximum Commands used in bot.' })

			for(var i = 0; i < phrasesPopulated.length; i++) {
				var cmd = phrasesPopulated[i];

				// New Command Alias's
				for(var a = 0; a < phrases.length; a++) {
					if (cmd.phrases.indexOf(phrases[a].toLowerCase()) != -1) {
						return res.send({ error: 'A Command with one or more of those alias\'s exists!' });
					}
				}
			}

			new Phrases({
				user_id: bot.user_id,
				pid: uniqueID(),

				enabled: enabled,
				ignoreCase: ignoreCase,
				phrases: phrases,
				responses: responses
			})
			.save((err, prod) => {
				if (err != null) {
					console.error(err);
					return res.status(500).send({ error: 'An Error occured while trying to add the command! Try again in a minute.' });
				}

				DiscordServers.updateOne(
					{ _id: doc.id },
					{ $addToSet: { 	phrase_ids: prod.id } }
				).exec();

				getDiscordServer(doc.server_id, server => {
					if (server != null) {
						server.phrases.push({
							pid: prod.pid,
							enabled: prod.enabled,
							ignoreCase: prod.ignoreCase,
							phrases: prod.phrases,
							responses: prod.responses
						});

						if (!enabled) {
							if (server.moderation.disabledCustomCommands == null) {
								server.moderation.disabledCustomCommands = [];
							}

							server.moderation.disabledCustomCommands.push(prod.pid);
						}

						server.save();
					}

					res.send({
						data: {
							pid: prod.pid,
							enabled: prod.enabled,
							ignoreCase: prod.ignoreCase,
							phrases: prod.phrases,
							responses: prod.responses
						}
					});
				});
			});
		});
	});

	// bots.put('/:bid/phrases/:pid', registerBot, (req, res) => {
	// 	var { pid } = req.params;
	// });

	bots.delete('/:bid/phrases/:pid', registerBot, (req, res) => {
		var { pid } = req.params;

		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId }, (err, server) => {
			if (err != null) {
				console.error(err);
				res.status(500).send({ error: 'An Error Occured while trying to find the server.' });
				return;
			}

			if (server == null) return res.status(500).send({ error: 'Server does not exist!' });

			Phrases.findOneAndRemove({ pid: pid }, (err, phr) => {
				if (err != null) {
					console.error(err);
					res.status(500).send({ error: 'An Error Occured while trying to remove the command.' });
					return;
				}

				if (phr == null) return res.status(500).send({ error: 'Command does not exist!' });

				var index = server.phrase_ids.indexOf(phr._id);
				if (index != -1) server.phrase_ids.splice(index, 1);

				server.save(() => {
					discordClient.updateServerFromDB(server.server_id);
					res.send({});
				});
			});
		});
	});

//#endregion


//#region Ranks

	// Get All Bot Ranks
	bots.get('/:bid/ranks', registerBot, (req, res) => {
		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.exec((err, doc: CustomDocs.discord.ServersDocument) => {
			if (err != null) return res.send({ error: err });

			getDiscordServer(doc.server_id, server => {
				if (server == null) {
					var jsonServer: DiscordBot.ServerOptions = JSON.parse(doc.server);

					res.send({
						data: jsonServer.ranks || []
					});

					return;
				}

				res.send({
					data: server.ranks
				});
			});
		});
	});

	// bots.post('/:bid/ranks', registerBot, (req, res) => {
	// });

	// bots.put('/:bid/ranks/:name', registerBot, (req, res) => {
	// 	var { name } = req.params;
	// });

	bots.delete('/:bid/ranks/:name', ensure({ name: { type: 'string', $min: 1 } }), registerBot, (req, res) => {
		var { name } = req.params;

		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.exec((err, doc: CustomDocs.discord.ServersDocument) => {
			if (err != null) return res.send({ error: err });

			getDiscordServer(doc.server_id, server => {
				if (server == null) {
					var jsonServer: DiscordBot.ServerOptions = JSON.parse(doc.server);

					var ranks = jsonServer.ranks || [];

					var indexOf = ranks.indexOf(name);
					if (indexOf != -1) ranks.splice(indexOf, 1);

					DiscordServers.updateOne({ _id: bot.botId }, { $set: { server: JSON.stringify(jsonServer) } }).exec();

					res.send({ data: true });

					return;
				}

				server.removeRank(name);

				server.save();

				res.send({ data: true });
			});
		});
	});

//#endregion


//#region Roles

	// Get All Bot Roles
	bots.get('/:bid/roles', registerBot, (req, res) => {
		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.exec((err, doc: CustomDocs.discord.ServersDocument) => {
			if (err != null) return res.send({ error: err });

			getDiscordServer(doc.server_id, server => {
				if (server == null) {
					var jsonServer: DiscordBot.ServerOptions = JSON.parse(doc.server);

					res.send({
						data: jsonServer.roles || []
					});

					return;
				}

				res.send({
					data: server.roles
				});
			});
		});
	});

	// bots.post('/:bid/roles', registerBot, (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/roles/:rid', registerBot, (req, res) => {
	// 	var { rid } = req.params;
	// });

	bots.delete('/:bid/roles/:pid', registerBot, (req, res) => {
		var { pid } = req.params;

		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.exec((err, doc: CustomDocs.discord.ServersDocument) => {
			if (err != null) return res.send({ error: err });

			getDiscordServer(doc.server_id, server => {
				if (server == null) {
					var jsonServer: DiscordBot.ServerOptions = JSON.parse(doc.server);

					var roles = jsonServer.roles || [];

					for(var i = 0; i < roles.length; i++) {
						var role = roles[i];

						if (role.id == pid) {
							roles.splice(i, 1);
							break;
						}
					}

					DiscordServers.updateOne({ _id: bot.botId }, { $set: { server: JSON.stringify(jsonServer) } }).exec();

					res.send({ data: true });

					return;
				}

				server.removeRole(pid);

				server.save();

				res.send({ data: true });
			});
		});
	});

//#endregion


//#region Moderation

	// Get All Bot Moderations
	// bots.get('/:bid/moderation', registerBot, (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.post('/:bid/moderation', registerBot, (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/moderation/:mid', registerBot, (req, res) => {
	// 	var { mid } = req.params;
	// });

	// bots.delete('/:bid/moderation/:mid', registerBot, (req, res) => {
	// 	var { mid } = req.params;
	// });

//#endregion


//#region Permissions

	// Get All Bot Permissions
	// bots.get('/:bid/permissions', registerBot, (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.post('/:bid/permissions', registerBot, (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/permissions/:pid', registerBot, (req, res) => {
	// 	var { pid } = req.params;
	// });

	// bots.delete('/:bid/permissions/:pid', registerBot, (req, res) => {
	// 	var { pid } = req.params;
	// });

//#endregion


//#region Intervals

	// Get All Bot Intervals
	bots.get('/:bid/intervals', registerBot, (req, res) => {
		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId })
		.populate('interval_ids')
		.exec((err, doc: CustomDocs.discord.ServersPopulatedDocument) => {
			if (err != null) return res.send({ error: err });

			res.send({
				data: doc.interval_ids.map(c => {
					return {
						pid: c.pid,
						guild_id: c.guild_id,
						channel_id: c.channel_id,
						displayName: c.displayName,
						message: c.message,
						active: c.active,
						every: c.every
					}
				})
			});
		});
	});

	// bots.post('/:bid/intervals', registerBot, (req, res) => {
	// 	var { bid } = req.params;
	// });

	// bots.put('/:bid/intervals/:iid', registerBot, (req, res) => {
	// 	var { iid } = req.params;
	// });

	bots.delete('/:bid/intervals/:pid', registerBot, (req, res) => {
		var { pid } = req.params;

		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];

		DiscordServers.findOne({ _id: bot.botId }, (err, server) => {
			if (err != null) {
				console.error(err);
				res.status(500).send({ error: 'An Error Occured while trying to find the server.' });
				return;
			}

			if (server == null) return res.status(500).send({ error: 'Server does not exist!' });

			Intervals.findOneAndRemove({ pid: pid }, (err, inter) => {
				if (err != null) {
					console.error(err);
					res.status(500).send({ error: 'An Error Occured while trying to remove the command.' });
					return;
				}

				if (inter == null) return res.status(500).send({ error: 'Command does not exist!' });

				var index = server.interval_ids.indexOf(inter._id);
				if (index != -1) server.interval_ids.splice(index, 1);

				server.save(() => {
					discordClient.updateServerFromDB(server.server_id);
					res.send({});
				});
			});
		});
	});

//#endregion

	return bots;
}


export = (app: express.Application) => {
	// api/
	const route = express.Router();

	route.use(function(req, res, next) {
		if (req.isAuthenticated()) return next();

		// TODO: Check body for user uid.
		res.status(400).send({ error: 'Not Authenticated' });
	});

	//


	app.get('/profile', (req, res) => {
		res.send({
			data: {
				//
			}
		});
	});

	app.get('/account/notifications', (req, res) => {
		res.send({
			data: {
				//
			}
		});
	});

	app.get('/account/settings', (req, res) => {
		res.send({
			data: {
				//
			}
		});
	});

	const discordRoute = express.Router();

	discordRoute.get('/guilds', (req, res) => {
		// @ts-ignore
		var bot: CustomDocs.web.BotsDocument = req['bot'];
		var user: CustomDocs.web.UsersDocument = req.user;

		DiscordMembers.findOne({ user_id: user._id }, (err, member) => {
			if (err != null) return res.status(500).send({ error: err });
			if (member == null) return res.status(500).send({ error: 'Discord member doesn\'t exist.' });

			// Refresh after 10 minutes?
			if (member.updated_guilds_at.getTime() > Date.now() - (1000 * 60 * 15)) {
				console.log('Cached');

				res.send({
					data: {
						last_updated: member.updated_guilds_at,
						guilds: member.guilds
							.filter(g => discordUtils.getPermissions(g.permissions).has(discordUtils.Permissions.FLAGS.ADMINISTRATOR))
							.map(g => { return { id: g.id, name: g.name, isOwner: g.owner, icon: g.icon }})
					}
				});
			} else {
				// Refresh cache and get guilds.
				if (user.discord.tokenExpires != null && user.discord.tokenExpires.getTime() < Date.now() + (1000 * 60 * 60)) {
					console.log('Refreshing Token - Getting Guilds');
					refreshToken(user.discord.refreshToken, (err, resp) => {
						if (err != null) return res.status(500).send({ error: err });
						if (resp == null) return res.status(500).send({ error: 'Refresh token response didn\'t return anything!' });

						user.discord.refreshToken = resp.refresh_token;
						user.discord.token = resp.access_token;
						user.discord.tokenExpires = new Date(Date.now() + (resp.expires_in * 1000));

						user.save();

						// Attempt to re-get the members guilds.
						request.get(
							'https://discordapp.com/api/users/@me/guilds',
							{ headers: { Authorization: `Bearer ${user.discord.token}` } },
							(err, resp, body) => {
								if (err != null) return res.status(500).send({ error: err });
								if (resp.statusCode != 200) return res.status(500).send({ error: `Status Code: ${resp.statusCode}` });

								try {
									var json = JSON.parse(body);

									member.updated_guilds_at = new Date();
									member.guilds = json;

									member.save(() => {
										res.send({
											data: {
												last_updated: member.updated_guilds_at,
												guilds: json
											}
										});
									});
								} catch(e) {
									console.error('Unable to parse (S):', e);
									res.send({ error: 'Unable to parse..' });
								}
							}
						);
					});
				}
				// Attempt to re-get the members guilds.
				// If token isnt working; refresh token, get guilds.
				else {
					console.log('Getting Guilds. Refresh token if need be; try again.');
					request.get(
						'https://discordapp.com/api/users/@me/guilds',
						{ headers: { Authorization: `Bearer ${user.discord.token}` } },
						(err, resp, body) => {
							if (err != null) return res.status(500).send(err);

							if (resp.statusCode != 401) {
								if (resp.statusCode == 429) {
									// rate limited

									console.log('Rate limited..');

									try {
										var json = JSON.parse(body);
										res.send({ error: json.message });
									} catch(e) {
										console.error('Unable to parse (RL):', e);
										res.send({ error: 'Unable to parse rate limited body..' });
									}
								} else {
									// success

									try {
										var json = JSON.parse(body);

										member.updated_guilds_at = new Date();
										member.guilds = json;

										member.save(() => {
											res.send({
												data: {
													last_updated: member.updated_guilds_at,
													guilds: json
												}
											});
										});
									} catch(e) {
										console.error('Unable to parse (S):', e);
										res.send({ error: 'Unable to parse..' });
									}
								}
							} else {
								// unauthorized

								if (user.discord.refreshToken == null) {
									return res.status(500).send({ error: 'No refresh token! Please logout and log back in to update guilds this time..' });
								}

								console.log('Attempting to refresh token and get guilds.');

								refreshToken(user.discord.refreshToken, (err, resp) => {
									if (err != null) return res.status(500).send({ error: err });
									if (resp == null) return res.status(500).send({ error: 'Refresh token response didn\'t return anything!' });

									user.discord.refreshToken = resp.refresh_token;
									user.discord.token = resp.access_token;
									user.discord.tokenExpires = new Date(Date.now() + (resp.expires_in * 1000));

									user.save();

									// Attempt to re-get the members guilds.
									request.get(
										'https://discordapp.com/api/users/@me/guilds',
										{ headers: { Authorization: `Bearer ${user.discord.token}` } },
										(err, resp, body) => {
											if (err != null) return res.status(500).send({ error: err });
											if (resp.statusCode != 200) return res.status(500).send({ error: `Status Code: ${resp.statusCode}` });

											try {
												var json = JSON.parse(body);

												member.updated_guilds_at = new Date();
												member.guilds = json;

												member.save(() => {
													res.send({
														data: {
															last_updated: member.updated_guilds_at,
															guilds: json
														}
													});
												});
											} catch(e) {
												console.error('Unable to parse (S):', e);
												res.send({ error: 'Unable to parse..' });
											}
										}
									);
								});
							}
						}
					);
				}
			}
		});
	});


	// api/dashboard/
	const dashboard = express.Router();

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
		req['user'].populate('bot_listeners', (err: any, resp: CustomDocs.web.UsersDocument) => {
			res.send({
				error: err,
				data: resp.bot_listeners!.map(b => {
					return {
						displayName: b.displayName,
						uid: b.uid,
						is_active: b.is_active,
						created_at: b.created_at,
						selectedBot: Bots.collectionToName!(b.botType)
					};
				})
			});
		});
	});

	dashboard.post('/create', (req, res) => {
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


	route.use('/bots', apiBots());
	route.use('/dashboard', dashboard);
	route.use('/discord', discordRoute);


	app.use('/api', route);
}



function uniqueID() {
	return generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32);
}