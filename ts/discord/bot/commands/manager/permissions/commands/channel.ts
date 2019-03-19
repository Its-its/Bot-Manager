import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

// import PERMISSIONS = require('../perms');

function call(_params: string[], _server: DiscordServer, _message: Discord.Message) {
	// if (!this.hasPerms(message.member, server, PERMISSIONS.CHANNELS)) return Command.noPermsMessage('Perms');
	// TODO: Image table showing read/write/view/etc. of channels
	return Command.error([['Permissions', 'Not implemented yet.']]);
}

export {
	call
};