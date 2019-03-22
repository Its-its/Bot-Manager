import Discord = require('discord.js');
import DiscordServer = require('../../../GuildServer');


import Command = require('../../../command');
import MusicHistory = require('../../../../../music/models/history');
import Playlists = require('../../../../../music/models/playlists');


import guildClient = require('../../../../guildClient');
// import config = require('../../../../../config');

import musicPlugin = require('../../../../music/plugins/music');
import musicPermissions = require('../../../../../music/permissions');

import utils = require('../../../../utils');

import client = require('../../../../client');

import PERMS = require('./perms');
import commands = require('./commands');


// TODO: Check if in voice channel after restart.
// TODO: pause/previous
// TODO: Transfer most of these things to plugins/music for web view functionality.

class Music extends Command {
	constructor() {
		super('music');

		this.perms = Object.values(PERMS);
		this.description = 'Used to manage music in voice channels.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) return commands.help.call(params, server, message);

		switch (params.shift()!.toLowerCase()) {
			case 'info': return commands.info.call(params, server, message);
			case 'join': return commands.join.call(params, server, message);
			case 'leave': return commands.leave.call(params, server, message);
			case 'search': return commands.search.call(params, server, message);
			case 'play': return commands.play.call(params, server, message);
			case 'stop': return commands.stop.call(params, server, message);
			case 'skip': case 'next': return commands.next.call(params, server, message);
			case 'history': return commands.history.call(params, server, message);
			case 'queue': return commands.queue.call(params, server, message);
			case 'playlist': return commands.playlist.call(params, server, message);
			default: return Command.error([['ERROR!', 'Unknown arguments!']]);
		}
	}
}


interface SongSearch {
	nextPageToken?: string;
	previousPageToken?: string;

	totalResults: number;
	resultsPerPage: number;

	items: {
		type: string;
		id: string;
		published: number;
		title: string;
		channel: {
			id: string;
			title: string;
		};
		thumbnail: {
			url: string;
			width: number;
			height: number;
		};
	}[];
}


export = Music;