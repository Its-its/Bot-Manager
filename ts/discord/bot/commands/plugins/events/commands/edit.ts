import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import utils = require('@discord/bot/../utils');

import PERMS = require('../perms');
import { DiscordBot } from '@type-manager';

const ID_TO_NAME = {
	react_add: 'React Add',
	member_add: 'Member Add',
	member_remove: 'Member Remove'
}

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	return Promise.resolve();
}

function showEditPage(compiled: DiscordBot.ListenEvents, senderMessage: Discord.Message, server: DiscordServer) {
	if (!server.userHasPerm(senderMessage.member!,PERMS.EDIT)) return utils.noPermsMessage('Events');

	const selector = utils.createPageSelector(senderMessage.author.id, senderMessage.channel)!;

	selector.setFormat([
		`Editing event on ${ID_TO_NAME[compiled.type]}. Your on called events are below.`,
		'',
		'{page_items}'
	]);

	if (compiled.event == null) {
		showListenerPage(compiled, selector, server);
	} else {
		selector.addSelection('change', 'Change current on called event', page => {
			//
		});

		selector.addSelection('edit', 'Edit current on called event', page => {
			//
		});

		selector.display();
	}
}

function showListenerPage(compiled: DiscordBot.ListenEvents, selector: utils.MessagePage, server: DiscordServer) {
	selector.addSelection('role', 'Add/Remove role when event is called', page => {
		compiled.event = { type: 'role' };
		editEventPage(compiled, page, server);
	});

	selector.addSelection('message', 'Send message in channel when event is called', page => {
		compiled.event = { type: 'message' };
		editEventPage(compiled, page, server);
	});

	selector.addSelection('dm', 'Send Direct Message to user when event is called', page => {
		compiled.event = { type: 'dm' };
		editEventPage(compiled, page, server);
	});

	selector.display();
}

function editEventPage(compiled: DiscordBot.ListenEvents, selector: utils.MessagePage, server: DiscordServer) {
	switch (compiled.event.type) {
		case 'role':
			selector.setFormat([
				'**Add/Remove Role Event**',
				'__Please select role add or remove__',
				'',
				'{page_items}'
			]);

			selector.addSelection('Add', 'Add a role to guild member', page => {
				(<DiscordBot.DoGroupEvent>compiled.event).do = 'add';
				nextPage(page);
			});

			selector.addSelection('Remove', 'Remove a role from guild member', page => {
				(<DiscordBot.DoGroupEvent>compiled.event).do = 'remove';
				nextPage(page);
			});

			function nextPage(page: utils.MessagePage) {
				page.setFormat([
					'**Add/Remove Role Event**',
					'**Set Role ID**',
					'',
					'{page_items}'
				]);

				page.listen(id_message => {
					let type = server.idType(id_message);
					if (type != null && type != 'channel') return false;

					let id = server.strpToId(id_message);

					if (id == null) return false;

					id = id.trim();

					if ((<Discord.TextChannel>selector.channel).guild.roles.cache.get(id) == null) return false;

					(<DiscordBot.DoGroupEvent>compiled.event).role_id = id;

					server.regrab(copy => {
						if (copy == null) return;
						copy.addOrEditEvent(compiled);
						copy.save().catch(console.error);
					});

					return true;
				});
			}
			break;
		case 'message':
			selector.setFormat([
				'**Message Event**',
				'__Set Channel (enter Channel ID or #)__',
				'',
				'{page_items}'
			]);

			selector.listen(id_message => {
				let type = server.idType(id_message);
				if (type != null && type != 'channel') return false;

				let id = server.strpToId(id_message);

				if (id == null) return false;

				id = id.trim();

				if ((<Discord.TextChannel>selector.channel).guild.channels.cache.get(id) == null) return false;

				(<DiscordBot.DoMessageEvent>compiled.event).channel_id = id;

				const messageSelector = utils.createPageSelector(selector.author_id, selector.channel)!;

				messageSelector.setFormat([
					'**Message Event**',
					'**Set Channel Message response**',
					'',
					'{page_items}'
				]);

				messageSelector.listen(message => {
					(<DiscordBot.DoMessageEvent>compiled.event).message = message;

					server.regrab(copy => {
						if (copy == null) return;

						copy.addOrEditEvent(compiled);
						copy.save().catch(console.error);
					});

					return true;
				});

				return true;
			});
			break;
		case 'dm':
			selector.setFormat([
				'**Direct Message Event**',
				'Current Message',
				'```' + (compiled.event.message == null ? 'None' : compiled.event.message) +  '```',
				'**Set Direct Message response**',
				'',
				'{page_items}'
			]);

			selector.listen(message => {
				(<DiscordBot.DoDirectMessageEvent>compiled.event).message = message;

				server.regrab(copy => {
					if (copy == null) return;

					copy.addOrEditEvent(compiled);
					copy.save().catch(console.error);
				});
				return true;
			});
			break;
	}

	selector.display();
}


export {
	call,
	showEditPage
};