import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

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
		let client = message.client;

		await message.channel.send([
			`Uptime ${Math.floor((client.uptime || 0)/(1000 * 60 * 60 * 24))} Hours`
		], { code: 'http' });

		return Promise.resolve();
	}
}

export = Uptime;