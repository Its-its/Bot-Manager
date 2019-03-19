import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

import Commands = require('../index');


const PERMS = {
	MAIN: 'commands.ping'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Ping extends Command {
	constructor() {
		super('ping', true, false);

		// this.perms = Object.values(PERMS);
	}

	public call(_params: string[], _server: DiscordServer, message: Discord.Message) {
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

export = Ping;