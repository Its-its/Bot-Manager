import express = require('express');

import DiscordBot = require('../models/discord_bots');

// Layout
// /api
//    /dashboard
//       /status
//          /    ? botType
//    /bots
//       /create
//       /remove
//       /edit
//    /


export = (app: express.Application) => {
	// api/
	let route = express.Router();

	route.use(function(req, res, next) {
		if ((<any>req).isAuthenticated()) return next();
		
		res.send({ error: 'Not Authenticated' });
	});



	// api/dashboard/
	let dashboard = express.Router();

	dashboard.post('/status', (req, res) => {
		let botType = req.body.botType;

		if (botType != null) {
			botType = botType.toLowerCase();
			
			if (botType != 'twitch' && botType != 'discord' && botType != 'youtube')
				return res.send({ error: 'Invalid.' });

			let param = botType + '_bots';
	
			req.user
			.populate(param, (err, resp) => {
				if (err != null) return res.send({ error: err });

				res.send({
					data: {
						bots: resp[param].map(item => {
							return {
								confirmation_id: item.confirmation_id,
								created_at: item.created_at,
								custom_token: item.custom_token,
								edited_at: item.edited_at,
								is_active: item.is_active,
								is_disconnected: item.is_disconnected,
								is_registered: item.is_registered,
								name: item.name
							};
						})
					}
				});
			});

			return;
		}


		res.send({
			data: {
				twitch: {
					count: req.user.bots.twitch_amount,
					errors: 0
				},
				discord: {
					count: req.user.bots.discord_amount,
					errors: 0
				},
				youtube: {
					count: req.user.bots.youtube_amount,
					errors: 0
				}
			}
		});
	});

	

	// api/bots/
	let bots = express.Router();

	bots.get('/invite', (req, res) => { // Generate unqiue id, once the bot joins server, give the bot the id.
		let botType = req.query.botType;

		if (botType != null) {
			botType = botType.toLowerCase();

			if (botType == 'discord') {
				res.redirect('https://discordapp.com/oauth2/authorize?client_id=367809207849844737&scope=bot&permissions=66321471');
			}
		} else {
			res.send({ error: 'Poop' });
		}
	});

	bots.post('/create', (req, res) => {
		let botType = req.body.botType;

		if (botType != null) {
			botType = botType.toLowerCase();

			if (botType == 'twitch') {
				//
			} else if (botType == 'discord') {
				if (req.user.bots.discord_amount > 0)
					return res.send({ error: 'Exceeding Maximum Discord bots!' });

				let discordBot = new DiscordBot({
					user_id: req.user._id,
					confirmation_id: confirmID()
				});

				discordBot.save((err) => {
					if (err != null) return res.send({ error: err });

					req.user.bots.discord_amount++;
					req.user.save(() => {
						res.send({ data: 'Successful' });
					});
				});

			} else if (botType == 'youtube') {
				//
			}
		}
	});
	
	// bots.post('/:botType', (req, res) => {
	// 	let botType = req.params.botType;

	// 	if (botType == null) return res.send({ error: 'botType is not defined.' });

	// 	botType = botType.toLowerCase();
		
	// 	if (botType != 'twitch' && botType != 'discord' && botType != 'youtube')
	// 		return res.send({ error: 'Invalid.' });

	// 	req.user
	// 	.populate(botType + '_bots', (err, resp) => {
	// 		if (err != null) return res.send({ error: err });
	// 		res.send({
	// 			data: resp.map(item => {
	// 				delete item._id;
	// 				delete item.user_id;

	// 				return item;
	// 			})
	// 		});
	// 	});
	// });

	route.use('/dashboard', dashboard);
	route.use('/bots', bots);

	app.use('/api', route);
}


function confirmID() {
	return block() + block() + '-' + block() + block() + block() + '-' + block();

	function block() {
		return Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1);
	}
}