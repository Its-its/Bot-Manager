import * as express from 'express';

import config = require('../util/config');
import Validation = require('../models/validation');

export = (app: express.Application) => {
	app.post('/discord/invite', authed, (req, res) => {
		var botId = req.body.botId;
		var guildId = req.body.guildId;
		if (botId == null || guildId == null) return res.send('error');

		// TODO: Check to see if user.id/botId is already being used.

		var validate = new Validation({
			user_id: req['user'].id,
			bot_id: botId,
			listener_id: guildId
		});

		validate.save(err => {
			if (err != null) {
				console.error(err);
				res.send({ error: 'Error while saving Validation.' });
				return;
			}

			var params = [
				'client_id=' + config.bot.discord.id,
				'scope=bot',
				'permissions=8',
				'guild_id=' + guildId,//314946214523174913
				'response_type=code',
				'redirect_uri=' + encodeURIComponent(config.passport.discord.callbackURL)
			].join('&');

			res.send('https://discordapp.com/oauth2/authorize?' + params);
		});
	});
}

function authed(req, res, next) {
	if ((<any>req).isAuthenticated()) return next();
	res.status(500).send('Not Authed!');
}