import Discord = require('discord.js');

import utils = require('../utils');
import guildClient = require('../guildClient');



function messageDelete(message: Discord.Message) {
	if (message.member == null || message.member.user.bot || message.channel.type != 'text') return;

	guildClient.get(message.guild.id, server => {
		if (server.isPluginEnabled('logs') && server.plugins.logs.textChannelId != null && server.plugins.logs.textChannelId != message.channel.id) {
			var channel = <Discord.TextChannel>message.guild.channels.get(server.plugins.logs.textChannelId);
			if (channel != null) {
				channel.send(messageDeleted(<any>message.channel, message.member, message));
			} else {
				server.plugins.logs.textChannelId = null;
				server.save();
			}
		}
	})
}

function messageDeleteBulk(messageCollection: Discord.Collection<string, Discord.Message>) {
	var messages = messageCollection.array().filter(m => m.type == 'text' && !m.member.user.bot);

	if (messages.length != 0) {
		var guildID = messages[0].guild.id;
		guildClient.get(guildID, server => {
			if (server.isPluginEnabled('logs') && server.plugins.logs.textChannelId != null && server.plugins.logs.textChannelId != messages[0].channel.id) {
				var channel = <Discord.TextChannel>messages[0].guild.channels.get(server.plugins.logs.textChannelId);
				if (channel != null) {
					channel.send(messagesDeleted(messages));
				} else {
					server.plugins.logs.textChannelId = null;
					server.save();
				}
			}
		})
	}
}

function messageUpdate(oldMessage: Discord.Message, newMessage: Discord.Message) {
	if (oldMessage.member == null || oldMessage.member.user.bot || newMessage.channel.type != 'text' || oldMessage.content == newMessage.content) return;

	guildClient.get(oldMessage.guild.id, server => {
		if (server.isPluginEnabled('logs') && server.plugins.logs.textChannelId != null) {
			var channel = <Discord.TextChannel>oldMessage.guild.channels.get(server.plugins.logs.textChannelId);
			if (channel != null) {
				channel.send(messageEdited(<any>newMessage.channel, newMessage.member, oldMessage, newMessage));
			} else {
				server.plugins.logs.textChannelId = null;
				server.save();
			}
		}
	})
}

function guildMemberAdd(guildMember: Discord.GuildMember) {
	guildClient.get(guildMember.guild.id, server => {
		if (server.isPluginEnabled('logs') && server.plugins.logs.textChannelId != null) {
			var channel = <Discord.TextChannel>guildMember.guild.channels.get(server.plugins.logs.textChannelId);
			if (channel != null) {
				//
			} else {
				server.plugins.logs.textChannelId = null;
				server.save();
			}
		}
	})
}

function guildMemberRemove(guildMember: Discord.GuildMember) {
	guildClient.get(guildMember.guild.id, server => {
		if (server.isPluginEnabled('logs') && server.plugins.logs.textChannelId != null) {
			var channel = <Discord.TextChannel>guildMember.guild.channels.get(server.plugins.logs.textChannelId);
			if (channel != null) {
				//
			} else {
				server.plugins.logs.textChannelId = null;
				server.save();
			}
		}
	})
}



function messageEdited(channel: Discord.TextChannel, member: Discord.GuildMember, oldMessage: Discord.Message, newMessage: Discord.Message) {
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

function messageDeleted(channel: Discord.TextChannel, member: Discord.GuildMember, message: Discord.Message) {
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