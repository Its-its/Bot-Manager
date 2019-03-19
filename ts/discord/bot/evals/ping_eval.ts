import Discord = require('discord.js');

var self: Discord.Client = <any>this;

var opts = {
	id: self.shard.id,
	guildCount: self.guilds.size,
	status: self.status
};

opts;