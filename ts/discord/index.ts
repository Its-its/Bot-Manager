import mongoose = require('mongoose');
import Discord = require('discord.js');
import Events = require('events');

import DiscordBots = require('../site/models/discord_bots');
import DiscordServers = require('../site/models/discord_servers');

// Calls
import roles = require('./calls/roles');
import message = require('./calls/message');

import config = require('../site/util/config');

import guildClient = require('./guildClient');


mongoose.Promise = global.Promise;
// mongoose.connect('mongodb://dev.local:27017/bot-manager', { useMongoClient: true });

// TODO: Sharding
let client = new Discord.Client();
let events: NewNode = new Events();



client.on('ready', () => {
	console.log(' - Client ID:', client.user.id);
	console.log(' - Found ' + client.guilds.size + ' Guild(s).');
	client.guilds.forEach(g => console.log(' -  - ' + g.id +  ' | ' + g.name + ' | ' + g.region));
});


// TODO: Express-ify events
client.on('roleCreate', (role) => {
	roles.roleCreate(role, client);
});

client.on('roleDelete', (role) => {
	roles.roleDelete(role, client);
});

client.on('roleUpdate', (oldRole, newRole) => {
	roles.roleUpdate(oldRole, newRole, client);
});



client.on('message', msg => {
	var serverId = msg.member.guild.id;

	guildClient.get(serverId, server => {
		if (server.channelIgnored(msg.channel.id)) return;

		if (!message.isAndDoCommand(msg, server, client)) {
			// events.emit('message', msg, client);

			if (server.hasBlacklistedWord(msg.content)) {
				msg.reply('Blacklisted.');
			}
		}
	});
});


client.on('guildMemberAdd', guildMember => {
	console.log(' - guildMemberAdd');
	console.log(guildMember);
});


// Server Deleted
client.on('guildDelete', (guild) => {
	console.log('Left Server: ' + guild.name);
});

// Server joined
client.on('guildCreate', (guild) => {
	console.log('Joined Server: ' + guild.name);
	console.log(guild);
});


// client.on('debug', debug => console.log(debug));


client.on('channelCreate', (channel) => console.log(' - channelCreate', channel));
client.on('channelDelete', (channel) => console.log(' - channelDelete', channel));
client.on('channelPinsUpdate', (channel, time) => console.log(' - channelPinsUpdate', channel, time));
client.on('channelUpdate', (oldChannel, newChannel) => console.log(' - channelUpdate', oldChannel, newChannel));
client.on('clientUserGuildSettingsUpdate', (settings) => console.log(' - clientUserGuildSettingsUpdate', settings));
client.on('clientUserSettingsUpdate', (settings) => console.log(' - clientUserSettingsUpdate', settings));
client.on('disconnect', (event) => console.log(' - disconnect', event));
client.on('error', (error) => console.log(' - error', error));
client.on('guildBanAdd', (guild, user) => console.log(' - guildBanAdd', guild, user));
client.on('guildBanRemove', (guild, user) => console.log(' - guildBanRemove', guild, user));
client.on('guildDelete', (guild) => console.log(' - guildDelete', guild));
client.on('guildMemberAvailable', (user) => console.log(' - guildMemberAvailable', user));
client.on('guildMembersChunk', (members, guild) => console.log(' - guildMembersChunk', members, guild));
client.on('guildMemberSpeaking', (user, speaking) => console.log(' - guildMemberSpeaking', speaking, user));
client.on('guildMemberUpdate', (oldUser, newUser) => console.log(' - guildMemberUpdate', oldUser, newUser));
client.on('guildUnavailable', (guild) => console.log(' - guildUnavailable', guild));
client.on('messageDelete', (message) => console.log(' - messageDelete', message));
client.on('messageDeleteBulk', (messages) => console.log(' - messageDeleteBulk', messages));
client.on('messageReactionAdd', (reaction, user) => console.log(' - messageReactionAdd', reaction, user));
client.on('messageReactionRemove', (reaction, user) => console.log(' - messageReactionRemove', reaction, user));
client.on('messageReactionRemoveAll', (message) => console.log(' - messageReactionRemoveAll', message));
client.on('messageUpdate', (oldMessage, newMessage) => console.log(' - messageUpdate'));
client.on('reconnecting', () => console.log(' - reconnecting'));
client.on('resume', (replayed) => console.log(' - resume', replayed));
client.on('userNoteUpdate', (user, oldNote, newNote) => console.log(' - userNoteUpdate', user, oldNote, newNote));
client.on('userUpdate', (oldUser, newUser) => console.log(' - userUpdate', oldUser, newUser));
client.on('warn', (info) => console.log(' - warn', info));


client.login(config.bot.discord.token);

// Kicked from server (events in order)
// - roleDelete
// - guildMemberRemove
// - guildDelete

// Invited to server
// - channelCreate
// - guildCreate
// - roleCreate
// - guildMemberUpdate

export {
	client,
	events
};

interface NewNode extends NodeJS.EventEmitter {
	on(event: 'message', listener: (message: Discord.Message, userOptions: guildClient.Server) => void): this;
}