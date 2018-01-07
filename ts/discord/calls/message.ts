import redis = require('redis');

import DiscordBots = require('../../site/models/discord_bots');
import DiscordServers = require('../../site/models/discord_servers');


import CommandManager = require('../../command-manager');
import defaultCommands = require('../commands');

import { Server } from '../guildClient';


import Discord = require('discord.js');

function isAndDoCommand(message: Discord.Message, client: Server, discordClient: Discord.Client): boolean {
	if (message.author.bot) return true;

	var serverId = message.member.guild.id;
	// message.channel.send();

	// console.log(' - Server:', serverId);
	// console.log(' - Channel:', message.channel.id);
	// console.log(' - Message:', message.content);

	// Is calling a command.

	if (!client.memberIgnored(message.member.id) && CommandManager.isCallingCommand(discordClient.user.id, message.content)) {
		var commandMessage = CommandManager.getCommandMessage(discordClient.user.id, message.content);

		CommandManager.parseMessage(defaultCommands, client, commandMessage, message, (value) => {
			var shouldReply = value.reply;
	
			switch(value.type) {
				case 'echo':
					if (shouldReply) {
						message.reply(value.message);
					} else {
						message.channel.send(value.message, value.embed ? new Discord.RichEmbed(value.embed) : undefined);
					}

					return;
				case 'remove':
					var command = value.commandName;
					var paramId = value.paramId;

					client.removeCommand(command, paramId);

					client.save(() => { message.reply(`Successfully removed command "${command}"`); });

					return;
				case 'create':
					var command = value.commandName;
					var onCalled = value.message;

					client.createCommand(command, onCalled);

					client.save(() => { message.reply(`Successfully created command "${command}"`); });

					return;
				case 'set':
					var command = value.command;
					var paramId = value.paramId;
					var newValue = value.newValue;

					var param = CommandManager.getCommandParam(command, paramId, client.commands);
					param.onCalled = newValue;

					client.save(() => {
						message.reply(`Successfully edited command "${command}"`);
					});

					return;
			}
			console.log(value);
		});

		return true;
	}

	// Message check otherwise?
	return false;
}


export {
	isAndDoCommand
};
