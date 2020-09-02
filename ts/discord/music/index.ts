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


mongoose.Promise = global.Promise;
if (config.debug) mongoose.set('debug', true);
mongoose.connect(config.database, { useNewUrlParser: true });

import client = require('../client');


if (client.shard != null && client.shard.count != 0) shardListener();


function shardListener() {
	process.on('message', msg => {
		if (msg._eval || msg._sEval) return; // Discord shard eval starts with _eval/_sEval

		console.log(`[SHARD ${client.shard.id}]:`, msg);

		if (msg._event) {
			var guild_id = msg._guild,
				channel_id = msg._channel,
				sender_id = msg._sender,
				search = msg.search;

			var guild = client.guilds.get(guild_id);

			if (guild == null) return;

			var channel = <Discord.TextChannel>guild.channels.get(channel_id);

			switch(msg._event) {
				case 'join':
					joinVoiceChannel(guild_id, channel_id, err => {
						if (err) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
						send(utils.successMsg([['Music', 'Joined channel.']]));
					});
					break;
				case 'leave':
					leaveVoiceChannel(guild_id, err => {
						if (err) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
						send(utils.successMsg([['Music', 'Left channel.']]));
					});
					break;
				case 'search': break;
				case 'stop':
					stop(guild_id, undefined, (err, msg) => {
						if (err != null) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
						if (msg != null) send(utils.successMsg([['Music', msg]]));
					});
					break;
				case 'next':
					next(guild_id, (err, res) => {
						if (err) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
						// send(utils.successMsg([['Music', 'Now Playing: ']]));
					});
					break;
				case 'play':
					if (search == null || search.length == 0) {
						playSong(guild_id, undefined, (err, newsong, lastSong) => {
							if (err) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
							send(utils.successMsg([['Music', 'Playing song.']]));
						});
					} else {
						findAndPlay(guild_id, search, (err, song) => {
							if (err) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
							send(utils.successMsg([['Music', 'Playing song.']]));
						});
					}
					break;
				case 'queue':
					var params = msg.params == null ? [] : msg.params;
					var type = msg.queue_type;

					switch(type) {
						case 'playlist':
							queuePlaylist(guild_id, params.shift(), (err, count) => {
								if (err) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
								send(utils.successMsg([['Music', 'Queued Playlist with ' + count + ' files.']]));
							});
							break;
						case 'repeat':
							queueToggleRepeat(guild_id, value => {
								send(utils.successMsg([['Music', `Toggled Repeat: ${value ? '' : 'Not '} Repeating`]]));
							});
							break;
						case 'clear':
							queueClear(guild_id, err => {
								if (err) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
								send(utils.successMsg([['Music', 'Queue Cleared']]));
							});
							break;
						case 'shuffle':
							queueShuffle(guild_id, () => {
								send(utils.successMsg([['Music', 'Shuffled Song Queue']]));
							});
							break;
						case 'remove':
							queueRemoveItem(guild_id, params.shift(), err => {
								if (err) { console.error(err); send(utils.errorMsg([['Music', err]])); return; }
								send(utils.successMsg([['Music', 'Removed Item from queue.']]));
							});
							break;
						case 'add':
							queueSong(guild_id, sender_id, params.join(' '), (errMsg, song) => {
								if (errMsg) { console.error(errMsg); send(utils.errorMsg([['Music', errMsg]])); return; }
								if (song == null) { send(utils.errorMsg([['Music', 'No song to queue!']])); return; }

								send(utils.generateFullSong(
									'Added to Queue', song.id, '',
									song.title, song.thumbnail_url, song.length,
									song.channel_id, new Date(song.published).toISOString()));
							});
							break;
						default:
							if (type == 'list' || /^[0-9]+$/g.test(type)) {
								if (type != 'list') params.push(type);

								Queues.findOne({ server_id: guild_id }, (err, queue: CustomDocs.music.Queue) => {
									if (queue.items.length == 0) return send(utils.errorMsg([['Music', 'Nothing Queued!']]));

									var page = 1;
									var maxItems = 5;
									var maxPages = Math.ceil(queue.items.length/maxItems);

									if (params != null && params.length != 0) {
										var parsed = parseInt(params);
										if (Number.isInteger(parsed)) page = parsed;
									}

									if (page > maxPages) page = maxPages;
									if (page < 1) page = 1;

									var pageSlice = (page - 1) * maxItems;

									var itemsToSearch = queue.items.slice(pageSlice, pageSlice + maxItems).map(i => i.id);

									if (itemsToSearch.length == 0) return send(utils.errorMsg([['Music', 'No more items.']]));

									musicUtils.getSong(itemsToSearch, (err, songs) => {
										if (err != null) return console.error(err);

										if (songs == null) {
											return send(utils.errorMsg([['Music', 'Unable to find songs.']]));
										}

										getMusic(guild_id, music => {
											if (music == null) return send(utils.errorMsg([['Music', 'Unable to find music.']]));

											var fields: [string, string][] = [
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
										});
									});
								});
							}
							break;
					}
					break;
				default: console.log('UNKNOWN EVENT: ', msg);
			}

			function send(str: { embed: any; }) {
				return channel.send(new Discord.RichEmbed(str.embed));
			}
		}
	});
}

function sendToWebUI(opts: { [a: string]: any }) {
	client.shard.send(Object.assign({ from: 'music', to: 'web-music' }, opts));
}



client.options.disabledEvents = [
	// 'READY',
	// 'RESUMED',
	// 'GUILD_SYNC',
	// 'GUILD_CREATE',
	// 'VOICE_SERVER_UPDATE',
	// 'VOICE_STATE_UPDATE',
	// 'CHANNEL_CREATE',
	// 'CHANNEL_DELETE',
	// 'CHANNEL_UPDATE',
	// 'MESSAGE_CREATE',
	'GUILD_DELETE',
	'GUILD_UPDATE',
	'GUILD_MEMBER_ADD',
	'GUILD_MEMBER_REMOVE',
	'GUILD_MEMBER_UPDATE',
	'GUILD_MEMBERS_CHUNK',
	'GUILD_ROLE_CREATE',
	'GUILD_ROLE_DELETE',
	'GUILD_ROLE_UPDATE',
	'GUILD_BAN_ADD',
	'GUILD_BAN_REMOVE',
	'CHANNEL_PINS_UPDATE',
	'MESSAGE_DELETE',
	'MESSAGE_UPDATE',
	'MESSAGE_DELETE_BULK',
	'MESSAGE_REACTION_ADD',
	'MESSAGE_REACTION_REMOVE',
	'MESSAGE_REACTION_REMOVE_ALL',
	'USER_UPDATE',
	'USER_NOTE_UPDATE',
	'USER_SETTINGS_UPDATE',
	'USER_GUILD_SETTINGS_UPDATE',
	'PRESENCE_UPDATE',
	'TYPING_START',
	'RELATIONSHIP_ADD',
	'RELATIONSHIP_REMOVE'
];

client.on('ready', () => {
	console.log(' - Client ID:' + client.user.id);
	console.log(' - Found ' + client.guilds.size + ' Guild(s).');
	client.shard.send('ready');
});

client.on('error', e => console.error(e));


client.on('channelDelete', (channel) => {
	// console.log('channelDelete:', channel);
});

client.on('channelUpdate', (oldChannel, newChannel: Discord.VoiceChannel) => {
	// console.log('channelUpdate:', newChannel);

	if (newChannel.type == 'voice' && newChannel.members.has(client.user.id)) {
		var member = newChannel.members.get(client.user.id);

		if (member != null && (member.selfMute || member.serverMute)) {
			var connection = client.voiceConnections.get(newChannel.guild.id);
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
	if (newMember.user.bot) return;

	// console.log('voiceStateUpdate:', newMember);

	if (oldMember.voiceChannel != null && check(oldMember.voiceChannel)) return;
	if (oldMember.voiceChannel != null && newMember.voiceChannel != null && oldMember.voiceChannel.id == newMember.voiceChannel.id) return;
	if (newMember.voiceChannel != null && check(newMember.voiceChannel)) return;

	function check(channel: Discord.VoiceChannel) {
		var isBotInside = channel.members.has(client.user.id);

		if (!isBotInside) return false;

		var members = channel.members.array();
		for(var i = 0; i < members.length; i++) {
			var member = members[i];

			if (!member.user.bot && !(member.serverDeaf || member.selfDeaf)) return true;
		}

		leaveVoiceChannel(channel.guild.id, (err) => {
			if (err) console.error(err);
		});
	}
});


client.login(config.bot.discord.token);

// INTERNAL

function joinVoiceChannel(guildId: string, channelId: string, cb: (errMsg?: string) => any) {
	var channel = client.channels.get(channelId);

	if (channel != null && channel.type == 'voice') {
		getMusic(guildId, music => {
			if (music == null) return cb('Unable to find music.');

			music.lastVoiceChannelId = channel!.id;
			music.playing = undefined;
			music.save();

			joinChannel(<Discord.VoiceChannel>channel, () => cb());
		});
	} else cb([
		'Unable to join channel provided.',
		'Please right click the VOICE Channel and click "Copy ID"; type !music join <id>',
		'OR',
		'Join the VOICE channel and type !music join'
	].join('\n'));
}

function leaveVoiceChannel(guildId: string, cb: (errMsg?: string) => any) {
	var connection = client.voiceConnections.get(guildId);

	if (connection == null) return cb('Not in a voice channel!');

	if (connection.dispatcher != null) {
		connection.dispatcher.once('end', () => connection!.channel.leave());
		connection.dispatcher.end('stopped');
	} else connection.channel.leave();

	cb();
}

//
function joinChannel(voiceChannel: Discord.VoiceChannel, cb: (err?: string) => any) {
	voiceChannel.join()
	.then(_ => cb(), err => cb(err))
	.catch(err => { console.error(err); cb(err); });
}

function isPlaying(guild_id: string): boolean {
	var voice = client.voiceConnections.get(guild_id);
	return voice == null ? false : (voice.dispatcher == null ? false : !voice.dispatcher.destroyed)
}

function stop(guild_id: string, reason?: 'stopped' | 'next', cb?: (err?: string, res?: string) => any) {
	if (reason == null || reason == 'stopped') {
		stopPlaying(guild_id, err => {
			if (err) return cb && cb(err);
			cb && cb(undefined, 'Stopped playing music.');
		});
	} else stopReason(guild_id, reason, () => cb && cb(reason));
}

function next(guild_id: string, cb: (err?: string, newSong?: DiscordBot.plugins.PlayedSong, lastSong?: DiscordBot.plugins.PlayedSong) => any) {
	console.log(' - next');

	if (isPlaying(guild_id)) stop(guild_id, 'next', () => playSong(guild_id, undefined, cb));
	else playSong(guild_id, undefined, cb);
}

function playSong(
	guild_id: string,
	newSong?: DiscordBot.plugins.SongGlobal,
	cb?: (err?: string, newSong?: DiscordBot.plugins.PlayedSong, lastSong?: DiscordBot.plugins.PlayedSong) => any,
	trys = 0) {

	var guild = client.guilds.get(guild_id);

	if (guild == null) { if (cb != null) cb('Unknown Guild ID'); console.error('UNKNOWN GUILD ID!!!! - ' + guild_id); return false; }

	var conn = client.voiceConnections.get(guild_id);

	if (conn != null) {
		if (isPlaying(guild_id)) {
			if (newSong == null) {
				if (cb != null) cb('Already Playing Music!');
				return false;
			} // Currently playing a song, no url specified.
			else stop(guild_id, 'stopped'); // Stop song, new song ready to play
		}

		getMusic(guild_id, (music) => {
			if (music == null) return cb && cb('Unable to find Music.');

			if (newSong == null) {
				music.nextInQueue(nextSong => {
					if (nextSong == null) {
						music.sendMessageFromGuild(guild!, 'End of Queue.');
						if (cb != null) cb('End of Queue');
						return;
					}

					play(music, nextSong);
				});
			} else play(music, newSong);
		});


		function play(music: Music, song: DiscordBot.plugins.SongGlobal) {
			// var streamUrl = uidToStreamUrl(song.type, song.id);

			// if (streamUrl == null) {
			// 	console.error('Invalid song type: ' + song.type + ' | ' + song.id;
			// 	if (cb != null) cb('Song Type was not valid!');
			// 	return;
			// }

			const pass = new PassThrough();

			var req = request.get(`http://${config.ytdl.full}/stream?id=${song.id}`);
			req.pipe(pass);

			var dispatcher = conn!.playStream(pass);

			req.on('response', () => {
				console.log('Stream Info: ' + Date.now());

				var lastSong = music.playing;
				music.playing = Object.assign(song, { playedAt: Date.now() });

				if (cb != null) cb(undefined, music.playing, lastSong);

				var avatarURL = '';

				if (music.playing.addedBy != null) {
					var member = client.users.get(music.playing.addedBy);
					if (member != null) avatarURL = member.avatarURL;
				}

				var send = utils.generateFullSong(
					'Now Playing', song.id, avatarURL,
					song.title, song.thumbnail_url, song.length,
					song.channel_id, new Date(song.published).toISOString());

				music.sendMessageFromGuild(guild!, send);

				music.addToHistory(music.playing);
				music.save();
			});

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
		}
	} else {
		// If the bot is QUICKLY restarted it doesn't leave the voice channel and it doesn't know it's still in it.
		if (trys >= 3) { console.error('Attempted to join Voice Channel 3 times. Now stopping. - ' + guild_id); return false; }
		getMusic(guild_id, music => {
			if (music == null) return cb && cb('Unable to find music.');

			joinVoiceChannel(guild_id, music.lastVoiceChannelId, (err) => {
				if (err) {
					if (cb != null) cb('Unable to join voice channel. ' + err);
					console.error('Attempted to join voice channel: ', err);
					return;
				}
				playSong(guild_id, newSong, cb, trys + 1);
			});
		});
	}
}


// Core

function findAndPlay(guildId: string, search: string, cb: (errorMessage?: string, song?: DiscordBot.plugins.SongGlobal) => any) {
	var val = /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)([^= &?/\r\n]{8,11})/g.exec(search);

	if (val != null) {
		var id = val[1];

		musicUtils.getSong(id, (errMsg, songs) => {
			if (errMsg != null) return cb(errMsg);
			if (songs == null) return cb('Unable to find songs!');

			if (songs[0] == null) {
				console.log('Unable to find "' + id + '" searching for it instead.');
				musicUtils.findFirstSong(id, (errMsg, song) => {
					if (errMsg != null) return cb(errMsg);
					if (song == null) return cb('Unable to find song');

					playIt(song);
				});
			} else playIt(songs[0]);
		});
	} else {
		musicUtils.findFirstSong(search, (errMsg, song) => {
			if (errMsg != null) return cb(errMsg);
			if (song == null) return cb('Unable to find song');

			playIt(song);
		});
	}

	function playIt(song: DiscordBot.plugins.SongGlobal) {
		playSong(guildId, song, (err, next, last) => {
			sendToWebUI({
				_guild: guildId,
				_event: 'play-start',
				error: err,
				nextSong: next,
				lastSong: last
			});
		});

		cb(undefined, song);
	}
}

function stopPlaying(guildId: string, cb: (errorMessage?: string) => any) {
	getMusic(guildId, music => {
		sendToWebUI({
			_guild: guildId,
			_event: 'play-stop'
		});
		stopReason(guildId);
		cb();
	});
}

function stopReason(guild_id: string, reason: 'stopped' | 'next' = 'stopped', cb?: (reason: string) => any): boolean {
	var voiceConnection = client.voiceConnections.get(guild_id);
	if (voiceConnection == null) return false;
	if (voiceConnection.dispatcher == null) return false;

	if (cb != null) voiceConnection.dispatcher.once('end', cb);
	voiceConnection.dispatcher.end(reason);

	return true;
}

// Queue
function queueToggleRepeat(guildId: string, cb: (err?: string, value?: boolean) => any) {
	getMusic(guildId, music => {
		if (music == null) return cb('Unable to find music');

		var repeat = music.toggleQueueRepeat();

		sendToWebUI({
			_guild: guildId,
			_event: 'queue-toggle-repeat',
			value: repeat
		});

		music.save();

		cb(undefined, repeat);
	});
}

function queueClear(guildId: string, cb: (err?: string) => any) {
	getMusic(guildId, music => {
		if (music == null) return cb('Unable to find music');

		sendToWebUI({
			_guild: guildId,
			_event: 'queue-clear'
		});

		music.clearQueue(err => cb(err));
	});
}

function queueShuffle(guildId: string, cb: (err?: string) => any) {
	getMusic(guildId, music => {
		if (music == null) return cb('Unable to find music');

		music.shuffleQueue();
		sendToWebUI({
			_guild: guildId,
			_event: 'queue-shuffle',
			queue: 'todo'
		});

		cb();
	});
}

function queueRemoveItem(guildId: string, item: string, cb: (err?: string) => any) {
	getMusic(guildId, music => {
		if (music == null) return cb('Unable to find music');

		music.removeFromQueue(item, err => {
			sendToWebUI({
				_guild: guildId,
				_event: 'queue-item-remove',
				item: item
			});

			cb(err);
		});
	});
}

function queueSong(guildId: string, memberId: string, uriOrSearch: string, cb: (errorMessage?: string, song?: DiscordBot.plugins.SongGlobal) => any) {
	getMusic(guildId, music => {
		if (music == null) return cb('Unable to find music');

		var val = /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)([^= &?/\r\n]{8,11})/g.exec(uriOrSearch);

		if (val != null) {
			var id = val[1];

			musicUtils.getSong(id, (errMsg, songs) => {
				if (errMsg != null) return cb(errMsg);
				if (songs == null || songs.length == 0) return cb('No songs found!');

				sendToWebUI({
					_guild: guildId,
					_event: 'queue-item-add',
					item: songs[0]
				});
				music.addToQueue(memberId, songs[0], err => cb(err, songs[0]));
			})
		} else {
			musicUtils.findFirstSong(uriOrSearch, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);
				if (song == null) return cb('No songs found!');

				sendToWebUI({
					_guild: guildId,
					_event: 'queue-item-add',
					item: song
				});

				music.addToQueue(memberId, song, err => cb(err, song));
			});
		}
	});
}

function queuePlaylist(guildId: string, playlistId: string, cb: (err?: any, count?: number) => any) {
	if (playlistId == null) return cb('No playlist ID specified! Please use an ID or "default"');

	getMusic(guildId, music => {
		if (music == null) return cb('No Music found!');

		if (music.currentPlaylist == null) return cb('Unable to find your guild playlist.');

		if (playlistId == 'default') playlistId = music.currentPlaylist;

		Playlists.findOne({ public_id: playlistId }, (err, playlist) => {
			if (playlist == null) return cb('No playlist exists!');
			if (playlist.songs.length == 0) return cb('Nothing to queue! No songs present in playlist.');

			Queues.updateOne({ server_id: music.guildId }, {
				$set: {
					items: playlist.songs.map(i => {
						return {
							addedBy: 'playlist',
							id: music.guildId,
							song: i['song']
						}
					})
				}
			}, (err) => {
				sendToWebUI({
					_guild: guildId,
					_event: 'queue-playlist',
					public_id: playlistId
				});

				cb(null, playlist.songs.length);
			});
		});
	});
}