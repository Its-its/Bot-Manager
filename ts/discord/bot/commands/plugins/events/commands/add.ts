import Discord = require('discord.js');
import DiscordServer = require('../../../../discordserver');

import Edit = require('./edit');

// events add react 01010 :check:

const TYPES = [ 'react_add', 'member_add', 'member_remove' ];

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var type = params.shift();
	if (type == null) return message.channel.send('Invalid args');
	type = type.toLowerCase();
	if (TYPES.indexOf(type) == -1) return message.channel.send('Type must be one of these: ' + TYPES.join(','));

	var compiled: any = {
		type: type
	};

	if (type == 'react_add') {
		var id = params.shift();
		var emoji = params.shift();

		if (id == null || emoji == null) return message.channel.send('Invalid args for react_add');
		if (message.guild.emojis[emoji] == null) return;
		// TODO: Figure out a way to check and see if the message exists.

		compiled['message_id'] = id;
		compiled['emoji_id'] = emoji;
	}

	compiled['uid'] = null;

	Edit.showEditPage(compiled, message, server);
}

export {
	call
};