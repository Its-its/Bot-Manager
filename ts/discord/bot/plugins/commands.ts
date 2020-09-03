import Discord = require('discord.js');
import Server = require('../GuildServer');

import CommandManager = require('../../../command-manager');
import defaultCommands = require('../commands');

import limits = require('../../limits');
import { DiscordBot } from '@type-manager';

function isEnabled(server: Server): boolean {
	return server.plugins.commands == null ? true : server.plugins.commands.enabled;
}


async function onDidCallCommand(bot_id: string, message: Discord.Message, server: Server): Promise<boolean> {
	if (message.author.bot) return false;

	if (server.memberIgnored(message.member!.id)) return false;

	if (CommandManager.isCallingCommand(server.getPrefix(), bot_id, message.content)) {
		if (!limits.canCallCommand(message.guild!.id)) return true;

		if (message.content.trim() == `<@${bot_id}>` || message.content.trim() == `<@!${bot_id}>`) {
			message.channel.send(new Discord.MessageEmbed({
				description: 'You can use @bot_name instead of the command prefix if desired.',
				fields: [
					{
						name: 'Command Prefix',
						value: server.getPrefix()
					}
					// {
					// 	name: '',
					// 	value: ''
					// }
				]
			}));
			return true;
		}


		let commandMessage = CommandManager.getCommandMessage(server.getPrefix(), bot_id, message.content);

		if (commandMessage == null) return true;

		commandMessage = commandMessage.trim();

		if (commandMessage.length == 0) return true;

		// Get the command name. ['command', 'other stuff here']
		let commName = commandMessage.split(' ', 2)[0].toLowerCase();

		// Check for alias's.
		if (server.alias.length != 0) {
			for(let i = 0; i < server.alias.length; i++) {
				let alias = server.alias[i];

				if (alias.alias.indexOf(commName) != -1) {
					commandMessage = alias.command + commandMessage.substring(commName.length);
					// commName = alias.command;
					break;
				}
			}
		}


		// Not enabled? Not "plugin" or "perms"? Doesn't have bypasstoggle perm? return
		if (!isEnabled(server) && commName != 'plugin' && commName != 'perms' && !server.memberHasExactPerm(message.member!, 'commands.bypasstoggle')) {
			return true;
		}

		// Check if cannot call command.
		// Not admin? not enabled?
		// if (!message.member.hasPermission('ADMINISTRATOR') && (!isEnabled(server) && !server.userHasParentPerm(bot_id, 'commands.' + comm))) return true;

		let parsed = await CommandManager.parseMessageForCmd(defaultCommands, server, commandMessage, message);

		if (parsed != null) {
			for (let i = 0; i < parsed.length; i++) {
				parseOptions(message, server, parsed[i]);
			}
		}

		return true;
	} else {
		let phrase = server.findPhrase(message.content.split(' '));

		if (phrase != null && phrase.responses.length != 0) {
			phrase.responses.forEach(r => parseOptions(message, server, r));
			return false;
		}
	}

	return false;
}

// If something is returned from commands parse it.
// Same for phrases.
function parseOptions(message: Discord.Message, server: Server, value: DiscordBot.PhraseResponses) {
	if (typeof value != 'string') {
		switch(value.type) {
			case 'echo':
				if (value.reply) {
					message.reply(value.message);
				} else {
					message.channel.send(value.message, value.embed ? new Discord.MessageEmbed(value.embed) : undefined);
				}

				return;
			case 'interval':
				let id = value.id;
				let type = value.do;

				if (type == 'reset') {
					server.resetInterval(id);
					server.save();
				}
				return;
			case 'alias':
				// value.do
				return;
			// case 'set':
			// 	let command = value.command;
			// 	let paramId = value.paramId;
			// 	let newValue = value.newValue;

			// 	let param = CommandManager.getCommandParam(command, paramId, server.commands);
			// 	param.onCalled = newValue;

			// 	server.save(() => message.reply(`Successfully edited command "${command}"`));

			// 	return;
		}
	}

	console.log(value);
	throw 'Invalid parse Options.';
}

// TODO: Role updates

export {
	isEnabled,
	onDidCallCommand,
	defaultCommands
};