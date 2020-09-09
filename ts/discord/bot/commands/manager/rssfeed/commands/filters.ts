import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';


const filterTypes = [ 'Title', 'Description', 'Summary', 'Author', 'Tag' ];


async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	return Promise.resolve();
}

export {
	call
};