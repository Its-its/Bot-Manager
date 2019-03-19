import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

function call(_params: string[], _server: DiscordServer, _message: Discord.Message) {
	return Command.info([
		[ 'Description', this.description ],
		[
			'Command Usage',
			[
				'list <@user/@role>',
				'list group <id>',
				'list command <name>',
				'',
				'user <@user>',
				'user <@user> add <command/perm>',
				'user <@user> remove <command/perm>',
				'user <@user> group add <group name>',
				'user <@user> group remove <group name>',
				'',
				'role <@role>',
				'role <@role> add <command/perm>',
				'role <@role> remove <command/perm>',
				'role <@role> group add <command/perm>',
				'role <@role> group remove <name>',
				'',
				'group create <Display Name> - A-Z 0-9 spaces',
				'group <name>',
				'group <name> add <command/perm>',
				'group <name> remove <command/perm>',
				'',
				'channels <@user/@role>'
			]
			.join('\n')
		]
	]);
}

export {
	call
};