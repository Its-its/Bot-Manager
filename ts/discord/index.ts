import redis = require('redis');
import mongoose = require('mongoose');
import Discord = require('discord.js');


import DiscordBots = require('../site/models/discord_bots');
import DiscordServers = require('../site/models/discord_servers');

// Calls
import roles = require('./calls/roles');
import message = require('./calls/message');


import config = require('../site/util/config');

mongoose.Promise = global.Promise;
// mongoose.connect('mongodb://dev.local:27017/bot-manager', { useMongoClient: true });


let redisGuildsClient = redis.createClient({ db: '0' });
let redisRegClient = redis.createClient({ db: '1' });


// TODO: Sharding
let discordClient = new Discord.Client();


discordClient.on('ready', () => {
	console.log(' - Client ID:', discordClient.user.id);
	console.log(' - Joined ' + discordClient.guilds.size + ' Guild(s).');
});


// TODO: Express-ify events
discordClient.on('roleCreate', (role) => {
	roles.roleCreate(role, discordClient);
});

discordClient.on('roleDelete', (role) => {
	roles.roleDelete(role, discordClient);
});

discordClient.on('roleUpdate', (oldRole, newRole) => {
	roles.roleUpdate(oldRole, newRole, discordClient);
});



discordClient.on('message', msg => {
	message.received(msg, discordClient);
});


discordClient.on('guildMemberAdd', guildMember => {
	console.log(' - guildMemberAdd');
	console.log(guildMember);
});


// Server Deleted
discordClient.on('guildDelete', (guild) => {
	console.log('Left Server: ' + guild.name);

	isAwaitingRegistration(guild.id, (isAwaiting) => {
		if (isAwaiting) return redisRegClient.del(guild.id);
		
		// Remove from db and crap.
	});
});

// Server joined
discordClient.on('guildCreate', (guild) => {
	console.log('Joined Server: ' + guild.name);
	setAwaitingRegistration(guild);
});



function setAwaitingRegistration(guild: Discord.Guild) {
	redisRegClient.set(guild.id, JSON.stringify({
		id: guild.id,
		joinedTimestamp: guild.joinedTimestamp
	}));
}

function isAwaitingRegistration(id: string, cb: (isAwaiting: boolean) => void) {
	redisRegClient.exists(id, (err, pos) => {
		if (err != null) console.error(err);
		cb(pos != 0);
	});
}

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



// client.on('debug', debug => console.log(debug));


discordClient.on('channelCreate', (channel) => console.log(' - channelCreate', channel));
discordClient.on('channelDelete', (channel) => console.log(' - channelDelete', channel));
discordClient.on('channelPinsUpdate', (channel, time) => console.log(' - channelPinsUpdate', channel, time));
discordClient.on('channelUpdate', (oldChannel, newChannel) => console.log(' - channelUpdate', oldChannel, newChannel));
discordClient.on('clientUserGuildSettingsUpdate', (settings) => console.log(' - clientUserGuildSettingsUpdate', settings));
discordClient.on('clientUserSettingsUpdate', (settings) => console.log(' - clientUserSettingsUpdate', settings));
discordClient.on('disconnect', (event) => console.log(' - disconnect', event));
discordClient.on('error', (error) => console.log(' - error', error));
discordClient.on('guildBanAdd', (guild, user) => console.log(' - guildBanAdd', guild, user));
discordClient.on('guildBanRemove', (guild, user) => console.log(' - guildBanRemove', guild, user));
discordClient.on('guildDelete', (guild) => console.log(' - guildDelete', guild));
discordClient.on('guildMemberAvailable', (user) => console.log(' - guildMemberAvailable', user));
discordClient.on('guildMembersChunk', (members, guild) => console.log(' - guildMembersChunk', members, guild));
discordClient.on('guildMemberSpeaking', (user, speaking) => console.log(' - guildMemberSpeaking', speaking, user));
discordClient.on('guildMemberUpdate', (oldUser, newUser) => console.log(' - guildMemberUpdate', oldUser, newUser));
discordClient.on('guildUnavailable', (guild) => console.log(' - guildUnavailable', guild));
discordClient.on('messageDelete', (message) => console.log(' - messageDelete', message));
discordClient.on('messageDeleteBulk', (messages) => console.log(' - messageDeleteBulk', messages));
discordClient.on('messageReactionAdd', (reaction, user) => console.log(' - messageReactionAdd', reaction, user));
discordClient.on('messageReactionRemove', (reaction, user) => console.log(' - messageReactionRemove', reaction, user));
discordClient.on('messageReactionRemoveAll', (message) => console.log(' - messageReactionRemoveAll', message));
discordClient.on('messageUpdate', (oldMessage, newMessage) => console.log(' - messageUpdate', oldMessage, newMessage));
discordClient.on('reconnecting', () => console.log(' - reconnecting'));
discordClient.on('resume', (replayed) => console.log(' - resume', replayed));
discordClient.on('userNoteUpdate', (user, oldNote, newNote) => console.log(' - userNoteUpdate', user, oldNote, newNote));
discordClient.on('userUpdate', (oldUser, newUser) => console.log(' - userUpdate', oldUser, newUser));
discordClient.on('warn', (info) => console.log(' - warn', info));


discordClient.login(config.bot.discord.token);

// Kicked from server (events in order)
// - roleDelete
// - guildMemberRemove
// - guildDelete

// Invited to server
// - channelCreate
// - guildCreate
// - roleCreate
// - guildMemberUpdate