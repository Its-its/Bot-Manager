import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

const PERMISSIONS = {
	MAIN: 'commands.nick'
};

class Nick extends Command {
	constructor() {
		super('nick');

		this.perms = Object.values(PERMISSIONS);

		this.description = 'Changes the bots nickname for your discord server.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					'nick <name>'
				]
			]);
		}

		if (!this.hasPerms(message.member!, server, PERMISSIONS.MAIN)) return Command.noPermsMessage('Nick');

		let name = params.join(' ');

		message.guild!.me!.setNickname(name, 'Requested by ' + message.member!.user.tag)
		.then(() => {
			message.channel.send(Command.success([[ 'Nick', 'Sucessfully changed nickname.' ]]));
		}, e => console.error(e));
	}
}

export = Nick;