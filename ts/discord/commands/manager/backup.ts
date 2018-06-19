import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');

const PERMISSIONS = {
	MAIN: 'commands.backup'
};

class Backup extends Command {
	constructor() {
		super('backup');

		this.description = 'Save the discord server so you can restore it to an empty one.';

		this.perms = Object.values(PERMISSIONS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						server.getPrefix() + 'backup <items>',
						'',
						'Items:',
						' - all',
						'_Individual items:_',
						' - channels, moderations, roles, bans',
						' - commands, intervals, phrases, blacklists, perms, prefix, ranks, roles, alias, warnings'
					].join('\n')
				],
				[
					'Examples',
					[
						'backup all\n_Backup all the data_\n',
						'backup all channels commands\n_Backup channels and commands._\n',
						'backup all -bans\n_Backup all the data except for the bans._'
					].map(t => server.getPrefix() + t).join('\n')
				]
			]);
		}

		//
	}
}

export = Backup;