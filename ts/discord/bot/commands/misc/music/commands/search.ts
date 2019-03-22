import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

import { sendReq, searchForSong, sendQueue, sendPlay } from '../../../../../music/plugins/music';
import PERMS = require('../perms');


import utils = require('../../../../../utils');


function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member, PERMS.SEARCH)) return Command.noPermsMessage('Music');

	// sendReq('search', {
	// 	_guild: message.guild.id,
	// 	_channel: message.channel.id,
	// 	_sender: message.member.id,

	// 	query: search,
	// 	page: null
	// });

	var search = params.join(' ').trim();

	message.channel.send(Command.info([['Music', 'Searching for videos please wait...']]))
	.then((m: Discord.Message) => {
		const selector = utils.createPageSelector(message.member.id, message.channel);
		selector.setEditing(m);

		nextPage(selector, search, null, () => selector.display());

		function nextPage(pager: utils.MessagePage, query: string, page: string, cb: () => any) {
			searchForSong(query, page, (err, data) => {
				if (err) {
					console.error(err);
					message.channel.send(Command.error([['Music', err.toString()]]));
					return;
				}

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

						if (server.userHasPerm(message.member, PERMS.PLAY)) {
							newPage.addSelection('Play', 'Play it now.', () => {
								newPage.edit(Command.info([['Music', 'Playing song please wait.']]), () => {
									sendPlay(message.channel.id, message.guild.id, message.member.id, song.id);
									newPage.close('delete');
								});
							});
						}

						if (server.userHasPerm(message.member, PERMS.QUEUE_ADD)) {
							newPage.addSelection('Queue', 'Queue it for later.', () => {
								newPage.edit(Command.info([['Music', 'Queueing song...']]), () => {
									sendQueue('add', message.guild.id, message.member.id, message.channel.id, [song.id]);
									newPage.close('delete');
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
}

export {
	call
};