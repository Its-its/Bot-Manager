import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

const PERMISSIONS = {
	MAIN: 'commands.alias',
	LIST: 'commands.alias.list',
	ADD: 'commands.alias.add',
	REMOVE: 'commands.alias.remove'
};


class Alias extends Command {
	constructor() {
		super('alias');

		this.perms = Object.values(PERMISSIONS);

		this.description = 'Add an alias for a default command.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						'alias list',
						'alias add <alias name> <command>',
						'alias remove <alias name>'
					].join('\n')
				],
				[
					'Example',
					`\`\`${server.getPrefix()}alias add music play\`\`\n_${server.getPrefix()}play now works as ${server.getPrefix()}music play_`
				]
			]);
		}

		switch(params.shift()!.toLowerCase()) {
			case 'list':
				if (!this.hasPerms(message.member!, server, PERMISSIONS.LIST)) return Command.noPermsMessage('Alias');

				if (server.alias.length == 0) {
					return Command.info([
						[
							'Alias',
							'No alias created as of yet.'
						]
					]);
				} else {
					message.channel.send(Command.table(['Alias', 'Command'], server.alias.map(a => [a.alias.join(','), a.command])))

					return;
				}
			case 'add':
				if (!this.hasPerms(message.member!, server, PERMISSIONS.ADD)) return Command.noPermsMessage('Alias');

				let alias = params.shift();
				let command = params.join(' ');

				if (alias == null || command.length == 0) return Command.error([['Alias', 'Incorrect Usage.']]);

				if (!server.createAlias(alias, command)) return Command.error([['Alias', 'Unable to add alias. Alias used somewhere else?']]);

				server.save();

				return Command.success([['Alias', 'Added new alias.']]);
			case 'remove':
				if (!this.hasPerms(message.member!, server, PERMISSIONS.REMOVE)) return Command.noPermsMessage('Alias');

				let name = params.shift();

				if (name == null) return Command.error([['Alias', 'Pleave provide an alias name to remove.']]);

				if (server.removeAlias(name)) {
					server.save();
					return Command.success([['Alias', 'Successfully removed alias.']]);
				} else {
					return Command.error([['Alias', 'Unable to remove alias. Is that the correct alias name?']]);
				}
		}
	}
}

export = Alias;