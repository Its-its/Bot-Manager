(function() {
	$(document).foundation();

	// Listener displaying
	let user = {
		twitch: {
			linked: false
		},
		discord: {
			linked: false
		},
		youtube: {
			linked: false
		},
		bot: null
	};
	let displaying = null;
	let listenerContainer = null;

	let botId = window.location.pathname.split('/');
	botId = botId[botId.length - 1];




	class Listener {
		constructor(id, displayName, color, icon) {
			this.setup = false;

			this.id = id;
			this.displayName = displayName;
			this.icon = icon;
			this.color = color;
			this.buttonElement = this.button();
		}

		addRow(className, func) {
			let div = createElement('div', { className: className });
			if (func != null) func(div);
			listenerContainer.appendChild(div);
	
			return div;
		}

		button() {
			let appCont = createElement('div', { className: 'app ' + this.id });
			
			let container = createElement('div', { className: 'app-container' });
	
			let icon = createElement('i', { className: 'icon fa fa-3x ' + this.icon }, container);
			icon.setAttribute('aria-hidden', 'true');
	
			let name = createElement('span', { className: 'name', innerText: this.displayName }, container);
	
			// switch (app.name) {
			// 	case 'yt': icon.classList.add('fa-youtube-play'); break;
			// 	case 'ttv': icon.classList.add('fa-twitch'); break;
			// 	case 'disc': icon.classList.add('fa-question'); break;
			// 	case 'tele': icon.classList.add('fa-telegram'); break;
			// 	case 'slk': icon.classList.add('fa-slack'); break;
			// 	case 'twit': icon.classList.add('fa-twitter'); break;
			// 	case 'eml': icon.classList.add('fa-envelopse-o'); break;
			// 	case 'txt': icon.classList.add('fa-mobile'); break;
			// 	case 'webr': icon.classList.add('fa-question'); break;
			// }
			
			var self = this;
			container.addEventListener('click', function() {
				if (displaying != this) self.display();
			});
	
			appCont.appendChild(container);

			return appCont;
		}

		close() {
			while(listenerContainer.firstChild)
				listenerContainer.removeChild(listenerContainer.firstChild);
		}

		display() {
			if (displaying != null) displaying.close();
			displaying = this;
		}

		displaySetup() {}
	}

	class DiscordListener extends Listener {
		constructor() {
			super('dsc', 'Discord', 'gray', 'fa-discord');
		}

		display() {
			super.display();
			if (!this.setup) this.displaySetup();
			// Groups, Members, Channels
		}

		displaySetup() {
			this.addRow('cell large-12 setup', function(row) {
				createElement('h4', { className: 'title', innerText: 'Setup' }, row);

				createElement('p', {
					className: 'desc',
					innerText: 'It\'s super simple to setup the Discord listener. \
					All you have to do is link your discord account, click Invite to Server, and \
					paste "!register <unique ID>" in any server chat to finish setup. :)'
				}, row);

				// Link button
				if (user.discord.linked) {
					createElement('p', { className: 'linked-text', innerText: 'Discord Linked.' }, row);
				} else {
					createElement('a', {
						className: 'button',
						innerText: 'Link Discord'
					}, row);
				}

				if (user.bot.app != null && user.bot.app.name != null) {
					$.post('/api/listener/status', { name: user.bot.name, id: user.bot.uid }, function(data) {
						if (data.error != null) return console.error(data.error);
						data = data.data;
						console.log(data);
					});
				} else {
					// Create the bot and join the server.
					createElement('a', {
						className: 'button',
						innerText: 'Invite to Server'
					}, row)
					.addEventListener('click', () => {
						//
					});
				}


				let tools = createElement('div', { className: 'tools' }, row);
				createElement('a', { className: 'button error', innerText: 'Cancel' }, tools);
				createElement('a', { className: 'button success', innerText: 'Done' }, tools);
			});
		}
	}

	class TwitchListener extends Listener {
		constructor() {
			super('ttv', 'Twitch TV', 'purple', 'fa-twitch');
		}

		display() {
			super.display();
			if (!this.setup) this.displaySetup();
		}

		displaySetup() {
			this.addRow('cell large-12 setup', function(row) {
				createElement('h4', {
					className: 'title',
					innerText: 'Setup'
				}, row);

				createElement('p', {
					className: 'desc',
					innerText: 'It\'s super simple to setup the Twitch listeners. \
					All you have to do is link your twitch account and click Join channel. :)'
				}, row);

				// Link twitch button
				if (!user.isTwitchAuthenticated) {
					createElement('a', {
						className: 'button',
						innerText: 'Link Twitch'
					}, row);
				}

				// Join Channel button
				createElement('a', {
					className: 'button',
					innerText: 'Join Channel'
				});

				let tools = createElement('div', { className: 'tools' }, row);

				createElement('a', { className: 'button error', innerText: 'Cancel' }, tools);
				createElement('a', { className: 'button success', innerText: 'Confirm' }, tools);
			});
		}
	}

	class YoutubeListener extends Listener {
		constructor() {
			super('yt', 'Youtube', 'red', 'fa-youtube-play');
		}

		display() {
			super.display();
		}
	}

	class TelegramListener extends Listener {
		constructor() {
			super('tele', 'Telegram', 'blue', 'fa-telegram');
		}
	}

	class SlackListener extends Listener {
		constructor() {
			super('slk', 'Slack', 'white', 'fa-slack');
		}
	}

	class TwitterListener extends Listener {
		constructor() {
			super('twit', 'Twitter', 'blue', 'fa-twitter');
		}
	}




	let listeners = {
		'ttv': new TwitchListener(),
		'disc': new DiscordListener(),
		'yt': new YoutubeListener(),
		'tele': new TelegramListener(),
		'slk': new SlackListener(),
		'twit': new TwitterListener()
	}

	// Header
	rowContainer('cell large-12 header', function(cont) {
		addButton('Home', '/bot/' + botId);
		addButton('Commands', '/bot/' + botId + '/commands');
		addButton('Responses', '/bot/' + botId + '/responses');
		addButton('Timers', '/bot/' + botId + '/timers');
		addButton('Events', '/bot/' + botId + '/events');

		function addButton(displayName, href) {
			let button = createElement('a', { className: 'header-item', innerText: displayName, href: href });
			cont.appendChild(button);
		}
	});


	// App Selection
	rowContainer('cell large-12 apps', function(cont) {
		createElement('h4', { className: 'title', innerText: 'Set Listener' }, cont);

		let container = createElement('div', { className: 'apps-cont' });
		container.style.height = '75px';

		let toggle = createElement('div', { innerText: 'Show More', className: 'toggle' });

		toggle.addEventListener('click', () => {
			if (container.style.height == '75px') {
				container.style.height = '';
				toggle.innerText = 'Show Less';
			} else {
				container.style.height = '75px';
				toggle.innerText = 'Show More';
			}
		});

		for (const key in listeners) {
			container.appendChild(listeners[key].buttonElement);
		}

		cont.appendChild(container);
		cont.appendChild(toggle);
	});

	listenerContainer = rowContainer('cell large-12 listener');

	rowContainer('cell large-12', function(cont) {
		// Stats
	});



	$.post('/api/bot/status', { id: botId }, function(data) {
		if (data.error != null) return console.error(data.error);
		data = data.data;

		var bot = data.bot;
		user = data.user;
		user.bot = bot;

		let status = createElement('div', { className: 'callout status' });

		createElement('h4', { innerText: (bot.displayName || 'Bot') }, status);

		createElement('p', { innerText: 'Active: ' + bot.active }, status);
		createElement('p', { innerText: 'Created: ' + new Date(bot.created).toLocaleDateString() },  status);
		createElement('p', { innerText: 'Edited: ' + new Date(bot.edited).toLocaleDateString() }, status);

		document.getElementById('bot-info').appendChild(status);

		console.log(' -', bot.app);
	});

	function editApp(app) {
		if (!addEditor.classList.contains('shown')) addEditor.classList.add('shown');
		while(addEditor.firstChild) addEditor.removeChild(addEditor.firstChild);

		if (app == null) {
			addEditor.classList.remove('shown');
			return;
		}

		// Title
		let title = createElement('div', { className: 'title-container' }, addEditor);
		createElement('h4', { className: 'title', innerText: 'Editing ' + getListenerName(app.name) }, title);
		createElement('span', { className: 'minimize', innerText: '-' }, title);

		// Conainer
		let container = createElement('div', { className: 'editor-container' }, addEditor);
		if (app.editor != null) app.editor(container);

		// Tools
		let tools = createElement('div', { className: 'tools' }, addEditor);
		let close = createElement('a', { innerText: 'Close', className: 'button alert', href: 'javascript:void(null)' }, tools);
		let save = createElement('a', { innerText: 'Save', className: 'button', href: 'javascript:void(null)' }, tools);

		close.addEventListener('click', function() { editApp(null); });

		save.addEventListener('click', function() {
			//
		});
	}





	function getListenerName(name) {
		return listeners[name] ? listeners[name].name : name; 
	}

	function rowContainer(clazz, func) {
		let div = createElement('div', { className: clazz });
		if (func != null) func(div);
		document.getElementById('bot-container').appendChild(div);

		return div;
	}

	function createElement(name, opts, appendTo) {
		let div = document.createElement(name);

		if (opts != null) {
			for (var key in opts) {
				div[key] = opts[key];
			}
		}

		if (appendTo != null) appendTo.appendChild(div);

		return div;
	}
}());