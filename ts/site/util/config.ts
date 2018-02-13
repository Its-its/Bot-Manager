import fs = require('fs');
import path = require('path');

let config: Config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../..', 'app/config/config.json'), 'utf8'));


export = config;


interface Config {
	port: number;
	urlProtocol: string;
	baseUrl: string;
	session_secret: string;
	database: string;
	redis: {
		guildsDB: number;
		musicDB: number;
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
			scopeInvite: [ "bot", "identify", "guilds" ];
			scopeAuth: [ "identify", "guilds" ];
		}
		google: {
			clientID: string;
			clientSecret: string;
			callbackURL: string;
			scope: string;
		}
	}
}