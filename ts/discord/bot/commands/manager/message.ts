import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

const PERMISSIONS = {
	MAIN: 'commands.dm'
};

// Figure out if I could really do a dm group another way.
// @Channel instead of @Role ??
class Message extends Command {
	constructor() {
		super(['dm', 'message']);

		this.perms = Object.values(PERMISSIONS);

		this.description = 'DM A group of people individually or in one huge group chat.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length <= 1) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					'dm <@role/id> <message>'
					// 'dm group <@role/id> <message>'
				]
			]);
		}

		var roleId = params.shift();
		// var isGroupDM = params[0].toLowerCase() == 'group';
		// if (isGroupDM) params.shift();
		var sending = params.join(' ');

		// if (isGroupDM) {
		// 	return Command.error([['Error', 'Group DM\'s not implemented yet']])
		// }

		if (roleId == null || sending.length == 0) {
			return Command.error([
				[
					'Error',
					'Invalid opts!'
				]
			]);
		}

		roleId = server.strpToId(roleId);

		var server_role = message.guild.roles.get(roleId);
		if (server_role == null) return Command.error([['Error', 'Not a valid Server Role.']]);

		const members = server_role.members.array();

		// if (!isGroupDM) {
			message.channel.send(Command.info([['Success', `Sending a DM to ${members.length} players in the role ${server_role.name}. This may take a minute.`]]));
			sending += `\n\n_Sent from "${message.guild.name}" by <@${message.member.id}> to everyone in the role @${server_role.name} (with ${members.length} members)_`;
		// } else {
		// 	message.channel.send(Command.info([['Success', `Creating a group DM with ${members.length} players in the role ${server_role.name}. This may take a minute.`]]));
		// }

		// if (!isGroupDM) {
			function nextMessage(pos: number) {
				if (pos == members.length) return message.channel.send(Command.success([['Success', `Sent a DM to ${members.length} players in the role ${server_role.name}`]]));
				var member = members[pos];

				member.sendMessage(sending)
				.then(() => {
					setTimeout(() => nextMessage(pos + 1), 500);
				})
				.catch(e => console.error(e));
			}

			nextMessage(0);
		// } else {
		// 	message.member.createDM()
		// 	.then(dm => {
		// 		function addNextMember(pos: number) {
		// 			if (pos == members.length) return message.channel.send(Command.success([['Success', `Sent a DM to ${members.length} players in the role ${server_role.name}`]]));
		// 			var member = members[pos];

		// 			// member.user.

		// 			member.sendMessage(sending)
		// 			.then(() => {
		// 				setTimeout(() => addNextMember(pos + 1), 500);
		// 			})
		// 			.catch(e => console.error(e));
		// 		}

		// 		addNextMember(0);
		// 	})
		// 	.catch(e => console.error(e));
		// }
	}
}

export = Message;