import Discord = require('discord.js');
import YouTube = require('youtube-node');

import Command = require('../../command');
import discordClient = require('../../index');
import guildClient = require('../../guildClient');
import config = require('../../../site/util/config');

let youTube = new YouTube();
youTube.setKey(config.youtube.key);

// TODO: Search YT

let dispatchers: { [id: string]: Discord.StreamDispatcher } = {};

class Music extends Command {
	constructor() {
		super('music');

		this.addParams(0, (params, userOptions, message) => {
			var blacklisted = userOptions.moderation.blacklisted;

			if (params.length == 0) {
				return Command.info([
					[
						'Command Usage', 
						[	'join [Channel ID]',
							'current/song',
							'play [URL/Name]',
							'stop',
							'skip/next',
							'history',
							'history list',
							'history clear',
							'queue', 
							'queue <URL/Name>',
							'queue list',
							'queue repeat',
							'queue shuffle',
							'queue clear',
							'queue remove <ID/URL>'
						].map(b => '!music ' + b).join('\n') ]
				]);
			}

			params[0] = params[0].toLowerCase();

			if (['join', 'play', 'stop', 'skip', 'next', 'queue', 'history', 'current', 'song'].indexOf(params[0]) == -1)
				return Command.error([['ERROR!', 'Unknown usage!']]);

			guildClient.getMusic(message.guild.id, (music) => {
				music.lastTextChannelId = message.channel.id;
				if (music.lastVoiceChannelId != null) {
					if (message.guild.channels.get(music.lastVoiceChannelId) == null) {
						music.lastVoiceChannelId = null;
						console.log('Voice channel is non-existent now');
					}
				}

				switch (params[0]) {
					case 'current':
					case 'song':
						if (music.playing) {
							send(Command.info([[
								'Music', 
								[
									'The Current song is:',
									'Title: ' + music.playing.title,
									'Link: https://youtu.be/' + music.playing.id
								].join('\n')
							]]));
						} else send(Command.info([['Music', 'No song is currently playing!']]));
						break;
					case 'join':
						var voiceChannel: Discord.VoiceChannel;
						if (params[1] != null) {
							voiceChannel = <Discord.VoiceChannel>message.guild.channels.get(params[1]);
							if (voiceChannel == null || voiceChannel.type != 'voice') 
								return send(Command.error([['ERROR!', 'Unable to join channel provided.\nPlease right click the VOICE Channel and click "Copy ID"\nOR\nJoin the VOICE channel and do !music join']]));
						} else if (message.member.voiceChannel != null) {
							voiceChannel = message.member.voiceChannel;
						} else {
							return send(Command.error([['ERROR!', 'Unable to join channel provided.\nPlease right click the VOICE Channel and click "Copy ID" !music join <id>\nOR\nJoin the VOICE channel and do !music join']]));
						}
	
						if (voiceChannel != null) {
							music.lastVoiceChannelId = voiceChannel.id;
							music.save();

							joinChannel(voiceChannel);
							return send(Command.success([['Music', 'Joined Channel!']]));
						}
						break;
	
					case 'play':
						if (params[1] != null) {
							var val = /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)?([^= &?/\r\n]{8,11})/g.exec(params[1]);

							if (val != null && params.length == 2) {
								if (val == null) return console.error('Invalid Youtube URL/ID');

								var id = val[1];

								youTube.getById(id, (err, resp) => {
									if (err) return console.error(err);
									var item = resp.items[0];

									if (item == null) return send(Command.warning([['Music', 'Could not find song: "' + id + '"']]));	
									if (item.kind != 'youtube#video') return send(Command.warning([['Music', 'Not a Video!']]));

									music.play({
										type: 'youtube',
										id: id,
										title: item.snippet.title
									});
								});
							} else {
								var search = params.slice(1).join(' ');
								send(Command.info([['Music!', 'Finding "' + search + '" Please wait!']]));
								youTube.search(search, 4, (error, result) => {
									if (error) return console.error(error);
									var items = result.items;
	
									for (var i = 0; i < items.length; i++) {
										var item = items[i];
	
										if (item.id.kind == 'youtube#video') {
											music.play({
												type: 'youtube',
												id: item.id.videoId,
												title: item.snippet.title
											});
											break;
										}
									}
								});
							}
						} else {
							return send(Command.info([['Music!', 'Continuing queue!']]));
						}
						break;
					case 'stop':
						music.stop();
						break;

					case 'skip':
					case 'next':
						music.next();
						break;
						
					case 'history':
						var param1 = params[1];

						if (param1 == null) {
							return send(Command.info([
								[	'Command Usage', 
									[	'history',
										'history list',
										'history clear'
									].map(b => '!music ' + b).join('\n') ]
							]));
						}

						if (param1 == 'clear') {
							music.clearHistory();
							music.save();
							send(Command.info([['Music!', 'Cleared Music History.']]));
						} else if (param1 == 'list') {
							var size = music.history.length;

							if (size == 0) return send(Command.info([['Music', 'Nothing in History!']]));

							var page = 1;
							var maxPages = Math.ceil(size/5);

							if (params[2] != null) {
								var parsed = parseInt(params[2]);
								if (Number.isInteger(parsed)) page = parsed;
							}

							if (page > maxPages) page = maxPages;
							if (page < 1) page = 1;

							var fields = [
								[
									'Music', 
									'Items In History: ' + size + '\nPage: ' + page + '/' + maxPages
								]
							]

							fields = fields.concat(music.history.slice(page - 1, 5).map((q, i) => [
								'ID: ' + i, q.title + '\nhttps://youtu.be/' + q.id + '\nListened to: ' + timeSince(q.playedAt) + ' ago'
							]));

							return send(Command.info(fields));
						}

						break;

					case 'queue':
						var param1 = params[1];

						if (param1 == null) {
							return send(Command.info([
								[	'Command Usage', 
									[	'queue', 
										'queue <URL/Name>',
										'queue list',
										'queue repeat',
										'queue shuffle',
										'queue clear',
										'queue remove <ID/URL>'
									].map(b => '!music ' + b).join('\n') ]
							]));
						}

						switch (param1.toLowerCase()) {
							case 'list':
								var size = music.queue.length;

								if (size == 0) return send(Command.info([['Music', 'Nothing Queued!']]));

								var page = 1;
								var maxPages = Math.ceil(size/5);

								if (params[2] != null) {
									var parsed = parseInt(params[2]);
									if (Number.isInteger(parsed)) page = parsed;
								}

								if (page > maxPages) page = maxPages;
								if (page < 1) page = 1;

								var fields = [
									[
										'Music', 
										'Queued Items: ' + size + '\nPage: ' + page + '/' + maxPages
									]
								]

								fields = fields.concat(music.queue.slice(page - 1, 5).map((q, i) => [
									'ID: ' + i, q.title + '\nhttps://youtu.be/' + q.id
								]));

								return send(Command.info(fields));
							case 'repeat':
								var repeating = music.toggleQueueRepeat();
								if (repeating) send(Command.info([[ 'Music!', 'Now Repeating the song Queue.']]));
								else send(Command.info([[ 'Music!', 'No longer repating song Queue.']]));
								break;
							case 'clear':
								music.clearQueue();
								send(Command.info([[ 'Music!', 'Cleared Song Queue.']]));
								break;
							case 'shuffle':
								music.shuffleQueue();
								send(Command.info([[ 'Music!', 'Shuffled Song Queue.']]));
								break;
							case 'remove':
								music.removeFromQueue(param1);
								break;
						
							default:
								var val = /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)?([^= &?/\r\n]{8,11})/g.exec(params[1]);

								if (val != null && params.length == 2) {
									if (val == null) return console.error('Invalid Youtube URL/ID');

									var id = val[1];

									youTube.getById(id, (err, resp) => {
										if (err) return console.error(err);
										var item = resp.items[0];

										if (item == null) return send(Command.info([['Music', 'Could not find song: "' + id + '"']]));
										if (item.kind != 'youtube#video') return send(Command.info([['Music', 'Not a Video!']]));

										music.addToQueue({
											type: 'youtube',
											id: id,
											title: item.snippet.title
										});

										music.save();

										send(Command.success([[ 'Music!', 'Added Song to Queue.']]));
									});
								} else {
									var search = params.slice(1).join(' ');
									send(Command.info([['Music!', 'Finding "' + search + '" Please wait!']]));
									youTube.search(search, 4, (error, result) => {
										if (error) return console.error(error);
										var items = result.items;
		
										for (var i = 0; i < items.length; i++) {
											var item = items[i];
		
											if (item.id.kind == 'youtube#video') {
												music.addToQueue({
													type: 'youtube',
													id: item.id.videoId,
													title: item.snippet.title
												});

												music.save();
												send(Command.success([[ 'Music!', 'Added Song to Queue.']]));
												break;
											}
										}
									});
								}
								break;
						}

						music.save();
						break;
				}
			});

			function send(str: any) {
				message.channel.send(new Discord.RichEmbed(str.embed));
			}

			// return Command.success([['Music', 'I forgot a return statement... WOOPS! [' + params[0] + ']']]);
		});
	}
}

function timeSince(time: number) {
	var seconds = Math.floor((new Date().getTime() - time) / 1000);

	var interval = Math.floor(seconds / 31536000);

	if (interval > 1) {
		return interval + " years";
	}
	interval = Math.floor(seconds / 2592000);
	if (interval > 1) {
		return interval + " months";
	}
	interval = Math.floor(seconds / 86400);
	if (interval > 1) {
		return interval + " days";
	}
	interval = Math.floor(seconds / 3600);
	if (interval > 1) {
		return interval + " hours";
	}
	interval = Math.floor(seconds / 60);
	if (interval > 1) {
		return interval + " minutes";
	}
	return Math.floor(seconds) + " seconds";
	}

function joinChannel(voiceChannel: Discord.VoiceChannel) {
	voiceChannel.join()
	.then(connection => {})
	.catch(err => console.error(err));
}

export = Music;