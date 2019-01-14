import path = require('path');

import express = require('express');

import Bots = require('../../site/models/bots');
import Playlists = require('../../music/models/playlists');
import Queues = require('../../music/models/queue');

let globalRoute = express.Router();

// globalRoute.use(express.static(path.join(__dirname, '../../../app/public')));

interface EnsureOpts {
	[test: string]: EnsureArgs | string;
}

interface EnsureArgs {
	type: any;
	required?: boolean; // Default: false
	default?: any;
}

function ensure(opts: EnsureOpts) {
	for (var key in opts) {
		if (typeof opts[key] == 'string') {
			opts[key] = {
				type: opts[key],
				required: false,
				default: null
			};
		} else {
			opts[key] = Object.apply({ required: false, default: null }, opts[key]);
		}
	}

	console.log(opts);

	return function(req, res, next) {
		next();
	}
}


// View main page (dashboard)
// View discord queue/history
globalRoute.get('/', (req, res) => {
	res.render('music/index');
});

// Routes to index, displays bot music dashboard. (if any)
globalRoute.get('/:id([0-9A-Za-z]{32})', (req, res) => {
	res.render('music/index');
});


// Routes to index, displays playlist
globalRoute.get('/playlist/:id([0-9A-Za-z]{36})', (req, res) => {
	res.render('music/index');
});

globalRoute.post('/bot', ensure({ id: 'string' }), (req, res) => {
	Bots.findOne({ uid: req.body.id }, (err, bot) => {
		if (bot == null) return res.send({ error: 'No known bot with that ID!' });
		if (bot.botType == null || bot.botId == null) return res.send({ error: 'Bot is not using an app!' });

		bot.getBot((err, item) => {
			if (err != null) return res.send({ error: err });

			if (item['type'] == 'discord') {
				res.send({ item: item });
			}
		});
	});
});


globalRoute.post('/bot/queue', ensure({ id: 'string', skip: 'number' }), (req, res) => {
	var serverId = req.body.id;
	var skip = parseInt(req.body.skip);

	Queues.findOne({ server_id: serverId }, { items: { $slice: [ skip, 11 ] } })
	.populate('items.song')
	.exec((err, queue: any) => {
		if (queue == null) return res.send({ error: 'No queue with that ID!' });
		res.send({ items: queue.items });
	})
});


globalRoute.post('/playlist/create', (req, res) => {
	if (!(<any>req).isAuthenticated()) return res.send({ error: 'Not Authenticated!' });

	new Playlists({
		creator: req['user'].id,

		type: 1,
		visibility: 2,

		public_id: uniqueID(9),

		plays: 0,
		views: 0,

		title: 'New Playlist',
		description: 'Default playlist description.'
	}).save((err, p) => {
		if (err != null) {
			console.error(err);
			return res.send({ error: 'An error occured please retry in a couple seconds.' });
		}

		res.send({
			item: {
				type: p.type,

				visibility: p.visibility,
				permissions: p.permissions,

				public_id: p.public_id,
				plays: p.plays,
				views: p.views,

				title: p.title,

				description: p.description,
				thumb: p.thumb,

				created_at: p.created_at,
				updated_at: p.updated_at
			}
		});
	});
});

globalRoute.post('/playlist/list', (req, res) => {
	if (!(<any>req).isAuthenticated()) return res.send({ error: 'Not Authenticated!' });

	Playlists.find({ creator: req['user'].id }, (err, playlists) => {
		if (err != null) {
			console.error(err);
			return res.send({ error: 'An error occured please retry in a couple seconds.' });
		}

		res.send({
			items: playlists.map(p => {
				return {
					type: p.type,

					visibility: p.visibility,
					permissions: p.permissions,

					public_id: p.public_id,
					plays: p.plays,
					views: p.views,

					title: p.title,

					description: p.description,
					thumb: p.thumb,

					created_at: p.created_at,
					updated_at: p.updated_at
				}
			})
		})
	});
});

globalRoute.post('/playlist/items', ensure({ id: 'string', skip: 'number' }), (req, res) => {
	var skip = parseInt(req.body.skip);
	var pid = req.body.id;

	Playlists.findOne({ public_id: pid }, { songs: { $slice: [skip, 16] } }, (err, playlist) => {
		if (playlist == null) return res.send({ error: 'No known playlist with said Public ID!' });

		var songs = playlist.songs.map(item => {
			return {
				added: item.added,
				plays: item.plays,

				addedBy: item.user,
				song: item.song
			}
		});

		res.send({
			nextPage: playlist.song_count > skip + 16,
			songs: songs
		});
	});
});

globalRoute.post('/playlist', ensure({ id: 'string' }), (req, res) => {
	Playlists.findOne({ public_id: req.body.id }, (err, playlist) => {
		if (playlist == null) return res.send({ error: 'No known playlist with said that ID!' });

		if (err != null) {
			console.error(err);
			return res.send({ error: 'An error occured please retry in a couple minutes.' });
		}

		res.send({
			item: {
				type: playlist.type,
				items: playlist.song_count,

				visibility: playlist.visibility,
				permissions: playlist.permissions,

				public_id: playlist.public_id,
				plays: playlist.plays,
				views: playlist.views,

				title: playlist.title,

				description: playlist.description,
				thumb: playlist.thumb,

				created_at: playlist.created_at,
				updated_at: playlist.updated_at
			}
		});
	});
});

globalRoute.post('/history', ensure({ id: 'string', skip: 'number' }), (req, res) => {
	var skip = req.body.skip;
	var pid = req.body.id;
});


export = (io: SocketIO.Server) => {
	return {
		loc: '/music',
		route: globalRoute
	};
};


function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}