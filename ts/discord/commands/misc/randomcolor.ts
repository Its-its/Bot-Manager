import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.color'
};

// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('');


class RandColor extends Command {
	constructor() {
		super(['randomcolor', 'color'], true, false);

		this.perms = Object.values(PERMS);

		this.description = 'Grabs a random color.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var color = RandColor.randomColor();
		return {
			type: 'echo',
			embed: {
				color: parseInt(color),
				fields: [
					{
						name: 'Color Chosen!',
						value: 'I\'ve generated "' + color + '" for you.'
					}
				]
			}
		};
	}


	static randomColor(): string {
		return '0x' + Math.floor(Math.random() * 16777215).toString(16);
	}
}

export = RandColor;