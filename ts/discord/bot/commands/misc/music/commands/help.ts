import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');


const commandUsage = Command.info([
	[
		'Command Usage',
		Command.table(['Command', 'Desc'], [
			['join [@channel/Channel ID]', 'Joins said channel'],
			['info', 'Shows the current song info'],
			['play [URL/Name]', 'Instantly plays a song'],
			['stop', 'Stops playing music'],
			['skip/next', 'Skips the current song'],
			['search <query>', 'Search for a video and play/queue it'],
			['history [page]', 'Shows song history'],
			['history clear', 'Clears song history']
		])
	],
	[
		'Queue',
		Command.table(['Command', 'Desc'], [
			['queue list [page]', 'View queue'],
			['queue add <URL/Name>', 'Queue song'],
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


async function call(_params: string[], _server: DiscordServer, _message: Discord.Message) {
	return commandUsage;
}

export {
	call
};