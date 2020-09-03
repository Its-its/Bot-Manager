import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');
import utils = require('@discord/utils');

const PERMISSIONS = {
	MAIN: 'commands.dm'
};

// Figure out if I could really do a dm group another way.

// IDEA: @Channel instead of @Role ??
class Message extends Command {
	constructor() {
		super(['dm', 'message']);

		this.perms = Object.values(PERMISSIONS);

		this.description = 'DM A group of people individually (or in one huge group chat coming soon).';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
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

		let roleId = params.shift();
		// let isGroupDM = params[0].toLowerCase() == 'group';
		// if (isGroupDM) params.shift();
		let messageToSend = params.join(' ');

		// if (isGroupDM) {
		// 	return Command.error([['Error', 'Group DM\'s not implemented yet']])
		// }

		if (roleId == null || messageToSend.length == 0) {
			return Command.error([
				[
					'Message',
					'Invalid opts!'
				]
			]);
		}

		let sRoleId = server.strpToId(roleId);
		if (sRoleId == null) return Command.error([['Message', 'Invalid ID']]);

		let discordGuildRole = message.guild!.roles.cache.get(sRoleId);
		if (discordGuildRole == null) return Command.error([['Error', 'Not a valid Server Role.']]);

		let membersInRole = discordGuildRole.members.array();

		// if (!isGroupDM) {
			await message.channel.send(Command.info([['Success', `Sending a DM to ${membersInRole.length} players in the role ${discordGuildRole.name}. This may take a minute.`]]));
			messageToSend += `\n\n_Sent from "${message.guild!.name}" by <@${message.member!.id}> to everyone in the role @${discordGuildRole.name} (with ${membersInRole.length} members)_`;
		// } else {
		// 	message.channel.send(Command.info([['Success', `Creating a group DM with ${members.length} players in the role ${server_role.name}. This may take a minute.`]]));
		// }

		// if (!isGroupDM) {
			async function nextMessage(pos: number) {
				if (pos == membersInRole.length) return message.channel.send(Command.success([['Success', `Sent a DM to ${membersInRole.length} players in the role ${discordGuildRole!.name}`]]));
				let member = membersInRole[pos];

				let channel = await member.createDM();

				await channel.send(messageToSend);
				await utils.asyncTimeout(500);
				await nextMessage(pos + 1);
			}

			await nextMessage(0);
		// } else {
		// 	message.member.createDM()
		// 	.then(dm => {
		// 		function addNextMember(pos: number) {
		// 			if (pos == members.length) return message.channel.send(Command.success([['Success', `Sent a DM to ${members.length} players in the role ${server_role.name}`]]));
		// 			let member = members[pos];

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