(function() {
	$(document).foundation();

	// Listener displaying
	let user = {
		twitch: {
			linked: false
		},
		discord: {
			linked: false,
			guilds: []
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

			this.rowCache = [];

			this.id = id;
			this.displayName = displayName;
			this.icon = icon;
			this.color = color;
			
			this.buttonElement = this.button();
		}

		remRow(row) {
			var index = this.rowCache.indexOf(row);
			if (index != -1) this.rowCache.splice(index, 1);
			listenerContainer.removeChild(row);
		}

		addRow(className, func) {
			let div = createElement('div', { className: className });
			if (func != null) func(div);
			listenerContainer.appendChild(div);
			this.rowCache.push(div);
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
			this.buttonElement.style.background = '';
			while(listenerContainer.firstChild)
				listenerContainer.removeChild(listenerContainer.firstChild);
		}

		display() {
			if (displaying != null) displaying.close();
			this.buttonElement.style.background = '#242';
			displaying = this;

			if (!this.setup) this.displaySetup();
		}

		displaySetup() {
			if (this.setup) {
				this.rowCache.forEach(r => listenerContainer.appendChild(r));
				return true;
			}

			this.setup = true;
			return false;
		}
	}

	class DiscordListener extends Listener {
		constructor() {
			super('dsc', 'Discord', 'gray', 'fa-discord');
		}

		display() {
			super.display();
			// Groups, Members, Channels
		}

		displaySetup() {
			if (super.displaySetup()) return;

			// Setup
			if (user.bot.app == null) {
				this.addRow('cell large-12 setup', function(row) {
					createElement('h4', { className: 'title', innerText: 'Setup' }, row);
	
					createElement('p', {
						className: 'desc',
						innerText: `
							It's super simple to setup the Discord listener!
							All you have to do is link your discord account, click on any server in the dropdown.
							After that it will setup itself. :)`
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
	
					if (user.bot.app != null) {
						$.post('/api/listener/status', { type: user.bot.type, id: user.bot.id }, function(data) {
							if (data.error != null) return console.error(data.error);
							data = data.data;
							console.log(data);
						});
					} else {
						// Create the bot and join the server.
						var select = document.createElement('select');
						row.appendChild(select);
						select.add(createElement('option', { value: '', innerText: 'Select A Guild' }));
						user.discord.guilds.forEach(g => select.add(createElement('option', { value: g.id , innerText: g.name })));
	
						select.addEventListener('change', function(event) {
							var _this = this;
							var selected = _this.selectedOptions[0];
							if (selected.value.length != 0) {
								var name = selected.innerText;
								selected.innerText = 'Fetching. Please wait...';
								_this.disabled = true;
								$.post('/discord/invite', { botId: botId, guildId: selected.value }, function(data) {
									_this.disabled = false;
									selected.innerText = name;
									window.location = data;
								});
							}
						});
					}
				});
			}

			// Analytics
			this.addRow('cell large-12 analytics', function(row) {
				//
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
		'twitch': new TwitchListener(),
		'discord': new DiscordListener(),
		'youtube': new YoutubeListener(),
		'telegram': new TelegramListener(),
		'slack': new SlackListener(),
		'twitter': new TwitterListener()
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

		if (bot.app != null) listeners[bot.app.type].display();
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