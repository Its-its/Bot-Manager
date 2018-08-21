import Discord = require('discord.js');
import DiscordServer = require('../../../../discordserver');

import UserLevel = require('../../../../plugins/levels/models/userlevel');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var page = parseInt(params.shift());

	if (isNaN(page)) page = 1;
	if (page > 10) page = 10;
	message.channel.send('Not implemented yet.');
	// UserLevel.find({ server_id: message.guild.id })
	// .limit(10)
	// .skip((page - 1) * 10)
	// .sort({ xp: -1 })
	// .exec((err, user) => {
	// 	if (err != null) {
	// 		console.error(err);
	// 		message.channel.send('An error occured while trying to query DB. Please try again in a few minutes.');
	// 		return;
	// 	}

	// 	var level = user['level'];
	// 	var xp = user['xp'];

	// 	// 
	// });
}

export {
	call
};