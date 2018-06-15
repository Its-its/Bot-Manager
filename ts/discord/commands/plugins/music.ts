import Discord = require('discord.js');
import YouTube = require('youtube-node');

import Command = require('../../command');
// import discordClient = require('../../index');
import guildClient = require('../../guildClient');
import config = require('../../../site/util/config');

import MusicHistory = require('../../../music/models/history');
import Playlists = require('../../../music/models/playlists');

import musicPlugin = require('../../plugins/music');
import musicPermissions = require('../../../music/permissions');


import request = require('request');


let youTube = new YouTube();
youTube.setKey(config.youtube.key);

// TODO: Check if in voice channel after restart.
// TODO: Repeat/previous
// TODO: Transfer most of these things to plugins/music for web view functionality.

function sendReq(url: string, opts, cb) {
	return request.post('http://' + config.music.address + ':' + config.music.port + '/' + url, (err, res, body) => {
		cb(null, body == null ? { error: 'Music portion errored!' } : JSON.parse(body));
	})
	.form(opts)
	.on('error', error => cb(error));
}

class Music extends Command {
	constructor() {
		super('music');

		this.perms = [ 'commands.music' ]
		.concat([
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
			'queue.playlist',
			'queue.list',
			'queue.repeat',
			'queue.shuffle',
			'queue.clear',
			'queue.remove'
		].map(i => 'commands.music.' + i));
	}

	public call(params, server, message) {
		if (!server.isPluginEnabled('music'))
			return Command.error([['Music', 'Music isn\'t enabled! Please enable the plugin!\n' + server.getPrefix() + 'plugin enable music' ]]);

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
						'queue playlist <ID>',
						'queue remove <ID/URL>',
						'playlist create',
						'playlist <pid/default> info',
						'playlist <pid/default> list [page]',
						'playlist <pid> delete',
						'playlist <pid/default> add <song id>',
						'playlist <pid/default> remove <song id>',
						'playlist <pid/default> clear',
						'playlist <pid/default> title <title>',
						'playlist <pid/default> description <description>',
						'playlist <pid/default> thumbnail <url>'
					].map(b => server.getPrefix() + 'music ' + b).join('\n')
				],
				// [ 'Listen Online', 'https://bots.its.rip/music/' ] 
			]);
		}

		// TODO: Fix this crap
		// music.lastTextChannelId = message.channel.id;
		// if (music.lastVoiceChannelId != null) {
		// 	if (message.guild.channels.get(music.lastVoiceChannelId) == null) {
		// 		music.lastVoiceChannelId = null;
		// 		console.log('Voice channel is non-existent now');
		// 	}
		// }

		switch (params.shift().toLowerCase()) {
			case 'info':
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
								'Link: ' + idToUrl(music.playing.type, music.playing.id)
							].join('\n')
						]]));
					} else send(Command.info([['Music', 'No song is currently playing!']]));
				});
				break;
			case 'join':
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
				sendReq('leave', {
					guild_id: message.guild.id
				}, (err, res) => {
					if (err) { console.error(err); send(Command.error([['Music', 'An error occured.']])); return; }
					if (res.error) { console.error(err); send(Command.error([['Music', res.error]])); return; }
					if (res.msg) send(Command.success([['Music', res.msg]]));
				});
				break;

			case 'play':
				var joined = params.join(' ').trim();

				sendReq('play', {
					guild_id: message.guild.id,
					member_id: message.member.id,
					search: joined.length == 0 ? null : joined
				}, (err, res) => {
					if (err) { console.error(err); send(Command.error([['Music', 'An error occured.']])); return; }
					if (res.error) { console.error(err); send(Command.error([['Music', res.error]])); return; }
					send(Command.success([['Music', 'Playing song.']]));
				});
				break;

			case 'stop':
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
					// music.clearHistory();
					// music.save();
					// send(Command.info([['Music!', 'History is removed after it\'s older than 7 days.\n If you would like to remove it now use "!music history clear forced"']]));
				} else {
					var page = 1;

					if (paramToDo != null) {
						var parsed = parseInt(paramToDo);
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
				var paramToDo = (params.shift() || 'list').toLowerCase();

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
				var todo = params.shift() || 'info';
				var defaultPlaylist = playlistId == null || (playlistId == 'default');

				if (playlistId == null) todo = 'info';

				if (playlistId == 'create') {
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

		function send(str: any) {
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