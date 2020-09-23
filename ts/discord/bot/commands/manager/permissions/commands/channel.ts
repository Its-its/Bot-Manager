import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';

// import PERMISSIONS = require('../perms');

async function call(_params: string[], _server: DiscordServer, _message: Discord.Message) {
	// if (!this.hasPerms(message.member!, server, PERMISSIONS.CHANNELS)) return Command.noPermsMessage('Perms');
	// TODO: Image table showing read/write/view/etc. of channels
	return Command.error([['Permissions', 'Not implemented yet.']]);
}

export {
	call
};