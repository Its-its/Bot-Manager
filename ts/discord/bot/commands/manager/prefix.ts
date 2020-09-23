import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';


const PERMS = {
	MAIN: 'commands.prefix',
	RESET: 'reset',
	SET: 'set'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}




class PrefixCommand extends Command {
	constructor() {
		super('prefix');

		this.description = 'Sets the command prefix.';

		this.perms = Object.values(PERMS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						'prefix reset',
						'prefix set <type>'
					].join('\n')
				]
			]);
		}

		let type = params.shift();

		switch(type) {
			case 'reset': {
				if (!this.hasPerms(message.member!, server, PERMS.RESET)) return Command.noPermsMessage('Prefix');

				server.commandPrefix = '!';

				await server.save();

				return Command.success([[
					'Prefix',
					'Bot command prefix reset to "!"'
				]]);
			}

			case 'set': {
				if (!this.hasPerms(message.member!, server, PERMS.SET)) return Command.noPermsMessage('Prefix');

				let prefix = params.shift();

				if (prefix != null && new RegExp('[~\\!@#$%^&\*\-=+:;<>,.?]{1,4}', 'i').test(prefix)) {
					server.commandPrefix = prefix;

					await server.save();

					return Command.success([[
						'Prefix',
						'Bot command prefix now set to "' + prefix + '"'
					]]);
				} else {
					return Command.error([[
						'Prefix',
						[
							'Invalid command prefix.',
							'Prefix has to be 1-4 characters long.',
							'Only using: ~\\!@#$%^&*-=+:;<>,.?'
						].join('\n')
					]]);
				}
			}
		}
	}
}

export = PrefixCommand;