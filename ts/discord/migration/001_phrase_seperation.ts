import Base = require('./base');
import Server = require('../discordserver');

import Bots = require('../../site/models/bots');

import Phrases = require('../../models/phrases');
import Commands = require('../../models/commands');
import DiscordServers = require('../models/servers');

class PhraseSeperation extends Base {
	static migration = 1;

	public dbUpgrade(server: Server, fin) {
		server.phrases.forEach(i => {
			Phrases.findOne({ pid: i.pid }, (err, doc) => {
				if (doc == null) {
					new Phrases({
						user_id: null,

						pid: i.pid,

						enabled: i.enabled == null ? false : i.enabled,
						ignoreCase: i.ignoreCase == null ? true : i.ignoreCase,

						phrases: i.phrases,
						responses: i.responses,

						created_at: Date.now(),
						edited_at: Date.now()
					})
					.save((err, res) => {
						Bots.updateOne({ 'bot.server': server.serverId }, { $addToSet: { 'bot.phrase_ids': res._id } }).exec();
					});
				}
			});
		});

		server.commands.forEach(i => {
			Commands.findOne({ pid: i.pid }, (err, doc) => {
				if (doc == null) {
					new Commands({
						user_id: null,

						pid: i.pid,
						alias: i.alias,
						params: i.params,

						created_at: Date.now(),
						edited_at: Date.now()
					})
					.save((err, res) => {
						Bots.updateOne({ 'bot.server_id': server.serverId }, { $addToSet: { 'bot.command_ids': res._id } }).exec();
					});
				}
			});
		});

		setTimeout(() => fin(), 5000);
	}
}

export = PhraseSeperation;