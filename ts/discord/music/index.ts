console.log('DISCORD: MUSIC');

import { CustomDocs, DiscordBot } from '@type-manager';

import * as Discord from 'discord.js';
import { PassThrough } from 'stream';


import request = require('request');
import mongoose = require('mongoose');
//

import Queues = require('@music/models/queue');
import Playlists = require('@music/models/playlists');

import config = require('@config');
import musicUtils = require('./plugins/music');
import utils = require('../utils');
import { getMusic, Music } from './GuildMusic';


if (config.debug) mongoose.set('debug', true);
mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true });

import client = require('../client');


if (client.shard != null && client.shard.count != 0) shardListener();


function shardListener() {
	process.on('message', utils.asyncFnWrapper(async msg => {
		if (msg._eval || msg._sEval) return; // Discord shard eval starts with _eval/_sEval

		console.log(`[SHARD ${client.shard!.count}]:`, msg);

		if (msg._event) {
			let guild_id = msg._guild,
				channel_id = msg._channel,
				sender_id = msg._sender,
				search = msg.search;

			let guild = client.guilds.cache.get(guild_id);

			if (guild == null) return;

			let channel = <Discord.TextChannel>guild.channels.cache.get(channel_id);

			switch(msg._event) {
				case 'join': {
					let [_, err] = await utils.asyncCatch(joinVoiceChannel(guild_id, channel_id));

					if (err) {
						console.error(err);
						await send(utils.errorMsg([['Music', err]]));
						return;
					} else {
						await send(utils.successMsg([['Music', 'Joined channel.']]));
					}

					break;
				}

				case 'leave': {
					let [_, err] = await utils.asyncCatch(leaveVoiceChannel(guild_id));

					if (err) {
						console.error(err);
						await send(utils.errorMsg([['Music', err]]));
						return;
					} else {
						await send(utils.successMsg([['Music', 'Left channel.']]));
					}

					break;
				}

				case 'search': break;
				case 'stop': {
					let [_, err] = await utils.asyncCatch(stop(guild_id, undefined));

					if (err == null) {
						await send(utils.successMsg([['Music', 'Stopped Playing Song.']]));
					} else {
						await send(utils.errorMsg([['Music', err]]));
					}

					break;
				}

				case 'next': {
					let err = await utils.asyncCatchError(next(guild_id));

					if (err != null) {
						await send(utils.errorMsg([['Music', err]]));
					}

					break;
				}

				case 'play': {
					if (search == null || search.length == 0) {
						let err = await utils.asyncCatchError(playSong(guild_id, undefined));

						if (err == null) {
							await send(utils.successMsg([['Music', 'Playing song.']]));
						} else {
							await send(utils.errorMsg([['Music', err]]));
						}
					} else {
						let err = await utils.asyncCatchError(findAndPlay(guild_id, search));

						if (err == null) {
							await send(utils.successMsg([['Music', 'Playing song.']]));
						} else {
							await send(utils.errorMsg([['Music', err]]));
						}
					}
					break;
				}

				case 'queue': {
					let params = msg.params == null ? [] : msg.params;
					let type = msg.queue_type;

					switch(type) {
						case 'playlist': {
							let [count, err] = await utils.asyncCatch(queuePlaylist(guild_id, params.shift()));

							if (err == null) {
								await send(utils.successMsg([['Music', 'Queued Playlist with ' + count + ' files.']]));
							} else {
								await send(utils.errorMsg([['Music', err]]));
							}

							break;
						}

						case 'repeat': {
							let [value, err] = await utils.asyncCatch(queueToggleRepeat(guild_id));

							if (err == null) {
								await send(utils.successMsg([['Music', `Toggled Repeat: ${value ? '' : 'Not '} Repeating`]]));
							} else {
								await send(utils.errorMsg([['Music', err]]));
							}

							break;
						}

						case 'clear': {
							let err = await utils.asyncCatchError(queueClear(guild_id));

							if (err == null) {
								await send(utils.successMsg([['Music', 'Queue Cleared.']]));
							} else {
								await send(utils.errorMsg([['Music', err]]));
							}

							break;
						}

						case 'shuffle': {
							let err = await utils.asyncCatchError(queueShuffle(guild_id));

							if (err == null) {
								await send(utils.successMsg([['Music', 'Shuffled Song Queue.']]));
							} else {
								await send(utils.errorMsg([['Music', err]]));
							}

							break;
						}

						case 'remove': {
							let err = await utils.asyncCatchError(queueRemoveItem(guild_id, params.shift()));

							if (err == null) {
								await send(utils.successMsg([['Music', 'Removed Item from queue.']]));
							} else {
								await send(utils.errorMsg([['Music', err]]));
							}

							break;
						}

						case 'add': {
							let [song, err] = await utils.asyncCatch(queueSong(guild_id, sender_id, params.join(' ')));

							if (err == null) {
								if (song == null) {
									await send(utils.errorMsg([['Music', 'No song to queue!']]));
								} else {
									await send(utils.generateFullSong(
										'Added to Queue', song.id, '',
										song.title, song.thumbnail_url, song.length,
										song.channel_id, new Date(song.published).toISOString()
									));
								}
							} else {
								await send(utils.errorMsg([['Music', err]]));
							}

							break;
						}

						default: {
							if (type == 'list' || /^[0-9]+$/g.test(type)) {
								if (type != 'list') params.push(type);

								let queue = await Queues.findOne({ server_id: guild_id });

								if (queue == null || queue.items.length == 0) return send(utils.errorMsg([['Music', 'Nothing Queued!']]));

								let page = 1;
								let maxItems = 5;
								let maxPages = Math.ceil(queue.items.length/maxItems);

								if (params != null && params.length != 0) {
									let parsed = parseInt(params);
									if (Number.isInteger(parsed)) page = parsed;
								}

								if (page > maxPages) page = maxPages;
								if (page < 1) page = 1;

								let pageSlice = (page - 1) * maxItems;

								let itemsToSearch = queue.items.slice(pageSlice, pageSlice + maxItems).map(i => i.id);

								if (itemsToSearch.length == 0) return send(utils.errorMsg([['Music', 'No more items.']]));

								let songs = await musicUtils.getSong(itemsToSearch);

								if (songs == null) {
									return send(utils.errorMsg([['Music', 'Unable to find songs.']]));
								}

								let music = await getMusic(guild_id);

								if (music == null) return send(utils.errorMsg([['Music', 'Unable to find music.']]));

								let fields: [string, string][] = [
									[
										'Music',
										[
											'Queued Items: ' + songs.length,
											'Page: ' + page + '/' + maxPages,
											'**Repeat Queue:** ' + (music.repeatQueue ? 'Yes': 'No'),
											'**Repeat Song:** ' + (music.repeatSong ? 'Yes': 'No')
										].join('\n')
									]
								];

								fields = fields.concat(songs
								.map((q, i) => [
									'ID: ' + (pageSlice + i + 1),
									[	`[${q.title}](${utils.videoIdToUrl(q.type || 'youtube', q.id)})`,
										'Uploaded: ' + new Date(q.published).toDateString(),
										'Length: ' + utils.secondsToHMS(q.length)
									].join('\n')
								]));

								return send(utils.successMsg(fields));
							}
							break;
						}
					}

					break;
				}

				default: console.log('UNKNOWN EVENT: ', msg);
			}

			function send(str: { embed: any; }) {
				return channel.send(new Discord.MessageEmbed(str.embed));
			}
		}

		return Promise.resolve();
	}));
}

function sendToWebUI(opts: { [a: string]: any }) {
	client.shard!.send(Object.assign({ from: 'music', to: 'web-music' }, opts));
}


client.on('ready', () => {
	console.log(' - Client ID:' + client.user!.id);
	console.log(' - Found ' + client.guilds.cache.size + ' Guild(s).');
	client.shard!.send('ready');
});

client.on('error', e => console.error(e));


client.on('channelDelete', (channel) => {
	// console.log('channelDelete:', channel);
});

// @ts-ignore
client.on('channelUpdate', (oldChannel, newChannel: Discord.VoiceChannel) => {
	// console.log('channelUpdate:', newChannel);

	if (newChannel.type == 'voice' && newChannel.members.has(client.user!.id)) {
		let member = newChannel.members.get(client.user!.id);

		if (member != null && (member.voice.selfMute || member.voice.serverMute)) {
			let connection = client.voice!.connections.get(newChannel.guild.id);
			if (connection != null) {
				if (connection.dispatcher) {
					connection.dispatcher.once('end', (reason) => console.log('Ended: ' + reason));
					connection.dispatcher.end();
				}
			}
			// Stop playing music if playing.
		}
	}
});


client.on('voiceStateUpdate', (oldMember, newMember) => {
	if (newMember.member!.user.bot) return;

	// console.log('voiceStateUpdate:', newMember);

	if (oldMember.channel != null && check(oldMember.channel)) return;
	if (oldMember.channel != null && newMember.channel != null && oldMember.channel.id == newMember.channel.id) return;
	if (newMember.channel != null && check(newMember.channel)) return;

	function check(channel: Discord.VoiceChannel) {
		let isBotInside = channel.members.has(client.user!.id);

		if (!isBotInside) return false;

		let members = channel.members.array();
		for(let i = 0; i < members.length; i++) {
			let member = members[i];

			if (!member.user.bot && !(member.voice.serverDeaf || member.voice.selfDeaf)) return true;
		}

		leaveVoiceChannel(channel.guild.id)
		.catch(console.error);
	}
});


client.login(config.bot.discord.token);

// INTERNAL

async function joinVoiceChannel(guildId: string, channelId: string) {
	let channel = client.channels.cache.get(channelId);

	if (channel != null && channel.type == 'voice') {
		let music = await getMusic(guildId);

		if (music == null) return Promise.reject('Unable to find music.');

		music.lastVoiceChannelId = channel!.id;
		music.playing = undefined;
		music.save();

		await (<Discord.VoiceChannel>channel).join();
	} else {
		return Promise.reject([
			'Unable to join channel provided.',
			'Please right click the VOICE Channel and click "Copy ID"; type !music join <id>',
			'OR',
			'Join the VOICE channel and type !music join'
		].join('\n'));
	}

	return Promise.resolve();
}

async function leaveVoiceChannel(guildId: string) {
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

function isPlaying(guild_id: string): boolean {
	let voice = client.voice!.connections.get(guild_id);
	return voice == null ? false : (voice.dispatcher == null ? false : !voice.dispatcher.destroyed)
}

async function stop(guild_id: string, reason?: 'stopped' | 'next') {
	if (reason == null || reason == 'stopped') {
		await stopPlaying(guild_id);
	} else {
		await stopReason(guild_id, reason);
	}

	return Promise.resolve();
}

interface SongResponse {
	newSong: DiscordBot.plugins.PlayedSong,
	lastSong?: DiscordBot.plugins.PlayedSong
}

async function next(guild_id: string) {
	console.log(' - next');

	if (isPlaying(guild_id)) {
		await stop(guild_id, 'next');
	}

	return playSong(guild_id, undefined);
}

async function playSong(
	guild_id: string,
	newSong?: DiscordBot.plugins.SongGlobal,
	trys = 0
): Promise<SongResponse> {
	let guild = client.guilds.cache.get(guild_id);

	if (guild == null) {
		return Promise.reject('Unknown Guild ID');
	}

	let conn = client.voice!.connections.get(guild_id);

	if (conn != null) {
		if (isPlaying(guild_id)) {
			if (newSong == null) {
				return Promise.reject('Already Playing Music!');
			} else { // Currently playing a song, no url specified.
				await stop(guild_id, 'stopped'); // Stop song, new song ready to play
			}
		}

		let music = await getMusic(guild_id);

		if (newSong == null) {
			let nextSong = await music.nextInQueue();

			if (nextSong == null) {
				await music.sendMessageFromGuild(guild!, 'End of Queue.');
				return Promise.reject('End of Queue');
			}

			return play(music, nextSong);
		} else {
			return play(music, newSong);
		}

		async function play(music: Music, song: DiscordBot.plugins.SongGlobal) {
			return new Promise<SongResponse>((resolve, reject) => {
				// let streamUrl = uidToStreamUrl(song.type, song.id);

				// if (streamUrl == null) {
				// 	console.error('Invalid song type: ' + song.type + ' | ' + song.id;
				// 	if (cb != null) cb('Song Type was not valid!');
				// 	return;
				// }

				const pass = new PassThrough();

				let req = request.get(`http://${config.ytdl.full}/stream?id=${song.id}`);
				req.pipe(pass);

				let dispatcher = conn!.play(pass);

				req.on('response', utils.asyncFnWrapper(async () => {
					console.log('Stream Info: ' + Date.now());

					let lastSong = music.playing;
					music.playing = Object.assign(song, { playedAt: Date.now() });

					let avatarURL = '';

					if (music.playing.addedBy != null) {
						let member = client.users.cache.get(music.playing.addedBy);
						if (member != null) avatarURL = member.avatarURL() || '';
					}

					let send = utils.generateFullSong(
						'Now Playing', song.id, avatarURL,
						song.title, song.thumbnail_url, song.length,
						song.channel_id, new Date(song.published).toISOString());

					await utils.asyncCatch(music.sendMessageFromGuild(guild!, send));
					await utils.asyncCatch(music.addToHistory(music.playing));

					music.save();

					resolve({ newSong: music.playing, lastSong: lastSong });
				}));

				req.on('error', reject);

				dispatcher.once('start', () => console.log('Stream start: ' + new Date().toTimeString()));

				dispatcher.on('end', reason => {
					console.log('End: ' + reason);
					music.playing = undefined;

					if (reason == 'stopped') {
						music.save();
					} else if (reason == 'restarting') { // Play "Stopping" audio.
						// Song finished, get next song
						console.log('Grab next song.');
						playSong(guild_id);
					} else if (reason != 'next') { // "next" reason is called from "next" function
						// Song finished, get next song
						console.log('Grab next song.');
						playSong(guild_id);
					}
				});

				dispatcher.on('error', e => console.log('dispatcher error:', e));
			});
		}
	} else {
		// If the bot is QUICKLY restarted it doesn't leave the voice channel and it doesn't know it's still in it.
		if (trys >= 3) {
			console.error('Attempted to join Voice Channel 3 times. Now stopping. - ' + guild_id);
			return Promise.reject('Attempted to join Voice Channel 3 times. Now stopping.');
		}

		let music = await getMusic(guild_id);

		await joinVoiceChannel(guild_id, music.lastVoiceChannelId);

		return playSong(guild_id, newSong, trys + 1);
	}
}


// Core

async function findAndPlay(guildId: string, search: string): Promise<DiscordBot.plugins.SongGlobal> {
	let val = /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)([^= &?/\r\n]{8,11})/g.exec(search);

	if (val != null) {
		let id = val[1];

		let songs = await musicUtils.getSong(id);

		if (songs == null) return Promise.reject('Unable to find songs!');

		if (songs[0] == null) {
			console.log('Unable to find "' + id + '" searching for it instead.');

			let song = await musicUtils.findFirstSong(id);

			if (song == null) return Promise.reject('Unable to find song');

			return playIt(song);
		} else {
			return playIt(songs[0]);
		}
	} else {
		let song = await musicUtils.findFirstSong(search);
		if (song == null) return Promise.reject('Unable to find song');

		return playIt(song);
	}

	async function playIt(song: DiscordBot.plugins.SongGlobal) {
		let [sung, err] = await utils.asyncCatch(playSong(guildId, song));

		sendToWebUI({
			_guild: guildId,
			_event: 'play-start',
			error: err,
			nextSong: sung?.newSong,
			lastSong: sung?.lastSong
		});

		return Promise.resolve(song);
	}
}

async function stopPlaying(guildId: string) {
	sendToWebUI({
		_guild: guildId,
		_event: 'play-stop'
	});

	await stopReason(guildId);

	return Promise.resolve();
}

async function stopReason(guild_id: string, reason: 'stopped' | 'next' = 'stopped') {
	return new Promise((resolve, reject) => {
		let voiceConnection = client.voice!.connections.get(guild_id);

		if (voiceConnection == null) return reject();
		if (voiceConnection.dispatcher == null) return reject();

		voiceConnection.dispatcher.once('end', () => resolve());
		voiceConnection.dispatcher.end(reason);
	});
}

// Queue
async function queueToggleRepeat(guildId: string) {
	let music = await getMusic(guildId);

	let repeat = music.toggleQueueRepeat();

	sendToWebUI({
		_guild: guildId,
		_event: 'queue-toggle-repeat',
		value: repeat
	});

	music.save();

	return Promise.resolve(repeat);
}

async function queueClear(guildId: string) {
	let music = await getMusic(guildId);

	sendToWebUI({
		_guild: guildId,
		_event: 'queue-clear'
	});

	await music.clearQueue();

	return Promise.resolve();
}

async function queueShuffle(guildId: string) {
	let music = await getMusic(guildId);

	music.shuffleQueue();

	sendToWebUI({
		_guild: guildId,
		_event: 'queue-shuffle',
		queue: 'todo'
	});

	return Promise.resolve();
}

async function queueRemoveItem(guildId: string, item: string) {
	let music = await getMusic(guildId);

	await music.removeFromQueue(item);


	sendToWebUI({
		_guild: guildId,
		_event: 'queue-item-remove',
		item: item
	});


	return Promise.resolve();
}

async function queueSong(guildId: string, memberId: string, uriOrSearch: string) {
	let music = await getMusic(guildId);

	let val = /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)([^= &?/\r\n]{8,11})/g.exec(uriOrSearch);

	if (val != null) {
		let id = val[1];

		let songs = await musicUtils.getSong(id);

		if (songs.length == 0) return Promise.reject('No songs found!');

		sendToWebUI({
			_guild: guildId,
			_event: 'queue-item-add',
			item: songs[0]
		});

		await music.addToQueue(memberId, songs[0]);

		return Promise.resolve(songs[0]);
	} else {
		let song = await musicUtils.findFirstSong(uriOrSearch);

		if (song == null) return Promise.reject('No songs found!');

		sendToWebUI({
			_guild: guildId,
			_event: 'queue-item-add',
			item: song
		});

		music.addToQueue(memberId, song);

		return Promise.resolve(song);
	}
}

async function queuePlaylist(guildId: string, playlistId: string) {
	if (playlistId == null) return Promise.reject('No playlist ID specified! Please use an ID or "default"');

	let music = await getMusic(guildId);

	if (music.currentPlaylist == null) return Promise.reject('Unable to find your guild playlist.');

	if (playlistId == 'default') playlistId = music.currentPlaylist;


	let playlist = await Playlists.findOne({ public_id: playlistId });

	if (playlist == null) return Promise.reject('No playlist exists!');
	if (playlist.songs.length == 0) return Promise.reject('Nothing to queue! No songs present in playlist.');


	await Queues.updateOne({ server_id: music.guildId }, {
		$set: {
			items: playlist.songs.map(i => {
				return {
					addedBy: 'playlist',
					id: music.guildId,
					song: i['song']
				}
			})
		}
	}).exec();

	sendToWebUI({
		_guild: guildId,
		_event: 'queue-playlist',
		public_id: playlistId
	});

	return Promise.resolve(playlist.songs.length);
}