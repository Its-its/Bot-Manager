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

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		let client = message.client;

		if (client.shard == null) return Command.error([['Health', 'Bot is currently not sharded!']]);

		return Promise.resolve();

		// if (client.shard.count != 0) {
		// 	client.shard.broadcastEval('let opts = { id: this.shard.id, guildCount: this.guilds.size, status: this.status }; opts;')
		// 	.then(shards => {
		// 		let output = [];

		// 		for (let i = 0; i < shards.length; i++) {
		// 			let shard = shards[i];
		// 			output.push(`Shard ${shard.id}: ${statuses[shard.status]}, serving ${shard.guildCount} guilds`);
		// 		}

		// 		message.channel.send(output, { code: 'http' });
		// 	})
		// 	.catch(e => console.error(e));
		// } else {
		// 	message.channel.send([
		// 		`Shard ${client.shard.ids.join(',')}: serving ${client.guilds.cache.size} guilds`
		// 	], { code: 'http' });
		// }
	}
}

export = Health;