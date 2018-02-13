import Discord = require('discord.js');
import YouTube = require('youtube-node');

import Command = require('../../command');
import discordClient = require('../../index');
import guildClient = require('../../guildClient');
import config = require('../../../site/util/config');

import Users = require('../../../site/models/users');

import MusicHistory = require('../../../music/models/history');
import Playlists = require('../../../music/models/playlists');
import PlaylistItems = require('../../../music/models/playlist_items');
import Song = require('../../../music/models/song');
import Queue = require('../../../music/models/queue');

import musicPlugin = require('../../plugins/music');


let youTube = new YouTube();
youTube.setKey(config.youtube.key);

// TODO: Search YT
// TODO: Check if in voice channel after restart.
// TODO: Repeat/previous
// TODO: Transfer most of these things to plugins/music for web view functionality.

let dispatchers: { [id: string]: Discord.StreamDispatcher } = {};

class Music extends Command {
	constructor() {
		super('music');

		this.perms = [
			'commands.music'
		].concat([
			'join',
			'leave',
			'song',
			'current',
			'play',
			'stop',
			'skip',
			'next',
			'history',
			'history.list',
			'history.clear',
			'queue',
			'queue.item',
			'queue.list',
			'queue.repeat',
			'queue.shuffle',
			'queue.clear',
			'queue.remove'
		].map(i => 'commands.music.' + i));

		this.addParams(0, (params, userOptions, message) => {
			if (userOptions.plugins.music == null || !userOptions.plugins.music.enabled)
				return Command.error([['Music', 'Music isn\'t enabled! Please enable the plugin!' ]]);

			if (params.length == 0) {
				return Command.info([
					[
						'Command Usage', 
						[	'join [@channel/Channel ID]',
							'info/current/song',
							'play [URL/Name]',
							'stop',
							'skip/next',
							'history [page]',
							// 'history clear',
							'queue [page/URL/Name]',
							'queue repeat',
							'queue shuffle',
							'queue clear',
							'queue remove <ID/URL>'
						].map(b => '!music ' + b).join('\n') ]
				]);
			}

			params[0] = params[0].toLowerCase();

			// TODO: Fix this crap
			// music.lastTextChannelId = message.channel.id;
			// if (music.lastVoiceChannelId != null) {
			// 	if (message.guild.channels.get(music.lastVoiceChannelId) == null) {
			// 		music.lastVoiceChannelId = null;
			// 		console.log('Voice channel is non-existent now');
			// 	}
			// }

			switch (params[0]) {
				case 'info':
					var items = [];

					guildClient.getMusic(message.guild.id, (music) => {
						if (music.playing != null) {
							items.push([
								'Song', 
								[
									'The Current song is:',
									'Title: ' + music.playing.title,
									'Link: ' + idToUrl(music.playing.type, music.playing.uid)
								].join('\n')
							]);
						} else items.push([ 'Song', 'Not currently playing any music.' ]);

						items.push([
							'Options',
							[
								// 'Playing From: ' + music.playingFrom,
								'Repeat Queue: ' + music.repeatQueue,
								'Repeat song: ' + music.repeatSong
							].join('\n')
						]);

						send(Command.info(items));
					});
					break;
				case 'current':
				case 'song':
					guildClient.getMusic(message.guild.id, (music) => {
						if (music.playing) {
							send(Command.info([[
								'Music', 
								[
									'The Current song is:',
									'Title: ' + music.playing.title,
									'Link: ' + idToUrl(music.playing.type, music.playing.uid)
								].join('\n')
							]]));
						} else send(Command.info([['Music', 'No song is currently playing!']]));
					});
					break;
				case 'join':
					var voiceChannel: string;

					if (params[1] != null) {
						voiceChannel = params[1];
					} else if (message.member.voiceChannel != null) {
						voiceChannel = message.member.voiceChannel.id;
					}
					

					musicPlugin.joinVoiceChannel(message.guild.id, voiceChannel, errMsg => {
						if (errMsg != null) return send(Command.error([[ 'Queue', errMsg ]]));
						send(Command.success([['Music', 'Joined Channel!']]));
					});
					break;

				case 'leave':
					var connection = discordClient.client.voiceConnections.get(message.guild.id);
					if (connection == null) return send(Command.error([['Music', 'Not in a voice channel!']]));

					if (connection.dispatcher) {
						connection.dispatcher.once('end', () => connection.channel.leave());
						connection.dispatcher.end('stopped');
					} else connection.channel.leave();
						

					return send(Command.success([['Music', 'Left voice channel.']]));

				case 'play':
					if (params.length > 1) {
						musicPlugin.startPlayingSong(message.guild.id, params.slice(1).join(' '), (errMsg, song) => {
							if (errMsg != null) return send(Command.error([['Music', errMsg]]));
							send(generateFullSong(
								'Playing Song', message.member.user.avatarURL, 
								song.title, song.thumb, song.length,
								new Date(song.uploaded).toISOString()));
						});
					} else {
						musicPlugin.startPlaying(message.guild.id, errMsg => {
							if (errMsg != null) return send(Command.error([['Music', errMsg]]));
						});
					}
					break;
				case 'stop':
					musicPlugin.stopPlaying(message.guild.id, (errMsg) => {
						if (errMsg != null) return send(Command.error([['Music', errMsg]]));
						send(Command.info([['Music', 'Stopped playing music.']]));
					});
					break;

				case 'skip':
				case 'next':
					musicPlugin.nextSong(message.guild.id, (errMsg) => {
						if (errMsg != null) return send(Command.error([['Music', errMsg]]));
					});
					break;
					
				case 'history':
					var param1 = params[1];

					if (param1 == 'clear') {
						// music.clearHistory();
						// music.save();
						// send(Command.info([['Music!', 'History is removed after it\'s older than 7 days.\n If you would like to remove it now use "!music history clear forced"']]));
					} else {
						var page = 1;

						if (param1 != null) {
							var parsed = parseInt(param1);
							if (Number.isInteger(parsed)) page = parsed;
						}

						if (page < 1) page = 1;

						MusicHistory.find({ server_id: message.guild.id })
						.sort({ _id: -1 })
						// .skip((page - 1) * 8)
						.limit(50)
						.populate('song')
						.exec((err, items) => {
							console.log(items);
							if (items.length == 0) return send(Command.info([['Music', 'Nothing in History!']]));

							var maxPages = Math.ceil(items.length/5);

							if (page > maxPages) page = maxPages;

							var fields = [
								[
									'Music', 
									'Items In History: ' + items.length + '\nPage: ' + page + '/' + maxPages
								]
							];

							fields = fields.concat(items.slice((page - 1) * 5, 5).map((q: any, i) => [
								'ID: ' + i,
								q.song.title + '\nhttps://youtu.be/' + q.song.uid + '\nListened to: ' + timeSince(q.played_at) + ' ago'
							]));

							return send(Command.info(fields));
						});
					}

					break;

				case 'queue':
					var param1 = params[1];
					if (param1 != null) param1 = param1.toLowerCase();

					switch (param1) {
						case 'playlist':
							musicPlugin.queuePlaylist(message.guild.id, params[2], (errMsg, count) => {
								send(Command.info([['Queue', 'Playlist queued with ' + count + ' items.']]));
							})	
							break;
						case 'repeat':
							musicPlugin.queueToggleRepeat(message.guild.id, value => {
								if (value) send(Command.info([[ 'Music!', 'Now Repeating the song Queue.']]));
								else send(Command.info([[ 'Music!', 'No longer repating song Queue.']]));
							});
							break;
						
						case 'clear':
							musicPlugin.queueClear(message.guild.id, errMsg => {
								if (errMsg != null) return send(Command.error([['Music', errMsg]]));
								send(Command.info([[ 'Music', 'Cleared song queue.']]));
							});
							return;
						
						case 'shuffle':
							musicPlugin.queueShuffle(message.guild.id, () => {
								send(Command.info([[ 'Music!', 'Shuffled Song Queue.']]));
							});
							break;
						
						case 'remove':
							musicPlugin.queueRemoveItem(message.guild.id, param1, errMsg => {
								if (errMsg != null) return send(Command.error([['Music', errMsg]]));
								send(Command.info([[ 'Music', 'Removed song from queue.']]));
							});
							return;

						default:
							// List
							if (param1 == null || /^[0-9]+$/g.test(param1)) {
								Queue.findOne({ server_id: message.guild.id }, (err, queue: any) => {
									if (queue.items.length == 0) return send(Command.info([['Music', 'Nothing Queued!']]));

									var page = 1;
									var maxPages = Math.ceil(queue.items.length/5);
									var maxItems = 5;

									if (param1 != null) {
										var parsed = parseInt(param1);
										if (Number.isInteger(parsed)) page = parsed;
									}

									if (page > maxPages) page = maxPages;
									if (page < 1) page = 1;

									var pageSlice = (page - 1) * maxItems;
									Song.populate(queue.items.slice(pageSlice, pageSlice + maxItems), { path: 'song' }, (err, items) => {
										var fields = [
											[
												'Music', 
												'Queued Items: ' + queue.items.length + '\nPage: ' + page + '/' + maxPages
											]
										];

										fields = fields.concat(items
										.map((q: any, i) => [
											'ID: ' + (pageSlice + i + 1),
											[	q.song.title,
												idToUrl(q.song.type, q.song.uid)
											].join('\n')
										]));

										return send(Command.info(fields));
									});
								});

								return;
							}

							musicPlugin.queueSong(message.guild.id, message.member.id, params.slice(1).join(' '), (errMsg, song) => {
								if (errMsg != null) return send(Command.error([[ 'Queue', errMsg ]]));

								send(generateFullSong(
									'Added to Queue', message.member.user.avatarURL, 
									song.title, song.thumb, song.length,
									new Date(song.uploaded).toISOString()));
							});
							break;
					}
					break;
				case 'playlist':
					// <pid/d> info
					// <pid/d> list [page]
					// <pid> delete
					// <pid> restore
					// <pid/d> add <song id>
					// <pid/d> remove <song id>
					// <pid/d> clear
					// <pid/d> title <value>
					// <pid/d> description <value>
					// <pid/d> thumbnail <value>

					var playlistId = params.shift();
					var todo = params.shift();
					var defaultPlaylist = (playlistId == 'default');

					if (playlistId == null) return;

					switch (todo) {
						case 'info':
							guildClient.getMusic(message.guild.id, (music) => {
								if (defaultPlaylist) playlistId = music.defaultPlaylist;

								Playlists.findOne({ public_id: playlistId }, (err, playlist: any) => {
									PlaylistItems.count({ playlist: playlist.id }, (err, count) => {
										send(Command.info([[
											'Playlist',
											[
												'Title: ' + playlist.title,
												'Description: ' + playlist.description,
												'',
												'Plays: ' + playlist.plays,
												'Views: ' + playlist.views,
												'Items: ' + count
											].join('\n')
										]]));
									});
								});
							});
							break;
						case 'list':
							guildClient.getMusic(message.guild.id, (music) => {
								if (defaultPlaylist) playlistId = music.defaultPlaylist;

								Playlists.findOne({ public_id: playlistId }, (err, item: any) => {
									var paramPage = params.shift();

									if (paramPage == null || /^[0-9]+$/g.test(paramPage)) {
										PlaylistItems.count({ playlist: item.id }, (err, count) => {
											if (count == 0) return send(Command.info([['Playlist', 'Nothing in Playlist!']]));
	
											var page = 1;
											var maxPages = Math.ceil(count/5);
											var maxItems = 5;
	
											if (paramPage != null) {
												var parsed = parseInt(paramPage);
												if (Number.isInteger(parsed)) page = parsed;
											}
	
											if (page > maxPages) page = maxPages;
											if (page < 1) page = 1;
	
											PlaylistItems.find({ playlist: item.id })
											.skip((page - 1) * maxItems)
											.limit(maxItems)
											.populate('song')
											.exec((err, items) => {
												var fields = [
													[
														'Playlist', 
														'Items: ' + count + '\nPage: ' + page + '/' + maxPages
													]
												]
	
												fields = fields.concat(items
												.map((q: any, i) => [
													'ID: ' + (((page - 1) * 5) + i + 1),
													[	q.song.title,
														idToUrl(q.song.type, q.song.uid)
													].join('\n')
												]));
	
												return send(Command.info(fields));
											});
										});
	
										return;
									}
								});
							});
							break;
						case 'delete':
							musicPlugin.removePlaylist(playlistId, err => {
								if (err != null) return send(Command.error([['Playlist', err]]));
								send(Command.info([['Playlist', 'Playlist now queued for deletion.']]));
							});
							break;
						case 'restore':
							musicPlugin.restorePlaylist(playlistId, err => {
								if (err != null) return send(Command.error([['Playlist', err]]));
								send(Command.info([['Playlist', 'Playlist not queued for deletion.']]));
							});
							break;
						case 'add':
							musicPlugin.addToPlaylist(message.guild.id, message.member.id, playlistId, params.shift(), (err, info) => {
								if (err != null) return send(Command.error([['Playlist', err]]));
								send(Command.error([['Playlist', 'Added song to playlist.']]));
							});
							break;
						case 'remove':
							musicPlugin.removeFromPlaylist(message.guild.id, message.member.id, playlistId, params.shift(), (err, info) => {
								if (err != null) return send(Command.error([['Playlist', err]]));
								send(Command.error([['Playlist', 'Removed song from playlist.']]));
							});
							break;
						case 'clear':
							musicPlugin.clearPlaylist(message.guild.id, message.member.id, playlistId, (err, playlist) => {
								if (err != null) return send(Command.error([['Playlist', err]]));
								send(Command.error([['Playlist', 'Removed song from playlist.']]));
							});
							break;
						case 'title':
							var title = params.join(' ');
							if (title.length == 0) return send(Command.error([['Playlist', 'Playlist title cannot be nothing.']]));

							musicPlugin.editPlaylist(playlistId, 'title', title.slice(0, 50), errMsg => {
								send(Command.info([['Playlist', 'Updated Playlist title.']]));
							});
							break;
						case 'description':
							var desc = params.join(' ');

							musicPlugin.editPlaylist(playlistId, 'description', desc.slice(0, 1000), errMsg => {
								send(Command.info([['Playlist', 'Updated Playlist description.']]));
							});
							break;
						case 'thumbnail':
							var thumb = params.join(' ');

							musicPlugin.editPlaylist(playlistId, 'thumb', thumb, errMsg => {
								send(Command.info([['Playlist', 'Updated Playlist thumbnail']]));
							});
							break;
					}
					break;
				default: return Command.error([['ERROR!', 'Unknown usage!']]);
			}

			function send(str: any) {
				message.channel.send(new Discord.RichEmbed(str.embed));
			}
		});
	}
}

function timeSince(time: number) {
	var seconds = Math.floor((new Date().getTime() - time) / 1000);

	var interval = Math.floor(seconds / 31536000);

	if (interval > 1) return interval + ' years';

	interval = Math.floor(seconds / 2592000);
	if (interval > 1) return interval + ' months';

	interval = Math.floor(seconds / 86400);
	if (interval > 1) return interval + ' days';

	interval = Math.floor(seconds / 3600);
	if (interval > 1) return interval + ' hours';

	interval = Math.floor(seconds / 60);
	if (interval > 1) return interval + ' minutes';

	return Math.floor(seconds) + ' seconds';
}


function itemToSong(type: 'youtube', item: any, cb?: (song: DiscordBot.plugins.SongGlobal) => any) {
	if (type == 'youtube') {
		var song: DiscordBot.plugins.SongGlobal = {
			type: type,
			_id: null,
			uid: item.id.videoId || item.id,
			title: item.snippet.title,
			length: ytDurationToSeconds(item.contentDetails.duration),
			thumb: item.snippet.thumbnails.default.url,
			uploaded: new Date(item.snippet.publishedAt).getTime(),
			channelId: item.snippet.channelId
		};

		Song.findOne({ type: type, uid: song.uid }, (err, item) => {
			if (item != null) {
				song._id = item.id;
				return cb(song);
			}

			Song.create({
				type: song.type,
				uid: song.uid,
				title: song.title,
				length: song.length,
				uploaded: song.uploaded,
				thumb: song.thumb,
				uploader_id: song.channelId
			})
			.then(item => {
				song._id = item.id;
				cb(song);
			}, err => console.error(err))
			.catch(err => console.error(err));
		});
	}
}

function getOrCreateSong(type: 'youtube', uid: string, cb: (song: DiscordBot.plugins.SongGlobal) => any) {
	Song.findOne({ type: type, uid: uid }, (err, songDoc: any) => {
		if (songDoc != null) return cb({
			type: songDoc.type,
			_id: songDoc.id,
			uid: songDoc.uid,
			title: songDoc.title,
			length: songDoc.length,
			thumb: songDoc.thumb,
			uploaded: songDoc.uploaded,
			channelId: songDoc.uploader_id
		});

		youTube.getById(idToUrl(type, uid), (err, resp) => {
			itemToSong('youtube', resp.items[0], song => cb(song));
		});
	});
}

function secondsToProper(seconds: number): string {
	var hours   = Math.floor(seconds / 3600);
	var minutes = Math.floor((seconds - (hours * 3600)) / 60);
	var seconds = seconds - (hours * 3600) - (minutes * 60);

	// round seconds
	seconds = Math.round(seconds * 100) / 100

	var result = (hours < 10 ? '0' + hours : '' + hours);
	result += '-' + (minutes < 10 ? '0' + minutes : minutes);
	result += '-' + (seconds  < 10 ? '0' + seconds : seconds);
	return result;
}

function ytDurationToSeconds(duration: string): number {
	var time = /PT(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i.exec(duration);
	var seconds = 0;
	
	if (time[1] != null) seconds += parseInt(time[1]) * 60 * 60 * 24;
	if (time[2] != null) seconds += parseInt(time[2]) * 60 * 60;
	if (time[3] != null) seconds += parseInt(time[3]) * 60;
	if (time[4] != null) seconds += parseInt(time[4]);

	return seconds;
}

function idToUrl(site: 'youtube', id: string) {
	if (site == 'youtube') return 'https://youtu.be/' + id;
	return 'Unknwon: ' + id + ' - ' + site;
}

function generateFullSong(
	title: string, icon: string, 
	videoTitle: string, videoThumb: string,
	duration: number, uploaded: string) {
	return {
		embed: {
			title: videoTitle,
			url: 'https://youtu.be/',
			color: Command.InfoColor,
			timestamp: uploaded,
			footer: {
				icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
				text: 'Youtube'
			},
			thumbnail: {
				url: videoThumb
			},
			author: {
				name: title,
				url: 'https://its.rip/for/bots',
				icon_url: icon
			},
			fields: [
				{
					name: 'Duration',
					value: secondsToProper(duration),
					inline: true
				}
				// {
				// 	name: 'Position',
				// 	value: 'best',
				// 	inline: true
				// }
			]
		}
	};
}

export = Music;