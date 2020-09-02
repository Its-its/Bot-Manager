import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');
import { DiscordBot } from '@type-manager';

// Custom events
// - On react to certain message.
// - On join
// - On leave (donor)


// events add react 01010 :check:
// events edit 1a03s (paged)
// events remove 1a03s


//! Should I pick a different name? And have a plugin dedicated to events; polls,
//! could call THIS one listeners?

function onReactAdd(reaction: Discord.MessageReaction, user: Discord.User, server: DiscordServer) {
	if (!server.isPluginEnabled('events') || server.events.length == 0) return false;

	for(var i = 0; i < server.events.length; i++) {
		var listening = server.events[i];

		if (listening.type == 'react_add') {
			if (listening.message_id == reaction.message.id) {
				if (listening.emoji_id == reaction.emoji.id) {
					switch(listening.event.type) {
						case 'role':
							var member = reaction.message.guild!.members.cache.get(user.id);

							if (member == null) return;

							doGroup(listening.event, reaction.message.guild!, member);
							break;
						// case 'message': break;
						// case 'dm': break;
					}

					return true;
				}
				break;
			}
		}
	}

	return false;
}

function guildMemberAdd(member: Discord.GuildMember, server: DiscordServer) {
	if (!server.isPluginEnabled('events') || server.events.length == 0) return false;

	for(var i = 0; i < server.events.length; i++) {
		var listening = server.events[i];

		if (listening.type == 'member_add') {
			switch(listening.event.type) {
				case 'role': doGroup(listening.event, member.guild, member); break;
				// case 'message': doMessage(listening.event, member); break;
				case 'dm': doDirectMessage(listening.event, member); break;
			}

			return true;
		}
	}

	return false;
}

function guildMemberRemove(member: Discord.GuildMember, server: DiscordServer) {
	if (!server.isPluginEnabled('events') || server.events.length == 0) return false;

	for(var i = 0; i < server.events.length; i++) {
		var listening = server.events[i];

		if (listening.type == 'member_remove') {
			switch(listening.event.type) {
				case 'role': doGroup(listening.event, member.guild, member); break;
				// case 'message': doMessage(listening.event, member); break;
				case 'dm': doDirectMessage(listening.event, member); break;
			}

			return true;
		}
	}

	return false;
}


function doGroup(event: DiscordBot.DoGroupEvent, guild: Discord.Guild, member: Discord.GuildMember) {
	if (event.role_id == null) return;

	switch(event.do) {
		case 'add':
			member.roles.add(event.role_id)
			.catch((e: any) => console.error(e));
			break;
		case 'remove':
			member.roles.remove(event.role_id)
			.catch((e: any) => console.error(e));
			break;
	}
}

function doMessage(event: DiscordBot.DoMessageEvent, member: Discord.GuildMember) {
	if (event.channel_id == null) return;

	var channel = <Discord.TextChannel>member.guild.channels.cache.get(event.channel_id);

	if (channel != null) {
		channel.send(event.message)
		.catch(e => console.error(e));

		return true;
	}

	return false;
}

function doDirectMessage(event: DiscordBot.DoDirectMessageEvent, member: Discord.GuildMember) {
	member.createDM()
	.then(channel => {
		channel.send(event.message)
		.catch(e => console.error(e));
	})
	.catch(e => console.error(e));


	return true;
}


export {
	onReactAdd,
	guildMemberAdd,
	guildMemberRemove
}