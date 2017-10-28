import redis = require('redis');

import DiscordBots = require('../../site/models/discord_bots');
import DiscordServers = require('../../site/models/discord_servers');


import CommandManager = require('../../command-manager');
import defaultCommands = require('../commands');

import guildClient = require('../guildClient');

let redisRegClient = redis.createClient({ db: '1' });


import * as Discord from 'discord.js';

function received(message: Discord.Message, discordClient: Discord.Client) {
	if (message.author.bot) return;

	let serverId = message.member.guild.id;

	console.log(' - Server:', serverId);
	console.log(' - Channel:', message.channel.id);
	console.log(' - Message:', message.content);

	// Is calling a command.
	if (CommandManager.isCallingCommand(discordClient.user.id, message.content)) {
		let commandMessage = CommandManager.getCommandMessage(discordClient.user.id, message.content);

		new CommandManager(cb => {
			guildClient.get(
				serverId, 
				(client) => 
					cb(client == null ? [] : client.commands));
		}, defaultCommands)

		.parseMessage(commandMessage, (value) => {
			switch(value.type) {
				case 'echo': return message.reply(value.message);
				case 'remove':
					guildClient.get(serverId, (client) => {
						let command = value.commandName;
						let paramId = value.paramId;

						client.commands = CommandManager.removeCommand(command, paramId, client.commands);

						guildClient.edit(serverId, client, () => {
							message.reply(`Successfully removed command "${command}"`);
						});
					});

					return;
				case 'create':
					guildClient.get(serverId, (client) => {
						let command = value.commandName;
						let onCalled = value.message;

						client.commands.push(CommandManager.createCommand(command, onCalled));

						guildClient.edit(serverId, client, () => {
							message.reply(`Successfully created command "${command}"`);
						});
					});

					return;
				case 'set':
					let command = value.command;
					let paramId = value.paramId;
					let newValue = value.newValue;

					guildClient.get(serverId, (client) => {
						let param = CommandManager.getCommandParam(command, paramId, client.commands);

						param.onCalled = newValue;

						guildClient.edit(serverId, client, () => {
							message.reply(`Successfully edited command "${command}"`);
						});
					});

					return;
			}
			console.log(value);
		});

		return;
	}

	// Message check otherwise?
}


export {
	received
};


function registerServer(message: Discord.Message, confirmId: string) {
	let guildId = message.guild.id;

	DiscordBots.findOne({ 'confirmation_id': confirmId }, (err, bot) => {
		if (err) return console.error(err);

		if (bot == null) {
			message.reply(`Whoops! That ID does not exist! Please make sure it\'s correct! You provided the ID "${confirmId}"`);
		} else {
			if (bot['invitee_id'] != message.author.id) return message.reply('Sorry! You\'re not the owner of the bot!');

			message.reply('Found Matching ID! Registering Server. Please wait!');

			let server = new DiscordServers({
				bot_id: bot.id,
				user_id: bot['user_id'],
				server_id: guildId,
			});

			server.save((err) => {
				if (err != null) return message.reply('ERROR! | ' + err);

				bot['server_id'] = server.id;
				bot['is_registered'] = true;
				bot['is_active'] = true;

				bot.save((err) => {
					if (err != null) return message.reply('ERROR! | ' + err);
					redisRegClient.del(guildId, () => {
						message.reply('Successfully registered server! You can now have access to the galaxy\'s powers! Use this power wisely!');
					});
				});
			});
		}
	});
}