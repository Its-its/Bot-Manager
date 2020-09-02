import fs = require('fs');
import path = require('path');

let config: Config = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/config/config.json'), 'utf8'));

for (let key in config.passport) {
	// @ts-ignore
	let item = config.passport[key];
	item.callbackURL = `${config.urlProtocol}://${config.baseUrl}${config.port == 80 ? '' : ':' + config.port}${item.callbackURL}`;
}

config.ytdl.full = config.ytdl.address + (config.ytdl.port == 80 ? '' : ':' + config.ytdl.port);

export = config;


interface Config {
	debug: boolean;
	port: number;
	urlProtocol: string;
	baseUrl: string;
	session_secret: string;
	database: string;
	stripe: {
		publishable_key: string;
	}
	ytdl: {
		full: string;
		address: string;
		port: number;
	}
	shards: {
		discord: {
			masterPort: number;
			botPort: number;
			gamesPort: number;
			intervalPort: number;
			musicPort: number;

			[name: string]: number;
		}
	}
	music: {
		address: string;
		port: number;
	}
	redis: {
		address: string;
		port: number;
		guildsDB: number;
		musicDB: number;
		xpDB: number;
	}
	socketIO: {
		discordPort: number;
	}
	bot: {
		discord: {
			id: string;
			token: string;
			port: number;
		}
	}
	youtube: {
		key: string;
	}
	passport: {
		twitch: {
			clientID: string;
			clientSecret: string;
			callbackURL: string;
		}
		discord: {
			clientID: string;
			clientSecret: string;
			callbackURL: string;
			scopeInvite: string[];
			scopeAuth: string[];
		}
		google: {
			clientID: string;
			clientSecret: string;
			callbackURL: string;
			scope: string;
		}
	}
}