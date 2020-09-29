// Ability to record audio of people in channel.

// Donor perk? Ability to have a mp3/video/transcript of what was recorded in the channel.

console.log('DISCORD: RECORDING');

import { CustomDocs, DiscordBot, Nullable } from '@type-manager';

import * as Discord from 'discord.js';
import { Readable } from 'stream';


import fs = require('fs');
import path = require('path');


import mongoose = require('mongoose');

// import { getRecordingData, newRecordingData, deleteRecordingData } from './guild_recording';

import config = require('@config');
import utils = require('../utils');


if (config.debug) mongoose.set('debug', true);
mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true });

import client = require('../client');


if (client.shard != null && client.shard.count != 0) {
	shardListener();
}

const RECORDING_DIRECTORY = path.join(__dirname, '../../../app/recordings');

fs.mkdir(RECORDING_DIRECTORY, err => err && console.error(err));

const active_streams: { [guild_id: string]: GuildStream } = {};


interface MemberStream {
	started_at: number;
	channel_id: string;
	stream: Readable;
}

class GuildStream {
	members: { [member_id: string]: MemberStream } = {};

	started_at = Date.now();

	channel: Discord.VoiceChannel;

	infoFile: fs.WriteStream;
	directory: string;

	constructor(directory: string, channel: Discord.VoiceChannel) {
		this.directory = directory;
		this.channel = channel;

		this.infoFile = fs.createWriteStream(path.join(directory, 'member-states.txt'), 'utf-8');

		// Started At
		this.infoFile.write(`${this.started_at}\n`);
		this.infoFile.write('\n');

		// Guild Info
		this.infoFile.write(`${channel.guild.id}\n`);
		this.infoFile.write(`${channel.guild.name}\n`);
		this.infoFile.write(`${channel.guild.region}\n`);
		this.infoFile.write(`${channel.guild.memberCount}\n`);
		this.infoFile.write('\n');

		// Channel Info
		this.infoFile.write(`${channel.id}\n`);
		this.infoFile.write(`${channel.name}\n`);
		this.infoFile.write(`${channel.userLimit}\n`);
		this.infoFile.write(`${channel.bitrate}\n`);
		this.infoFile.write('\n');
	}

	public selfdestruct() {
		Object.values(this.members)
		.forEach(m => m.stream.destroy());

		this.infoFile.destroy();
		this.infoFile.close();
	}

	// Member Functions
	public createMember(member_id: string, channel_id: string, started_at: number, stream: Readable) {
		const fileName = `${channel_id}-${member_id}-${started_at}.pcm`;

		this.infoFile.write(`user-file ${fileName}\n`);

		stream.pipe(fs.createWriteStream(path.join(this.directory, fileName), { encoding: 'binary' }));

		if (this.hasMember(member_id)) {
			console.log(`Somehow didn't remove member (${member_id}) before re-creating it.`);
			this.removeMember(member_id);
		}


		this.members[member_id] = {
			channel_id,
			stream,
			started_at
		};
	}

	public removeMember(member_id: string) {
		if (this.hasMember(member_id)) {
			this.members[member_id].stream.destroy();

			delete this.members[member_id];

			return true;
		}

		return false;
	}

	public hasMember(member_id: string) {
		return this.members[member_id] != null;
	}


	// Member Updates

	public memberStateUpdate(oldState: Discord.VoiceState, newState: Discord.VoiceState) {
		if (newState.member == null) return;

		// Check 'self' first.

		if (oldState.selfMute != newState.selfMute) {
			newState.selfMute ? this.memberSelfMute(newState.member) : this.memberUnMute(newState.member);
		} else if (oldState.serverMute != newState.serverMute) {
			newState.serverMute ? this.memberServerMute(newState.member) : this.memberUnMute(newState.member);
		}

		if (oldState.selfDeaf != newState.selfDeaf) {
			newState.selfDeaf ? this.memberSelfDeaf(newState.member) : this.memberUnDeaf(newState.member);
		} else if (oldState.serverDeaf != newState.serverDeaf) {
			newState.serverDeaf ? this.memberServerDeaf(newState.member) : this.memberUnDeaf(newState.member);
		}

		if (oldState.selfVideo != newState.selfVideo) {
			newState.selfVideo ? this.memberSelfVideo(newState.member) : this.memberSelfVideoStop(newState.member);
		}

		if (oldState.streaming != newState.streaming) {
			newState.selfVideo ? this.memberStreaming(newState.member) : this.memberStreamingStop(newState.member);
		}
	}

	public memberDocument(member: Discord.GuildMember) {
		if (member.voice.serverMute) {
			this.memberServerMute(member);
		} else if (member.voice.selfMute) {
			this.memberSelfMute(member);
		}

		if (member.voice.serverDeaf) {
			this.memberServerDeaf(member);
		} else if (member.voice.selfDeaf) {
			this.memberSelfDeaf(member);
		}
	}

	public memberJoined(member: Discord.GuildMember) {
		this.write(member, 'join');
	}

	public memberLeft(member: Discord.GuildMember) {
		this.write(member, 'leave');
	}

	public memberTalking(member: Discord.GuildMember, isTalking: boolean) {
		this.write(member, `speaking ${isTalking ? 1 : 0}`);
	}

	public memberServerMute(member: Discord.GuildMember) {
		this.write(member, 'server-mute');
	}

	public memberSelfMute(member: Discord.GuildMember) {
		this.write(member, 'self-mute');
	}

	public memberUnMute(member: Discord.GuildMember) {
		this.write(member, 'un-mute');
	}

	public memberSelfDeaf(member: Discord.GuildMember) {
		this.write(member, 'self-deaf');
	}

	public memberServerDeaf(member: Discord.GuildMember) {
		this.write(member, 'server-deaf');
	}

	public memberUnDeaf(member: Discord.GuildMember) {
		this.write(member, 'un-deaf');
	}

	public memberSelfVideo(member: Discord.GuildMember) {
		this.write(member, 'self-video');
	}

	public memberSelfVideoStop(member: Discord.GuildMember) {
		this.write(member, 'self-video-stop');
	}

	public memberStreaming(member: Discord.GuildMember) {
		this.write(member, 'streaming');
	}

	public memberStreamingStop(member: Discord.GuildMember) {
		this.write(member, 'streaming-stop');
	}

	public write(member: Discord.GuildMember, value: string) {
		console.log(`[${new Date().toLocaleTimeString()}]: ${value}`);

		this.infoFile.write(`${this.prefixData(member)}: ${value}\n`);
	}

	// SINCE  DISC ID      Nick Name       name#dis : reason
	// 12345 010101010 "[Admin] #DJ Its_" "Its#0001": joined
	public prefixData(member: Discord.GuildMember) {
		return `${Date.now() - this.started_at} ${member.id} "${member.nickname}" "${member.user.username}#${member.user.discriminator}"`;
	}
}



function getRecording(guild_id: string): Nullable<GuildStream> {
	return active_streams[guild_id];
}

function getOrCreateRecordingStream(guild_id: string, channel: Discord.VoiceChannel) {
	let guild = getRecording(guild_id);

	if (guild == null) {
		guild = active_streams[guild_id] = new GuildStream(RECORDING_DIRECTORY, channel);
	}

	return guild;
}

function createRecordingStream(startTime: number, connection: Discord.VoiceConnection, member: Discord.GuildMember, channel: Discord.VoiceChannel): Readable {
	console.log('Recording ' + member.displayName + ' (' + member.id + ')');

	let guild = getRecording(connection.channel.guild.id);

	if (guild == null) {
		guild = active_streams[connection.channel.guild.id] = new GuildStream(RECORDING_DIRECTORY, channel);
	}

	let stream = connection.receiver.createStream(member.id, { mode: 'pcm', end: 'manual' });

	guild.createMember(member.id, channel.id, startTime, stream);

	return stream;
}

function removeRecordingStreamForMember(guild_id: string, member_id: string) {
	let guild_stream = getRecording(guild_id);

	if (guild_stream != null) {
		console.log('Stopping Recording ' + member_id);
		guild_stream.removeMember(member_id);

	}
}

function removeRecordingStream(guild_id: string) {
	let guild_stream = getRecording(guild_id);

	// Delete Guild Stream if no one is being recorded anymore.
	if (guild_stream != null && Object.values(guild_stream.members).length == 0) {
		guild_stream.selfdestruct();
		delete active_streams[guild_id];

		return true;
	}

	return false;
}

function isRecordingStream(guild_id: string, member_id: string) {
	let guild = getRecording(guild_id);
	return guild != null && guild.hasMember(member_id);
}

function isRecording(guild_id: string) {
	return getRecording(guild_id) != null;
}

function initConnection(connection: Discord.VoiceConnection) {
	console.log('initConnection');

	const now = Date.now();

	const guild = getOrCreateRecordingStream(connection.channel.guild.id, connection.channel);

	// TODO: Figure out a 1 sec delay.
	// When you stop speaking it can toggle off, on, off again. Each toggle around ~100ms
	connection.on('speaking', (user, speaking) => {
		connection.channel.guild.members.fetch(user.id)
		.then(member => guild.memberTalking(member, speaking.bitfield == 1))
		.catch(console.error);
	});

	// TODO
	// connection.on('reconnecting', () => removeRecordingStream(connection.channel.guild.id));
	connection.on('reconnecting', () => console.log('Reconnecting'));

	connection.on('newSession', (...values) => console.log('New Session', values))
	connection.on('ready', (...values) => console.log('Ready', values))

	connection.on('warn', error => console.log('Warn:', error));
	connection.on('disconnect', () => removeRecordingStream(connection.channel.guild.id));

	connection.channel.members.forEach(member => {
		guild.memberDocument(member);

		if (member.user.bot || member.voice.deaf || member.voice.mute) return;

		createRecordingStream(now, connection, member, connection.channel);
	});
}


function shardListener() {
	process.on('message', utils.asyncFnWrapper(async msg => {
		if (msg._eval || msg._sEval) return; // Discord shard eval starts with _eval/_sEval

		console.log(`[SHARD ${client.shard!.count}]:`, msg);

		if (msg._event) {
			const guild_id: string = msg._guild,
				channel_id: string = msg._channel,
				sender_id: string = msg._sender;

			const guild = await client.guilds.fetch(guild_id);

			if (guild == null) return;

			const channel = <Discord.VoiceChannel | null>guild.channels.resolve(channel_id);

			if (channel == null) return;

			switch(msg._event) {
				case 'start': {
					let connection = await joinVoiceChannel(guild_id, channel_id);

					initConnection(connection);

					console.log('Starting');
					break;
				}

				default: console.log('UNKNOWN EVENT: ', msg);
			}

		}

		return Promise.resolve();
	}));
}


client.on('ready', utils.asyncFnWrapper(async () => {
	console.log(' - Client ID:' + client.user!.id);
	console.log(' - Found ' + client.guilds.cache.size + ' Guild(s).');

	await client.shard!.send('ready');
}));

client.on('error', e => console.error(e));


client.on('channelDelete', () => {
	// console.log('channelDelete:', channel);
});


type UpdateTypes = 'deaf' | 'mute' | 'selfDeaf' | 'selfMute' | 'selfVideo' | 'serverMute' | 'serverDeaf' | 'speaking' | 'streaming';
let UPDATE_TYPES: UpdateTypes[] = ['deaf', 'mute', 'selfDeaf', 'selfMute', 'selfVideo', 'serverMute', 'serverDeaf', 'speaking', 'streaming'];

client.on('voiceStateUpdate', utils.asyncFnWrapper(async (oldMember, newMember) => {
	if (newMember.member == null) return;
	if (newMember.member.user.bot) return;

	let recording = getRecording(newMember.guild.id);

	if (recording != null && client.voice != null) {
		const connection = client.voice.connections.get(newMember.guild.id);

		// Neither in the recording channel.
		if ((newMember.channel == null || recording.channel.id != newMember.channel.id) &&
			(oldMember.channel == null || recording.channel.id != oldMember.channel.id)
		) return;

		// Member update in channel.
		if (newMember.channel != null &&
			oldMember.channel != null &&
			recording.channel.id == newMember.channel.id &&
			oldMember.channel.id == newMember.channel.id &&
			newMember.channel.members.has(client.user!.id)
		) {
			let updates: { [key in UpdateTypes]?: boolean | null } = {};

			UPDATE_TYPES.forEach(i => {
				if (oldMember[i] == newMember[i]) return;
				updates[i] = newMember[i];
			} );

			console.log('Updates: ', updates);

			getOrCreateRecordingStream(newMember.guild.id, newMember.channel)
			.memberStateUpdate(oldMember, newMember);

			// If user is now deaf or muted. Remove him from the recording.
			if (updates.deaf === true || updates.mute === true) {
				removeRecordingStreamForMember(newMember.guild.id, newMember.id);
			}
			// If user is not recorded and is not muted and not deaf.
			else if (!isRecordingStream(newMember.guild.id, newMember.id) && newMember.mute === false && newMember.deaf === false) {
				if (connection != null && newMember.channel != null) {
					createRecordingStream(Date.now(), connection, newMember.member, newMember.channel);
				}
			}

			return;
		}

		// Left channel.
		if (oldMember.channel != null && recording.channel.id == oldMember.channel.id && oldMember.channel.members.has(client.user!.id)) {
			console.log('User Left: ' + newMember.id + ' -> ' + newMember.channelID);

			getOrCreateRecordingStream(newMember.guild.id, oldMember.channel)
			.memberLeft(newMember.member);

			removeRecordingStreamForMember(newMember.guild.id, newMember.id);

			await shouldLeaveChannel(oldMember.channel);

			return;
		}

		// Joined Channel
		if (newMember.channel != null && recording.channel.id == newMember.channel.id && newMember.channel.members.has(client.user!.id)) {
			console.log('User Join: ' + newMember.id + ' -> ' + newMember.channelID);

			getOrCreateRecordingStream(newMember.guild.id, newMember.channel)
			.memberJoined(newMember.member);

			if (connection != null && newMember.member != null) {
				createRecordingStream(Date.now(), connection, newMember.member, newMember.channel);
			}

			return;
		}

		console.log('What happened?');
	}

}));

async function shouldLeaveChannel(channel: Discord.VoiceChannel) {
	let isBotInside = channel.members.has(client.user!.id);

	if (!isBotInside) return false;

	let members = channel.members.array();

	for(let i = 0; i < members.length; i++) {
		let member = members[i];

		if (!member.user.bot && !(member.voice.serverDeaf || member.voice.selfDeaf)) {
			return false;
		}
	}

	console.log('I should leave the channel now..');

	await leaveVoiceChannel(channel.guild.id);

	return true;
}

setTimeout(() => {
	client.login(config.bot.discord.token)
	.catch(console.error);
}, 1500);

// INTERNAL

async function joinVoiceChannel(guildId: string, channelId: string) {
	let channel = await <Promise<Discord.VoiceChannel>>client.channels.fetch(channelId);

	if (channel != null && channel.type == 'voice') {
		let data = getOrCreateRecordingStream(guildId, channel);
		data.channel = channel;

		return channel.join();
	} else {
		return Promise.reject([
			'Unable to join channel provided.',
			'Please right click the VOICE Channel and click "Copy ID"; type !recording start <id>',
			'OR',
			'Join the VOICE channel and type !recording start'
		].join('\n'));
	}
}

async function leaveVoiceChannel(guildId: string) {
	removeRecordingStream(guildId);

	return new Promise((resolve, reject) => {
		let connection = client.voice!.connections.get(guildId);

		if (connection == null) return reject('Not in a voice channel!');

		if (connection.dispatcher != null) {
			// TODO: resolve in end fn. Have a timeout to auto resolve after X seconds.
			connection.dispatcher.once('end', () => connection!.channel.leave());
			connection.dispatcher.end('stopped');
		} else {
			connection.channel.leave();
		}

		resolve();
	});
}