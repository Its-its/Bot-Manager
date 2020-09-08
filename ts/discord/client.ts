import * as Discord from 'discord.js';


const OPTIONS: Discord.ClientOptions = {
	partials: [
		'CHANNEL', // (Guild Channel)
		'GUILD_MEMBER',
		'MESSAGE',
		'REACTION',
		'USER'
	]
};


const client = new Discord.Client(OPTIONS);


export = client;