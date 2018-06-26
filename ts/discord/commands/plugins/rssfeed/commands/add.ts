import Discord = require('discord.js');

import DiscordServer = require('../../../../discordserver');
import DiscordFeeds = require('../../../../models/feed');

import utils = require('../utils');


function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var url = params.join(' ');
	console.log('Url: ' + url);

	utils.addNewFeed(url, null, null, (err, ) => {
		if (err != null) return console.error(err);
		
		//
	});
}

export {
	call
};