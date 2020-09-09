import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';


async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	return Promise.resolve();
}

export {
	call
};