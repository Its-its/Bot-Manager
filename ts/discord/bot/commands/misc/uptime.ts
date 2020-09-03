import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

const PERMS = {
	MAIN: 'commands.uptime'
};



class Uptime extends Command {
	constructor() {
		super('uptime', true, false);

		this.description = 'Gets the bot uptime.';

		this.perms = Object.values(PERMS);
	}

	public async call(_params: string[], _server: DiscordServer, message: Discord.Message) {
		await message.channel.send([
			'Temporarily Disabled.'
		]);

		return Promise.resolve();

		// let client = message.client;

		// if (client.shard != null && client.shard.count != 0) {
		// 	client.shard.broadcastEval('let opts = { id: this.shard.id, uptime: this.uptime }; opts;')
		// 	.then(shards => {
		// 		let output = [];

		// 		for (let i = 0; i < shards.length; i++) {
		// 			let shard = shards[i];
		// 			output.push(`Shard ${shard.id}: Uptime ${Math.floor((client.uptime || 0)/(1000 * 60 * 60 * 24))} Hours`);
		// 		}

		// 		message.channel.send(output, { code: 'http' });
		// 	})
		// 	.catch(e => console.error(e));
		// }
	}
}

export = Uptime;