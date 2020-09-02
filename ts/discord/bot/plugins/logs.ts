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

function messageDelete(message: Discord.Message) {
	if (message.member == null || message.member.user.bot || message.channel.type != 'text') return;

	guildClient.get(message.guild.id, server => {
		if (server == null || !server.isPluginEnabled('logs')) return;

		let logs = server.plugins.logs!;

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
				var channel = <Discord.TextChannel>message.guild.channels.get(log_channel.id);

				if (channel != null) {
					channel.send(messageDeleted(message.channel, message.member, message));
				} else {
					let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
					server.plugins.logs!.channels.splice(index_of, 1);
					server.save();
				}
			}

		}
	})
}

function messageDeleteBulk(messageCollection: Discord.Collection<string, Discord.Message>) {
	var messages = messageCollection.array().filter(m => m.type == 'text' && !m.member.user.bot);

	if (messages.length != 0) {
		var guildID = messages[0].guild.id;
		guildClient.get(guildID, server => {
			if (server == null || !server.isPluginEnabled('logs')) return;

			let logs = server.plugins.logs!;

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
					var channel = <Discord.TextChannel>messages[0].guild.channels.get(log_channel.id);

					if (channel != null) {
						channel.send(messagesDeleted(messages));
					} else {
						let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
						server.plugins.logs!.channels.splice(index_of, 1);
						server.save();
					}
				}

			}
		})
	}
}

function messageUpdate(oldMessage: Discord.Message, newMessage: Discord.Message) {
	if (oldMessage.member == null || oldMessage.member.user.bot || newMessage.channel.type != 'text' || oldMessage.content == newMessage.content) return;

	guildClient.get(oldMessage.guild.id, server => {
		if (server == null || !server.isPluginEnabled('logs')) return;

		let logs = server.plugins.logs!;

		let sorted = logs.channels.sort(sortChannel);

		(<Discord.TextChannel>oldMessage.channel).parent

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
			var channel = <Discord.TextChannel>oldMessage.guild.channels.get(log_channel.id);

			if (channel != null) {
				channel.send(messageEdited(newMessage.channel, newMessage.member, oldMessage, newMessage));
			} else {
				let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
				server.plugins.logs!.channels.splice(index_of, 1);
				server.save();
			}
		}
	})
}

function guildMemberAdd(guildMember: Discord.GuildMember) {
	guildClient.get(guildMember.guild.id, server => {
		if (server == null || !server.isPluginEnabled('logs')) return;

		let logs = server.plugins.logs!;

		let sorted = logs.channels.sort((a, b) => def(b.priority) - def(a.priority));

		let log_channel = sorted.find((c) => {
			// Is in filter members?
			if (c.filterMembersAddRemove != null && (c.filterMembersAddRemove == 0 || c.filterMembersAddRemove == 2)) {
				return true;
			}

			return false;
		});

		if (log_channel != null) {
			var channel = <Discord.TextChannel>guildMember.guild.channels.get(log_channel.id);

			if (channel != null) {
				//
			} else {
				let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
				server.plugins.logs!.channels.splice(index_of, 1);
				server.save();
			}
		}
	})
}

function guildMemberRemove(guildMember: Discord.GuildMember) {
	guildClient.get(guildMember.guild.id, server => {
		if (server == null || !server.isPluginEnabled('logs')) return;

		let logs = server.plugins.logs!;

		let sorted = logs.channels.sort((a, b) => def(b.priority) - def(a.priority));

		let log_channel = sorted.find((c) => {
			// Is in filter members?
			if (c.filterMembersAddRemove != null && (c.filterMembersAddRemove == 1 || c.filterMembersAddRemove == 2)) {
				return true;
			}

			return false;
		});

		if (log_channel != null) {
			var channel = <Discord.TextChannel>guildMember.guild.channels.get(log_channel.id);

			if (channel != null) {
				//
			} else {
				let index_of = logs.channels.findIndex(c => c.id == log_channel!.id);
				server.plugins.logs!.channels.splice(index_of, 1);
				server.save();
			}
		}
	})
}



function messageEdited(channel: Discord.TextChannel | Discord.DMChannel | Discord.GroupDMChannel, member: Discord.GuildMember, oldMessage: Discord.Message, newMessage: Discord.Message) {
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
				icon_url: member.user.displayAvatarURL
			},
			fields: [
				{
					name: 'Previous',
					value: oldMessage.content.slice(0, 975)
				},
				{
					name: 'New',
					value: newMessage.content.slice(0, 975)
				}
			]
		}
	}
}

function messageDeleted(channel: Discord.TextChannel | Discord.DMChannel | Discord.GroupDMChannel, member: Discord.GuildMember, message: Discord.Message) {
	return {
		embed: {
			description: `**Message sent by <@${member.id}> deleted from <#${channel.id}> **\n` + message.content.slice(0, 1900),
			color: utils.ErrorColor,
			timestamp: new Date().toISOString(),
			footer: {
				text: 'User ID: ' + member.id
			},
			author: {
				name: member.user.tag,
				icon_url: member.user.displayAvatarURL
			}
		}
	}
}

function messagesDeleted(messages: Discord.Message[]) {
	return {
		embed: {
			title: '**Mass Message Deletion**',
			description: messages.length + ' messages deleted.',
			color: utils.ErrorColor,
			timestamp: new Date().toISOString(),
			fields: messages.map(m => {
				return {
					name: 'From ' + m.member.user.tag + ' in <#' + (<Discord.TextChannel>m.channel).id + '>',
					value: m.content.slice(0, Math.floor(2000/messages.length))
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