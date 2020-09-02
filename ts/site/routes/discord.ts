import * as express from 'express';

import config = require('@config');
import Validation = require('../models/validation');

export = (app: express.Application) => {
	app.get('/discord/invite', (req, res) => {
		res.redirect('https://discordapp.com/oauth2/authorize?client_id=367809207849844737&scope=bot&permissions=8');
	});

	app.post('/discord/invite', authed, (req, res) => {
		var botId = req.body.botId;
		var guildId = req.body.guildId;
		if (botId == null || guildId == null) return res.send('error');

		Validation.findOne({
			$or: [
				{ bot_id: botId },
				{ listener_id: guildId }
			]
		}, (err, item) => {
			if (err != null) {
				console.error(err);
				return res.send({ error: 'An error occured.' });
			}

			if (item != null) return res.send({ error: 'There is already a pending invite. Please wait 5 minutes and try again.' });

			var validate = new Validation({
				user_id: (<any>req.user).id,
				bot_id: botId,
				listener_id: guildId,
				date_created: Date.now()
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
	});
}

function authed(req: express.Request, res: express.Response, next: express.NextFunction) {
	if (req.isAuthenticated()) return next();
	res.status(500).send('Not Authed!');
}