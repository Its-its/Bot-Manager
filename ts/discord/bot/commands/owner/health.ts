import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

const statuses = [
	'Ready',
	'Connecting',
	'Reconnecting',
	'Idle',
	'Nearly',
	'Disconnected'
];

class Health extends Command {
	constructor() {
		super('health');

		this.perms = [ 'commands.health' ];

		this.description = 'Checks the health of the bot.';

		this.ownerOnly = true;
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		const client = message.client;

		if (client.shard == null) return Command.error([['Health', 'Bot is currently not sharded!']])

		if (client.shard.count != 0) {
			client.shard.broadcastEval('var opts = { id: this.shard.id, guildCount: this.guilds.size, status: this.status }; opts;')
			.then(shards => {
				var output = [];

				for (var i = 0; i < shards.length; i++) {
					var shard = shards[i];
					output.push(`Shard ${shard.id}: ${statuses[shard.status]}, serving ${shard.guildCount} guilds`);
				}

				message.channel.send(output, { code: 'http' });
			})
			.catch(e => console.error(e));
		} else {
			message.channel.send([
				`Shard ${client.shard.id}: ${statuses[client.status]}, serving ${client.guilds.size} guilds`
			], { code: 'http' });
		}
	}
}

export = Health;