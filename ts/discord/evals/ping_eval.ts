import Discord = require('discord.js');

var self: Discord.Client = this;

var opts = {
	id: self.shard.id,
	guildCount: self.guilds.size,
	status: self.status
};

opts;