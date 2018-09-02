import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');


import Command = require('../../command');
// import discordClient = require('../../index');
import guildClient = require('../../guildClient');
import config = require('../../../site/util/config');

import MusicHistory = require('../../../music/models/history');
import Playlists = require('../../../music/models/playlists');

import musicPlugin = require('../../plugins/music');
import musicPermissions = require('../../../music/permissions');

import request = require('request');

import chatUtils = require('../../utils/chat');

import utils = require('../../utils');


// TODO: Check if in voice channel after restart.
// TODO: pause/previous
// TODO: Transfer most of these things to plugins/music for web view functionality.

function sendReq(url: string, opts, cb) {
	return request.post('http://' + config.music.address + ':' + config.music.port + '/' + url, (err, res, body) => {
		cb(null, (body == null ? { error: 'Music bot errored!' } : JSON.parse(body)));
	})
	.form(opts)
	.on('error', error => cb(error));
}

const commandUsage = Command.info([
	[
		'Command Usage',
		Command.table(['Command', 'Desc'], [
			['join [@channel/Channel ID]', 'Joins said channel'],
			['info', 'Shows the current song info'],
			['play [URL/Name]', 'Instantly plays a song'],
			['stop', 'Stops playing music'],
			['skip/next', 'Skips the current song'],
			['search <query>', 'Search for a video and play/queue it'],
			['history [page]', 'Shows song history'],
			['history clear', 'Clears song history']
		])
	],
	[
		'Queue',
		Command.table(['Command', 'Desc'], [
			['queue list [page]', 'View queue'],
			['queue add <URL/Name>', 'Queue song'],
			['queue repeat', 'Repeat Queue'],
			['queue shuffle', 'Shuffle Queue'],
			['queue clear', 'Clear Queue'],
			['queue playlist <pid>', 'Queue Playlist'],
			['queue remove <ID/URL>', 'Remove item from queue']
		])
	],
	[
		'Playlist',
		Command.table(['Command', 'Desc'], [
			['playlist create', 'Create new playlist'],
			['playlist <pid/default> info', 'View playlist info'],
			['playlist <pid/default> list [page]', 'View playlist songs'],
			['playlist <pid> delete', 'Delete playlist'],
			['playlist <pid/default> add <id>', 'Add item to playlist'],
			['playlist <pid/default> remove <id>', 'Remove item from playlist'],
			['playlist <pid/default> clear', 'Clear Playlist'],
			['playlist <pid/default> title <title>', 'Change title'],
			['playlist <pid/default> description <desc>', 'Change description'],
			['playlist <pid/default> thumbnail <url>', 'Change thumbnail']
		])
	],
	// [ 'Listen Online', 'https://bots.its.rip/music/' ]
]);


const PERMS = {
	MAIN: 'commands.music',
	INFO: 'info',
	JOIN: 'join',
	LEAVE: 'leave',
	CURRENT: 'current',
	PLAY: 'play',
	STOP: 'stop',
	SKIP: 'skip',
	SEARCH: 'search',
	HISTORY: 'history',
	HISTORY_LIST: 'history.list',
	HISTORY_CLEAR: 'history.clear',
	QUEUE: 'queue',
	QUEUE_ADD: 'queue.add',
	QUEUE_PLAYLIST: 'queue.playlist',
	QUEUE_LIST: 'queue.list',
	QUEUE_REPEAT: 'queue.repeat',
	QUEUE_SHUFFLE: 'queue.shuffle',
	QUEUE_CLEAR: 'queue.clear',
	QUEUE_REMOVE: 'queue.remove',
	PLAYLIST: 'playlist',
	PLAYLIST_CREATE: 'playlist.create',
	PLAYLIST_INFO: 'playlist.info',
	PLAYLIST_LIST: 'playlist.list',
	PLAYLIST_DELETE: 'playlist.delete',
	PLAYLIST_ADD: 'playlist.add',
	PLAYLIST_REMOVE: 'playlist.remove',
	PLAYLIST_CLEAR: 'playlist.clear',
	PLAYLIST_TITLE: 'playlist.title',
	PLAYLIST_DESCRIPTION: 'playlist.description',
	PLAYLIST_THUMBNAIL: 'playlist.thumbnail'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Music extends Command {
	constructor() {
		super('music');

		this.perms = Object.values(PERMS);
		this.description = 'Used to manage music in voice channels.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!server.isPluginEnabled('music'))
			return Command.error([['Music', 'Music isn\'t enabled! Please enable the plugin!\n' + server.getPrefix() + 'plugin enable music' ]]);

		if (params.length == 0) return commandUsage;

		// TODO: Fix this crap... whatever it was used for.
		// music.lastTextChannelId = message.channel.id;
		// if (music.lastVoiceChannelId != null) {
		// 	if (message.guild.channels.get(music.lastVoiceChannelId) == null) {
		// 		music.lastVoiceChannelId = null;
		// 		console.log('Voice channel is non-existent now');
		// 	}
		// }

		switch (params.shift().toLowerCase()) {
			case 'info':
				if (!this.hasPerms(message.member, server, PERMS.INFO)) return Command.noPermsMessage('Music');

				var items = [];

				guildClient.getMusic(message.guild.id, (music) => {
					if (music.playing != null) {
						items.push([
							'Song',
							[
								'The Current song is:',
								'Title: ' + music.playing.title,
								'Link: ' + utils.videoIdToUrl(music.playing.type, music.playing.id)
							].join('\n')
						]);
					} else items.push([ 'Song', 'Not currently playing any music.' ]);

					items.push([
						'Options',
						[
							// 'Playing From: ' + music.playingFrom,
							'Repeat Queue: ' + (music.repeatQueue ? 'Yes' : 'No'),
							'Repeat song: ' + (music.repeatSong ? 'Yes' : 'No')
						].join('\n')
					]);

					send(Command.info(items));
				});
				break;
			case 'join':
				if (!this.hasPerms(message.member, server, PERMS.JOIN)) return Command.noPermsMessage('Music');

				var voiceChannel: string = params.shift();

				if (voiceChannel == null && message.member.voiceChannel != null) {
					voiceChannel = message.member.voiceChannel.id;
				}

				if (voiceChannel == null) return send(Command.error([['Music', 'Unable to find voice channel.']]));

				sendReq('join', {
					guild_id: message.guild.id,
					channel_id: voiceChannel
				}, (err, res) => {
					if (err) { console.error(err); send(Command.error([['Music', 'An error occured.']])); return; }
					if (res.error) { console.error(err); send(Command.error([['Music', res.error]])); return; }
					if (res.msg) send(Command.success([['Music', res.msg]]));
				});
				break;

			case 'leave':
				if (!this.hasPerms(message.member, server, PERMS.LEAVE)) return Command.noPermsMessage('Music');

				sendReq('leave', {
					guild_id: message.guild.id
				}, (err, res) => {
					if (err) { console.error(err); send(Command.error([['Music', 'An error occured.']])); return; }
					if (res.error) { console.error(err); send(Command.error([['Music', res.error]])); return; }
					if (res.msg) send(Command.success([['Music', res.msg]]));
				});
				break;

			case 'search':
				if (!this.hasPerms(message.member, server, PERMS.SEARCH)) return Command.noPermsMessage('Music');
				var search = params.join(' ').trim();

				message.channel.send(Command.info([['Music', 'Searching for videos please wait...']]))
				.then((m: any) => {
					const selector = chatUtils.createPageSelector(message.member.id, message.channel);
					selector.setEditing(m);

					nextPage(selector, search, null, () => selector.display());


					var self = this;

					function nextPage(pager: chatUtils.MessagePage, query, page, cb) {
						sendReq('search', { query: query, page: page }, (err, res: { error: any, data: SongSearch; }) => {
							if (err) { console.error(err); pager.temporaryMessage(Command.error([['Music', 'An error occured.']]), 3000); return; }
							if (res.error) { console.error(err); pager.temporaryMessage(Command.error([['Music', res.error]]), 3000); return; }

							var data = res.data;

							data.items.forEach((song, p) => {
								pager.addSelection(String(p + 1), song.title, (newPage) => {
									newPage.setFormat([
										'ID: ' + song.id,
										'Title: ' + song.title,
										'Uploaded: ' + new Date(song.published).toDateString(),
										'What would you like to do?\n',
										'{page_items}'
									]);

									newPage.addSpacer();

									if (self.hasPerms(message.member, server, PERMS.PLAY)) {
										newPage.addSelection('Play', 'Play it now.', () => {
											newPage.edit(Command.info([['Music', 'Playing song please wait.']]), () => {
												sendPlay(message.guild.id, message.member.id, song.id, msg => {
													if (msg != null) return newPage.temporaryMessage(msg, 3000);
													newPage.close('delete');
												});
											});
										});
									}

									if (self.hasPerms(message.member, server, PERMS.QUEUE_ADD)) {
										newPage.addSelection('Queue', 'Queue it for later.', () => {
											newPage.edit(Command.info([['Music', 'Queueing song...']]), () => {
												sendQueue('add', message.guild.id, message.member.id, message.channel.id, [song.id], msg => {
													console.log(msg);
													if (msg != null) return newPage.temporaryMessage(msg, 3000);
													newPage.close('delete');
												});
											});
										});
									}

									newPage.display();
								});
							});

							pager.addSpacer();

							if (data.nextPageToken) {
								pager.addSelection('Next', 'Next Page', (newPage) => {
									nextPage(newPage, query, data.nextPageToken, () => newPage.display());
								});
							}

							cb();
						});
					}
				})
				.catch(e => console.error(e));
				break;

			case 'play':
				if (!this.hasPerms(message.member, server, PERMS.PLAY)) return Command.noPermsMessage('Music');

				var joined = params.join(' ').trim();

				sendPlay(message.guild.id, message.member.id, joined.length == 0 ? null : joined, (value) => Command.error(value));
				break;

			case 'stop':
				if (!this.hasPerms(message.member, server, PERMS.STOP)) return Command.noPermsMessage('Music');

				sendReq('stop', {
					guild_id: message.guild.id
				}, (err, res) => {
					if (err) { console.error(err); send(Command.error([['Music', 'An error occured.']])); return; }
					if (res.error) { console.error(err); send(Command.error([['Music', res.error]])); return; }
					if (res.msg) send(Command.success([['Music', res.msg]]));
				});
				break;

			case 'skip':
			case 'next':
				if (!this.hasPerms(message.member, server, PERMS.SKIP)) return Command.noPermsMessage('Music');

				sendReq('next', {
					guild_id: message.guild.id,
					member_id: message.member.id,
					channel_id: voiceChannel
				}, (err, res) => {
					if (err) { console.error(err); send(Command.error([['Music', 'An error occured.']])); return; }
					if (res.error) { console.error(err); send(Command.error([['Music', res.error]])); return; }
					if (res.msg) send(Command.success([['Music', res.msg]]));
				});
				break;

			case 'history':
				var paramToDo = params.shift();

				if (paramToDo == 'clear') {
					if (!this.hasPerms(message.member, server, PERMS.HISTORY_CLEAR)) return Command.noPermsMessage('Music');

					MusicHistory.updateOne({ server_id: message.guild.id }, { $set: { songs: [], song_count: 0 } }).exec(() => {
						send(Command.info([['Music!', 'Cleared history.']]));
					});
				} else {
					if (!this.hasPerms(message.member, server, PERMS.HISTORY_LIST)) return Command.noPermsMessage('Music');

					var page = 1;
					var maxItems = 5;

					if (paramToDo != null) {
						var parsed = parseInt(paramToDo);
						if (Number.isInteger(parsed)) page = parsed;
					}

					if (page < 1) page = 1;

					MusicHistory.findOne({ server_id: message.guild.id }, { songs: { $slice: [(page - 1) * maxItems, maxItems] } }, (err, item) => {
						if (err != null) {
							console.error(err);
							send(Command.error([['Music', 'Nothing in History!']]));
							return;
						}

						if (item == null || item.song_count == 0) return send(Command.info([['Music', 'Nothing in History!']]));

						var maxPages = Math.ceil(item.song_count/maxItems);

						if (page > maxPages) return send(Command.info([['Music', 'Exceeded max history pages. (' + page + '/' + maxPages + ')']]));

						var fields = [
							[
								'Music',
								'Items In History: ' + item.song_count + '\nPage: ' + page + '/' + maxPages
							]
						];

						var songIds = item.songs.map(s => s.song_id);

						musicPlugin.getSong(songIds.filter((item, pos) => songIds.indexOf(item) == pos), (err, songs) => {
							if (err != null) return send(Command.error([['Music', err]]));

							fields = fields.concat(songIds.map((id, pos) => {
								for(var i = 0; i < songs.length; i++) {
									var song = songs[i];

									if (song.id == id) {
										return [
											'ID: ' + pos,
											song.title + '\nhttps://youtu.be/' + song.id + '\nListened to: ' + utils.timeSince(item.songs[pos].played_at) + ' ago'
										];
									}
								}

								return [ 'ID: ' + i, 'Unknown.' ];
							}));

							send(Command.info(fields));
						});
					});
				}
				break;

			case 'queue':
				var paramToDo = (params.shift() || 'list').toLowerCase();

				if (['list', 'add', 'playlist', 'repeat', 'shuffle', 'clear', 'remove'].indexOf(paramToDo) == -1) return Command.error([['Music', 'Not a valid option: ' + paramToDo]]);

				if (!this.hasPerms(message.member, server, PERMS['QUEUE_' + paramToDo.toUpperCase()])) return Command.noPermsMessage('Music');

				sendQueue(paramToDo, message.guild.id, message.member.id, voiceChannel, params, (msg) => {
					send(msg);
				});
				break;

			case 'playlist':
				var playlistId = params.shift();

				if (playlistId == 'create') {
					if (!this.hasPerms(message.member, server, PERMS.PLAYLIST_CREATE)) return Command.noPermsMessage('Music');

					Playlists.count({ creator_id: message.member.id }, (err, count) => {
						if (count >= 10) return send(Command.error([['Playlist', 'Max Playlists reached.']]));

						Playlists.create({
							creator_id: message.member.id,

							type: 1,
							visibility: 2,

							permissions: Object.values(musicPermissions.PLAYLIST_FLAGS).reduce((all, p) => all | p, 0),

							public_id: uniqueID(9),

							title: 'New Playlist',
							description: 'New Playlist',
						})
						.then(playlist => {
							send(Command.info([[
								'Playlist',
								[
									'Successfully created a new Playlist!',
									'',
									'Title: ' + playlist.title,
									'Description: ' + playlist.description,
									'',
									'ID: ' + playlist.public_id
								].join('\n')
							]]));
						}, err => console.error(err))
						.catch(err => console.error(err));
					});
					return;
				}

				var todo = params.shift() || 'info';
				var defaultPlaylist = playlistId == null || (playlistId == 'default');

				if (playlistId == null) todo = 'info';

				if (['info', 'list', 'delete', 'add', 'remove', 'clear', 'title', 'description', 'thumbnail'].indexOf(todo) == -1) return Command.error([['Music', 'Unknown Usage: ' + todo]]);

				if (!this.hasPerms(message.member, server, PERMS['PLAYLIST_' + todo.toUpperCase()])) return Command.noPermsMessage('Music');

				switch (todo) {
					case 'info':
						guildClient.getMusic(message.guild.id, (music) => {
							if (defaultPlaylist) playlistId = music.currentPlaylist;

							Playlists.findOne({ public_id: playlistId }, {}, (err, playlist) => {
								if (playlist == null) return send(Command.error([['Playlist', 'No Playlist found.']]));

								send(Command.info([[
									'Playlist',
									[
										'Title: ' + playlist.title,
										'Description: ' + playlist.description,
										'',
										'Plays: ' + playlist.plays,
										'Views: ' + playlist.views,
										'Items: ' + playlist.song_count,
										'',
										'ID: ' + playlist.public_id
									].join('\n')
								]]));
							});
						});
						break;
					case 'list':
						guildClient.getMusic(message.guild.id, (music) => {
							if (defaultPlaylist) playlistId = music.currentPlaylist;

							var paramPage = params.shift();

							if (paramPage == null || /^[0-9]+$/g.test(paramPage)) {
								var page = 1;
								var maxItems = 5;

								if (page < 1) page = 1;

								if (paramPage != null) {
									var parsed = parseInt(paramPage);
									if (Number.isInteger(parsed)) page = parsed;
								}

								Playlists.findOne({ public_id: playlistId }, { songs: { $slice: [(page - 1) * maxItems, maxItems] } }, (err, item) => {
									if (item.song_count == 0) return send(Command.info([['Playlist', 'Nothing in Playlist!']]));

									var maxPages = Math.ceil(item.song_count/5);

									if (page > maxPages) return send(Command.info([['Playlist', 'Max pages exceeded!']]));

									musicPlugin.getSong(item.songs.map(i => i.song), (err, songs) => {
										songs = Array.isArray(songs) ? songs : [songs];

										var fields = [
											[
												'Playlist',
												'Items: ' + item.song_count + '\nPage: ' + page + '/' + maxPages
											]
										]

										fields = fields.concat(songs
										.map((q: any, i) => [
											'ID: ' + (((page - 1) * 5) + i + 1),
											[	q.title,
												utils.videoIdToUrl(q.type || 'youtube', q.id)
											].join('\n')
										]));

										return send(Command.info(fields));
									});
								});
								return;
							}
						});
						break;
					case 'delete':
						musicPlugin.removePlaylist(playlistId, err => {
							if (err != null) return send(Command.error([['Playlist', err]]));
							send(Command.info([['Playlist', 'Playlist now queued for deletion.']]));
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

		function send(str: { embed: any; }) {
			return message.channel.send(new Discord.RichEmbed(str.embed));
		}
	}
}

// Sends

function sendQueue(doe: string, guild_id: string, member_id: string, channel_id: string, params: string[], cb: (msg?) => any) {
	sendReq('queue/' + doe, {
		guild_id: guild_id,
		member_id: member_id,
		channel_id: channel_id,
		params: params
	}, (err, res) => {
		if (err) { console.error(err); cb(Command.error([['Music', 'An error occured.']])); return; }
		if (res.error) { console.error(err); cb(Command.error([['Music', res.error]])); return; }
		if (res.msg) return (Command.success([['Music', res.msg]]));
		if (res.embed) return cb(Command.success(res.embed));

		cb();
	});
}

function sendPlay(guild_id: string, member_id: string, search: string, cb: (msg?) => any) {
	sendReq('play', {
		guild_id: guild_id,
		member_id: member_id,
		search: search
	}, (err, res) => {
		if (err) { console.error(err); cb(Command.error([['Music', 'An error occured.']])); return; }
		if (res.error) { console.error(err); cb(Command.error([['Music', res.error]])); return; }
		cb();
		// send(Command.success([['Music', 'Playing song.']]));
	});
}


function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}



interface SongSearch {
	nextPageToken?: string;
	previousPageToken?: string;

	totalResults: number;
	resultsPerPage: number;

	items: {
		type: string;
		id: string;
		published: number;
		title: string;
		channel: {
			id: string;
			title: string;
		};
		thumbnail: {
			url: string;
			width: number;
			height: number;
		};
	}[];
}


export = Music;