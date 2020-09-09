import Discord = require('discord.js');

import utils = require('../../utils');
import guildClient = require('../../guildClient');
import { DiscordBot } from '@type-manager';

function sortChannel(a: DiscordBot.PluginLogsChannel, b: DiscordBot.PluginLogsChannel): number {
	return def(b.priority) - def(a.priority);
}

function def(n?: number): number {
	return n == null ? 0 : n;
}

async function messageDelete(message: Discord.Message | Discord.PartialMessage) {
	if (message.member == null || message.member.user.bot || message.channel.type != 'text') return;

	let server = await guildClient.get(message.guild!.id);

	if (server == null || !server.isPluginEnabled('logs')) return;

	let logs = server.plugins.logs!;

	if (logs.channels == null) {
		logs.channels = [];
	}

	let not_a_log_chann = logs.channels.find(c => c.id == message.channel.id) == null;

	if (not_a_log_chann) {
		let sorted = logs.channels.sort(sortChannel);

		let log_channel = sorted.find((c) => {
			// Is in filter channel?
			if (c.filterChannels != null) {
				if (c.filterChannels.indexOf(message.channel.id) != -1) {
					return true;
				}

				let parent = (<Discord.TextChannel>message.channel).parent;
				if (parent != null && c.filterChannels.indexOf(parent.id) != -1) {
					return true;
				}
			}

			// Otherwise, find a "default".
			return c.filterChannels == null;
		});

		if (log_channel != null) {
			let channel = <Discord.TextChannel>message.guild!.channels.cache.get(log_channel.id);

			if (channel != null) {
				await channel.send(messageDeleted(message.channel, message.member!, message));
			} else {
				let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
				logs.channels.splice(index_of, 1);

				await server.save();
			}
		}
	}
}

async function messageDeleteBulk(messageCollection: Discord.Collection<string, Discord.Message | Discord.PartialMessage>) {
	let messages = messageCollection.array().filter(m => m.type == 'DEFAULT' && !m.member!.user.bot);

	if (messages.length != 0) {
		let guildID = messages[0].guild!.id;

		let server = await guildClient.get(guildID);

		if (server == null || !server.isPluginEnabled('logs')) return;

		let logs = server.plugins.logs!;

		if (logs.channels == null) {
			logs.channels = [];
		}

		let not_a_log_chann = logs.channels.find(c => c.id == messages[0].channel.id) == null;

		if (not_a_log_chann) {
			let sorted = logs.channels.sort(sortChannel);

			let log_channel = sorted.find((c) => {
				// Is in filter channel?
				if (c.filterChannels != null) {
					if (c.filterChannels.indexOf(messages[0].channel.id) != -1) {
						return true;
					}

					let parent = (<Discord.TextChannel>messages[0].channel).parent;
					if (parent != null && c.filterChannels.indexOf(parent.id) != -1) {
						return true;
					}
				}


				// Otherwise, find a "default".
				return c.filterChannels == null;
			});

			if (log_channel != null) {
				let channel = <Discord.TextChannel>messages[0].guild!.channels.cache.get(log_channel.id);

				if (channel != null) {
					await channel.send(messagesDeleted(messages));
				} else {
					let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
					logs.channels.splice(index_of, 1);

					await server.save();
				}
			}
		}
	}
}

async function messageUpdate(oldMessage: Discord.Message | Discord.PartialMessage, newMessage: Discord.Message | Discord.PartialMessage) {
	if (oldMessage.member == null || oldMessage.member.user.bot || newMessage.channel.type != 'text' || oldMessage.content == newMessage.content) return;

	let server = await guildClient.get(oldMessage.guild!.id);

	if (server == null || !server.isPluginEnabled('logs')) return;

	let logs = server.plugins.logs!;

	if (logs.channels == null) {
		logs.channels = [];
	}

	let sorted = logs.channels.sort(sortChannel);

	let log_channel = sorted.find((c) => {
		// Is in filter channel?
		if (c.filterChannels != null) {
			if (c.filterChannels.indexOf(oldMessage.channel.id) != -1) {
				return true;
			}

			let parent = (<Discord.TextChannel>oldMessage.channel).parent;
			if (parent != null && c.filterChannels.indexOf(parent.id) != -1) {
				return true;
			}
		}

		// Otherwise, find a "default".
		return c.filterChannels == null;
	});

	if (log_channel != null) {
		let channel = <Discord.TextChannel>oldMessage.guild!.channels.cache.get(log_channel.id);

		if (channel != null) {
			await channel.send(messageEdited(newMessage.channel, newMessage.member!, oldMessage, newMessage));
		} else {
			let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
			logs.channels.splice(index_of, 1);

			await server.save();
		}
	}
}

async function guildMemberAdd(guildMember: Discord.GuildMember) {
	let server = await guildClient.get(guildMember.guild.id);

	if (server == null || !server.isPluginEnabled('logs')) return;

	let logs = server.plugins.logs!;

	if (logs.channels == null) {
		logs.channels = [];
	}

	let sorted = logs.channels.sort(sortChannel);

	let log_channel = sorted.find((c) => {
		// Is in filter members?
		if (c.filterMembersAddRemove != null && (c.filterMembersAddRemove == 0 || c.filterMembersAddRemove == 2)) {
			return true;
		}

		return false;
	});

	if (log_channel != null) {
		let channel = <Discord.TextChannel>guildMember.guild.channels.cache.get(log_channel.id);

		if (channel != null) {
			//
		} else {
			let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
			logs.channels.splice(index_of, 1);

			await server.save();
		}
	}
}

async function guildMemberRemove(guildMember: Discord.GuildMember) {
	let server = await guildClient.get(guildMember.guild.id);

	if (server == null || !server.isPluginEnabled('logs')) return;

	let logs = server.plugins.logs!;

	if (logs.channels == null) {
		logs.channels = [];
	}

	let sorted = logs.channels.sort(sortChannel);

	let log_channel = sorted.find((c) => {
		// Is in filter members?
		if (c.filterMembersAddRemove != null && (c.filterMembersAddRemove == 1 || c.filterMembersAddRemove == 2)) {
			return true;
		}

		return false;
	});

	if (log_channel != null) {
		let channel = <Discord.TextChannel>guildMember.guild.channels.cache.get(log_channel.id);

		if (channel != null) {
			//
		} else {
			let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
			logs.channels.splice(index_of, 1);

			await server.save();
		}
	}
}



function messageEdited(channel: Discord.TextChannel | Discord.DMChannel | Discord.PartialGroupDMChannel | Discord.NewsChannel, member: Discord.GuildMember, oldMessage: Discord.Message | Discord.PartialMessage, newMessage: Discord.Message | Discord.PartialMessage) {
	return {
		embed: {
			description: `**Message edited in <#${channel.id}>**`,
			color: utils.InfoColor,
			timestamp: new Date().toISOString(),
			footer: {
				text: 'User ID: ' + member.id
			},
			author: {
				name: member.user.tag,
				icon_url: member.user.displayAvatarURL()
			},
			fields: [
				{
					name: 'Previous',
					value: (oldMessage.content || '').slice(0, 975)
				},
				{
					name: 'New',
					value: (newMessage.content || '').slice(0, 975)
				}
			]
		}
	}
}

function messageDeleted(channel: Discord.TextChannel | Discord.DMChannel | Discord.PartialGroupDMChannel | Discord.NewsChannel, member: Discord.GuildMember, message: Discord.Message | Discord.PartialMessage) {
	return {
		embed: {
			description: `**Message sent by <@${member.id}> deleted from <#${channel.id}> **\n` + (message.content || '').slice(0, 1900),
			color: utils.ErrorColor,
			timestamp: new Date().toISOString(),
			footer: {
				text: 'User ID: ' + member.id
			},
			author: {
				name: member.user.tag,
				icon_url: member.user.displayAvatarURL()
			}
		}
	}
}

function messagesDeleted(messages: (Discord.Message | Discord.PartialMessage)[]) {
	return {
		embed: {
			title: '**Mass Message Deletion**',
			description: messages.length + ' messages deleted.',
			color: utils.ErrorColor,
			timestamp: new Date().toISOString(),
			fields: messages.map(m => {
				return {
					name: 'From ' + m.member!.user.tag + ' in <#' + (<Discord.TextChannel>m.channel).id + '>',
					value: (m.content || '').slice(0, Math.floor(2000/messages.length))
				}
			})
		}
	}
}

function inviteCreated() {
	//
}

function memberJoin() {
	//
}

function memberLeave() {
	//
}



export {
	messageDelete,
	messageDeleteBulk,
	messageUpdate,
	guildMemberAdd,
	guildMemberRemove
};