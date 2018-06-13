// Import youtube video API
var tag = document.createElement('script');
tag.src = '//www.youtube.com/iframe_api';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// var player;

function onYouTubeIframeAPIReady() {
	window.player = new YT.Player('player', {
		height: '262',
		width: '350',
		playerVars: {
			// controls: 0,
			// showinfo: 0
		},
		events: {
			'onStateChange': function(event) {
				if (event.data == YT.PlayerState.PAUSED) {
					window.player.playVideo();
				}
			}
		}
	});
}

// Pages
let pages = (function() {
	let viewing = null;
	let pagesMap = {};

	class Page {
		constructor() {
			//
		}

		display() {
			//
		}

		close() {
			//
		}
	}

	function display(Page) {
		if (viewing != null) {
			viewing.close();
		}

		viewing = new Page();
		viewing.display();
	}

	return {
		Page: Page,
		redirect: function(url) {
			if (url[url.length - 1] == '/') url = url.slice(-1);

			for(var page in pagesMap) {
				if (new RegExp(page + '$', 'i').test(url)) {
					display(pagesMap[page]);
					return;
				}
			}

			throw 'Page not registered! [' + url + ']';
		},
		addPage: function(regex, page) {
			pagesMap[regex] = page;
		}
	};
}());


// Music Player
let musicPlayer = (function() {
	var playing = null;

	var playerInfo = document.getElementById('player-info');
	var playerControls = document.getElementById('player-controls');

	var titleElement = document.createElement('a');
	titleElement.className = 'title';
	
	var thumbElement = document.createElement('img');
	
	var infoContainer = document.createElement('div');
	infoContainer.className = 'player-info-container';
	infoContainer.appendChild(titleElement);
	playerInfo.appendChild(infoContainer);


	var controlsContainer = document.createElement('div');
	controlsContainer.className = 'controls-container';
	
	var volume = document.createElement('i');
	volume.className = 'fas fa-volume-up volume-control';
	volume.title = 'Change Volume';
	controlsContainer.appendChild(volume);

	var addToPlaylist = document.createElement('i');
	addToPlaylist.className = 'fas fa-plus addto-control';
	addToPlaylist.title = 'Add to Playlist';
	controlsContainer.appendChild(addToPlaylist);

	playerControls.appendChild(controlsContainer);


	var progressBarContainer = document.createElement('div');
	progressBarContainer.className = 'progress-container';

	var maxTime = document.createElement('span');
	maxTime.className = 'time';
	maxTime.innerText = '0:00';

	var currTime = document.createElement('span');
	currTime.className = 'time';
	currTime.innerText = '0:00';

	var progressBar = document.createElement('div');
	progressBar.className = 'progress-bar';
	var progress = document.createElement('div');
	progress.className = 'progress-item';
	progressBar.appendChild(progress);

	progressBarContainer.appendChild(currTime);
	progressBarContainer.appendChild(progressBar);
	progressBarContainer.appendChild(maxTime);


	playerControls.appendChild(progressBarContainer);

	setInterval(() => {
		if (playing != null) {
			var curr = (Date.now() - playing.started)/1000;
			if (curr > playing.length) curr = playing.length;

			currTime.innerText = time(Math.ceil(curr));
			progress.style.width = (curr/playing.length * 100) + '%';
		}
	}, 250);


	function time(seconds) { // FIX
		var items = [];
	
		var sec = '' + (seconds % 60);
		if (sec.length == 1) sec = '0' + sec;
		items.push(sec);
	
		var min = '' + Math.floor(seconds/60 % 60);
		
		if (min.length == 1) min = '0' + min;
		items.push(min);
	
		var hour = Math.floor(seconds/60/60);
		if (hour != 0) {
			if (('' + hour).length == 1) hour = '0' + hour;
			items.push(hour);
		}
	
		return items.reverse().join(':');
	}


	return {
		play: function(type, title, thumb, channelId, uid, length, started) {
			playing = {
				type: type,
				title: title,
				thumb: thumb,
				channelId: channelId,
				uid: uid,
				length: length,
				started: started
			};

			titleElement.href = 'https://youtu.be/' + uid;
			titleElement.setAttribute('title', title);
			titleElement.innerText = title;
			
			maxTime.innerText = time(length);

			thumbElement.src = thumb;

			window.player.loadVideoById(uid, Math.ceil((Date.now() - started)/1000));
		},
		stop: function() {
			playing = null;
		}
	};
}());


(function() {
	let socket = io();
	let listeningTo = null;
	let last

	socket.on('listen', function(info) {
		if (listeningTo && listeningTo == info.serverId) {
			musicPlayer.play(
				info.playing.type,
				info.playing.title, 
				info.playing.thumb, 
				info.playing.channelId, 
				info.playing.uid, 
				info.playing.length, 
				info.playing.playedAt
			);
			console.log('Listen:', info);
		} else {
			//
		}
	});

	socket.on('play-start', function(info) {
		console.log('Play Start:', info);

		musicPlayer.play(
			info.nextSong.type,
			info.nextSong.title, 
			info.nextSong.thumb, 
			info.nextSong.channelId, 
			info.nextSong.uid, 
			info.nextSong.length, 
			info.nextSong.playedAt
		);
	});

	socket.on('play-stop', function(info) {
		console.log('Play Stop:', info);
		musicPlayer.stop();
	});

	socket.on('play-next', function(info) {
		console.log('Play Next:', info);

		musicPlayer.play(
			info.nextSong.type,
			info.nextSong.title, 
			info.nextSong.thumb, 
			info.nextSong.channelId, 
			info.nextSong.uid, 
			info.nextSong.length, 
			info.nextSong.playedAt
		);
	});

	socket.on('queue-toggle-repeat', function(info) {
		console.log('Queue Toggle Repeat:', info);
	});

	socket.on('queue-clear', function(info) {
		console.log('Queue Clear:', info);
	});

	socket.on('queue-shuffle', function(info) {
		console.log('Queue Shuffle:', info);
	});

	socket.on('queue-item-remove', function(info) {
		console.log('Queue Item Rem:', info);
	});

	socket.on('queue-item-add', function(info) {
		console.log('Queue Item Add:', info);
	});

	socket.on('queue-playlist', function(info) {
		console.log('Queue Playlist:', info);
	});

	class DashboardPage extends pages.Page {
		constructor() {
			super();
		}

		display() {
			super.display();


			$.post('/music/playlist/list', function(res) {
				if (res.error != null) return console.error(res.error);
				
				var playlists = document.getElementById('playlists');
				while(playlists.firstChild) playlists.removeChild(playlists.firstChild);
				
				res.items.forEach(function(playlist) {
					var item = clickable(playlist.title, '/music/playlist/' + playlist.public_id);
					// TODO: Save to array.
					playlists.appendChild(item);
				});

				var createPlaylist = clickable('Create Playlist', function() {
					$.post('/music/playlist/create', function(res) {
						if (res.error != null) return console.error(res.error);
						playlists.insertBefore(
							clickable(res.item.title, '/music/playlist/' + res.item.public_id), 
							playlists.children[playlists.children.length - 1]);
					});
				});

				createPlaylist.classList.add('create-playlist');

				playlists.appendChild(createPlaylist);

				function clickable(text, cb) {
					var item = document.createElement('li');
					item.className = 'group-list-item';
					var click = document.createElement('a');
					click.innerText = text;
					if (typeof cb == 'string') click.href = cb;
					else click.addEventListener('click', cb);
					item.appendChild(click);

					return item;
				}
			});
		}

		close() {
			super.close();
		}
	}

	class PlaylistPage extends DashboardPage {
		constructor() {
			super();
			var split = window.location.pathname.split('/');
			this.playlistId = split[split.length - 1];

			this.lastPage = 0;
			this.anotherPage = true;
		}

		display() {
			super.display();

			$.post('/music/playlist', { id: this.playlistId }, function(res) {
				if (res.error != null) return console.error(res.error);

				var playlist = res.item;

				var container = document.getElementById('container');
				while(container.firstChild) container.removeChild(container.firstChild);

				// Playlist info

				var info = document.createElement('div');
				info.className = 'cell medium-12';

				var title = document.createElement('h4');
				title.innerText = playlist.title;
				info.appendChild(title);

				var desc = document.createElement('p');
				desc.innerText = playlist.description;
				info.appendChild(desc);


				// Music

				var items = document.createElement('div');
				items.className = 'cell medium-12';

				var table = document.createElement('table');
				table.className = 'unstriped';
				items.appendChild(table);

				var head = document.createElement('thead');
				head.innerHTML = '<tr><th></th><th></th><th></th><th></th></tr>';
				table.appendChild(head);

				var body = document.createElement('tbody');
				table.appendChild(body);

				container.appendChild(info);
				container.appendChild(items);

				$.post('/music/playlist/items', { id: playlist.public_id, skip: 0 }, function(res) {
					if (res.error != null) return console.error(res.error);

					res.items.forEach(function(item) {
						var tr = document.createElement('tr');

						var add = document.createElement('td');
						add.innerText = '+';
						tr.appendChild(add);

						var title = document.createElement('td');
						title.innerText = '';
						tr.appendChild(title);

						// var add = document.createElement('td');
						// add.innerText = '';
						// tr.appendChild(add);

						// var add = document.createElement('td');
						// add.innerText = '';
						// tr.appendChild(add);

						body.appendChild(tr);
					});
				});
			});
		}

		close() {
			super.close();
		}
	}

	class BotPage extends DashboardPage {
		constructor() {
			super();
			var split = window.location.pathname.split('/');
			this.botId = split[split.length - 1];

			this.server_id = null;
			this.type = null;
		}

		display() {
			super.display();
			var self = this;

			$.post('/music/bot', { id: this.botId }, function(bot) {
				if (bot.error != null) return console.error(bot.error);
				bot = bot.item;

				console.log('Guild:', bot);

				self.server_id = bot.server_id;
				self.type = bot.type;

				var container = document.getElementById('container');
				while(container.firstChild) container.removeChild(container.firstChild);

				// Server info

				var info = document.createElement('div');
				info.className = 'cell medium-12 server-info info';

				var name = document.createElement('h6');
				name.innerText = 'Server Info';
				info.appendChild(name);

				var serverThumbC = document.createElement('div');
				serverThumbC.className = 'thumb-container';

				var serverThumb = document.createElement('img');
				serverThumb.className = 'thumb';
				serverThumb.src = bot.server.iconURL;
				serverThumbC.appendChild(serverThumb);

				info.appendChild(serverThumbC);

				var serverInfo = document.createElement('div');
				serverInfo.innerHTML = `
					<h4>${bot.server.name}</h4>
					<span>Region: ${bot.server.region}</span><br>
					<span>Members: ${bot.server.memberCount}</span><br>
					<span>Since: ${new Date(bot.server.createdAt).toDateString()}</span>
				`;
				info.appendChild(serverInfo);

				// Music

				var items = document.createElement('div');
				items.className = 'cell medium-12 music-info info';

				var name = document.createElement('h6');
				name.innerText = 'Music Info';
				items.appendChild(name);

				container.appendChild(info);
				container.appendChild(items);


				socket.once('bot-playing', function(info) {
					socke

					if (info.playing == null) {
						var name = document.createElement('h4');
						name.innerText = 'Nothing Playing at the moment!';
						items.appendChild(name);
						return;
					}

					info = info.playing;

					console.log('Guild Playing:', info);

					//
					var musicThumbC = document.createElement('div');
					musicThumbC.className = 'thumb-container';

					var musicThumb = document.createElement('img');
					musicThumb.src = info.thumb;
					musicThumbC.appendChild(musicThumb);

					items.appendChild(musicThumbC);

					//
					var musicInfo = document.createElement('div');
					musicInfo.className = 'info-container';

					var title = document.createElement('h5');
					title.innerText = info.title;

					var length = document.createElement('span');
					length.innerText = toHMS(info.length);

					var uploaded = document.createElement('span');
					uploaded.innerText = new Date(info.uploaded).toDateString();

					musicInfo.appendChild(title);
					musicInfo.appendChild(length);
					musicInfo.appendChild(document.createElement('br'));
					musicInfo.appendChild(uploaded);

					items.appendChild(musicInfo);

					//
					var rightSide = document.createElement('div');
					rightSide.className = 'right-side';

					if (listeningTo == null || listeningTo != self.server) {
						var listenTo = document.createElement('a');
						listenTo.className = 'button';
						listenTo.innerText = 'Start Listening';
						listenTo.addEventListener('click', () => {
							listeningTo = self.server;
							socket.emit('listen-start', { id: self.server_id });
							rightSide.removeChild(listenTo);
						});
						rightSide.appendChild(listenTo);
					}
					

					items.appendChild(rightSide);
				});
				
				socket.emit('bot-playing', { id: self.server_id });
			});
		}

		close() {
			super.close();
		}
	}


	function toHMS(seconds) {
		var items = [];

		var sec = (seconds % 60);
		if (sec != 0) items.push(sec + 's');

		var min = Math.floor(seconds/60 % 60);
		if (min != 0) items.push(min + 'm');

		var hour = Math.floor(seconds/60/60);
		if (hour != 0) items.push(hour + 'h');

		return items.reverse().join(', ');
	}

	$(document).foundation();

	pages.addPage('/music', DashboardPage);
	pages.addPage('/music/playlist/[a-z0-9]+', PlaylistPage);
	pages.addPage('/music/[a-z0-9]+', BotPage);

	pages.redirect(window.location.pathname);
}());