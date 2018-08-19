import fs = require('fs');
import path = require('path');

let config: Config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../..', 'app/config/config.json'), 'utf8'));
// TODO: Fix config

for (var key in config.passport) {
	let item = config.passport[key];
	item['callbackURL'] = config.urlProtocol + '://' + config.baseUrl + item['callbackURL'];
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
	ytdl: {
		full: string;
		address: string;
		port: number;
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