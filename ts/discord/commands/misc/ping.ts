import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');

import Commands = require('../index');

class Help extends Command {
	constructor() {
		super('help', true, false);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		const client = message.client;

		if (client.shard != null && client.shard.count != 0) {
			client.shard.broadcastEval('var opts = { id: this.shard.id, guildCount: this.guilds.size, status: this.status }; opts;')
			.then(shards => {
				var output = [];

				for (var i = 0; i < shards.length; i++) {
					var shard = shards[i];
					output.push(`Shard ${shard.id}: Pings ${shard.pings.join(',')}`);
				}

				message.channel.send(output, { code: 'http' });
			})
			.catch(e => console.error(e));
		} else {
			message.channel.send([
				`Shard 0: Pings ${client.pings.join(',')}`
			], { code: 'http' });
		}
	}
}

export = Help;