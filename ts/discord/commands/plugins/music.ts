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


// TODO: Check if in voice channel after restart.
// TODO: Repeat/previous
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
			['history [page]', 'Shows song history'],
			['history clear', 'Clears song history']
		])
	],
	[
		'Queue', 
		Command.table(['Command', 'Desc'], [
			['queue [page/URL/Name]', 'View queue/Queue song'],
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
	HISTORY: 'history',
	HISTORY_LIST: 'history.list',
	HISTORY_CLEAR: 'history.clear',
	QUEUE: 'queue',
	QUEUE_ITEM: 'queue.item',
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
								'Link: ' + idToUrl(music.playing.type, music.playing.id)
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
					console.log(res);

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

			case 'play':
				if (!this.hasPerms(message.member, server, PERMS.PLAY)) return Command.noPermsMessage('Music');

				var joined = params.join(' ').trim();

				sendReq('play', {
					guild_id: message.guild.id,
					member_id: message.member.id,
					search: joined.length == 0 ? null : joined
				}, (err, res) => {
					if (err) { console.error(err); send(Command.error([['Music', 'An error occured.']])); return; }
					if (res.error) { console.error(err); send(Command.error([['Music', res.error]])); return; }
					// send(Command.success([['Music', 'Playing song.']]));
				});
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

						musicPlugin.getSong(item.songs.map(s => s.song_id), (err, songs) => {
							if (err != null) return send(Command.error([['Music', err]]));

							fields = fields.concat(songs.map((q, i) => [
								'ID: ' + i,
								q.title + '\nhttps://youtu.be/' + q.id + '\nListened to: ' + timeSince(item.songs[i].played_at) + ' ago'
							]));
	
							send(Command.info(fields));
						});
					});
				}
				break;

			case 'queue':
				var paramToDo = (params.shift() || 'list').toLowerCase();

				if (['list', 'item', 'playlist', 'repeat', 'shuffle', 'clear', 'remove'].indexOf(paramToDo)) return Command.error([['Music', 'Not a valid option: ' + paramToDo]]);

				if (!this.hasPerms(message.member, server, PERMS['QUEUE_' + paramToDo.toUpperCase()])) return Command.noPermsMessage('Music');


				sendReq('queue/' + paramToDo, {
					guild_id: message.guild.id,
					member_id: message.member.id,
					channel_id: voiceChannel,
					params: params
				}, (err, res) => {
					if (err) { console.error(err); send(Command.error([['Music', 'An error occured.']])); return; }
					if (res.error) { console.error(err); send(Command.error([['Music', res.error]])); return; }
					if (res.msg) send(Command.success([['Music', res.msg]]));
					if (res.embed) send(Command.success(res.embed));
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
												idToUrl(q.type || 'youtube', q.id)
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

function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}

function idToUrl(site: 'youtube', id: string) {
	if (site == 'youtube') return 'https://youtu.be/' + id;
	return 'Unknwon: ' + id + ' - ' + site;
}


export = Music;