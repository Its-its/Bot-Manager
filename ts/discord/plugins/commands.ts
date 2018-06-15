import Discord = require('discord.js');
import Server = require('../discordserver');

import CommandManager = require('../../command-manager');
import defaultCommands = require('../commands');

const prefix = '~';


function isEnabled(server: Server): boolean {
	return server.plugins.commands == null ? true : server.plugins.commands.enabled;
}

function onMessage(bot_id: string, message: Discord.Message, server: Server): boolean {
	if (message.author.bot) return true;

	var serverId = message.member.guild.id;

	if (!server.memberIgnored(message.member.id)) {
		if (CommandManager.isCallingCommand(prefix, bot_id, message.content)) {
			var commandMessage = CommandManager.getCommandMessage(prefix, bot_id, message.content).trim();

			if (commandMessage.length == 0) return true;

			var comm = commandMessage.split(' ', 2)[0].toLowerCase();

			// Not enabled? Not "plugin" or "perms"? Doesn't have bypasstoggle perm? return
			if (!isEnabled(server) && comm != 'plugin' && comm != 'perms' && !server.userHasFullPerm(bot_id, 'commands.bypasstoggle')) return true;

			// Check if cannot call command.
			// Not admin? not enabled?
			// if (!message.member.hasPermission('ADMINISTRATOR') && (!isEnabled(server) && !server.userHasBasePerm(bot_id, 'commands.' + comm))) return true;

			CommandManager.parseMessage(defaultCommands, server, commandMessage, message, parseOptions);

			return true;
		} else {
			var phrase = server.findPhrase(message.content.split(' '));

			if (phrase != null && phrase.responses.length != 0) {
				phrase.responses.forEach(r => parseOptions(r));
				return true;
			}
		}

		function parseOptions(value: DiscordBot.PhraseResponses) {
			if (typeof value != 'string') {
				switch(value.type) {
					case 'echo':
						if (value.reply) {
							message.reply(value.message);
						} else {
							message.channel.send(value.message, value.embed ? new Discord.RichEmbed(value.embed) : undefined);
						}
	
						return;
					case 'interval':
						var id = value.id;
						var type = value.do;
	
						if (type == 'reset') {
							server.resetInterval(id);
							server.save();
						}
						return;
					// case 'set':
					// 	var command = value.command;
					// 	var paramId = value.paramId;
					// 	var newValue = value.newValue;
			
					// 	var param = CommandManager.getCommandParam(command, paramId, server.commands);
					// 	param.onCalled = newValue;
			
					// 	server.save(() => message.reply(`Successfully edited command "${command}"`));
			
					// 	return;
				}
			}

			console.log(value);
		}

	}

	// Message check otherwise?
	return false;
}

export {
	isEnabled,
	onMessage
};