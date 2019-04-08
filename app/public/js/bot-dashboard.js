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

	/** @type {Listener} */
	let displaying = null;
	/** @type {HTMLElement} */
	let listenerContainer = null;

	let botId = window.location.pathname.split('/');
	botId = botId[botId.length - 1];

	// $.post(
	// 	'/api/bots/' + botId + '/commands',
	// 	{
	// 		alias: [ 'ip', 'server' ],
	// 		enabled: true,
	// 		params: [ { response: { type: 'echo', message: 'no, don\'t' }, length:  0 } ]
	// 	},
	// 	function(res) {
	// 		console.log(res);
	// 	}
	// );


	class Listener {
		/**
		 * @param { string } id
		 * @param { string } displayName
		 * @param { string } color
		 * @param { string } icon
		*/
		constructor(id, displayName, color, icon) {
			this.setup = false;

			this.rowCache = [];

			this.id = id;
			this.displayName = displayName;
			this.icon = icon;
			this.color = color;
			this.page = null;

			this.buttonElement = this.button();
			this.componentContainer = null;
		}

		/**
		 * @param { string } className
		 * @param { (elem: HTMLDivElement) => any } func
		 * @return { HTMLDivElement }
		*/
		addComponent(className, func) {
			let div = createElement('div', { className: className });
			if (func != null) func(div);
			this.componentContainer.appendChild(div);
			return div;
		}

		/**
		 * @param { HTMLElement } row
		*/
		remRow(row) {
			var index = this.rowCache.indexOf(row);
			if (index != -1) this.rowCache.splice(index, 1);
			listenerContainer.removeChild(row);
		}

		/**
		 * @param { string } className
		 * @param { (elem: HTMLDivElement) => any } func
		 * @return { HTMLDivElement }
		*/
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
			if (this.componentContainer != null) {
				document.getElementById('bot-container').removeChild(this.componentContainer);
				this.componentContainer = null;
			}

			this.buttonElement.style.background = '';
			while(listenerContainer.firstChild)
				listenerContainer.removeChild(listenerContainer.firstChild);
		}


		// Displays

		/** @return { { [name: string]: () => any } } */
		headerSetup() { return null; }

		setupComponents() {
			if (this.componentContainer != null) {
				document.getElementById('bot-container').removeChild(this.componentContainer);
			}

			this.componentContainer = document.createElement('div');
			this.componentContainer.className = 'container ' + this.id;
			document.getElementById('bot-container').appendChild(this.componentContainer);

			const headers = this.headerSetup();
			var self = this;

			if (headers != null) {
				this.addComponent('cell large-12 header', function(cont) {
					for(var name in headers) {
						addButton(name, headers[name]);
					}

					// addButton('Home', '/bot/' + botId);
					// addButton('Commands', '/bot/' + botId + '/commands');
					// addButton('Responses', '/bot/' + botId + '/responses');
					// addButton('Timers', '/bot/' + botId + '/timers');
					// addButton('Events', '/bot/' + botId + '/events');

					/**
					 * @param { string } displayName
					 * @param { (ev: MouseEvent) => any } onClick
					 */
					function addButton(displayName, onClick) {
						let button = createElement('a', { className: 'header-item', innerText: displayName });
						if (self.page == displayName) button.classList.add('active');

						button.href = 'javascript:void(0)';
						if (onClick != null) {
							button.addEventListener('click', function(event) {
								self.page = displayName;
								onClick(event);
							});
						}

						cont.appendChild(button);
					}
				});
			}
		}

		display() {
			if (displaying == this) return;
			if (displaying != null) displaying.close();

			this.buttonElement.style.background = '#242';
			displaying = this;

			this.displaySetup();

			if (user.bot.type != null) this.setupComponents();
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

		setupComponents() {
			super.setupComponents();
			this.pageHome();
		}

		displaySetup() {
			if (super.displaySetup() || user.bot.type != null) return;

			// Setup
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

				if (user.bot.type != null) {
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

		headerSetup() {
			var self = this;

			return {
				'Home': function() { self.pageHome() },
				'Commands': function() { self.pageCommands() },
				'Phrases': function() { self.pagePhrases() },
				'Ranks': function() {  },
				'Roles': function() {  },
				'Moderation': function() {  },
				'Permissions': function() {  },
				'Intervals': function() { self.pageTimers() }
			};
		}


		pageHome() {
			super.setupComponents();

			this.addComponent('cell large-12 analytics', function(section) {
				createElement('h4', { className: 'title', innerText: 'Analytics' }, section);
			});
		}

		pageCommands() {
			super.setupComponents();

			this.addComponent('cell large-12 commands', function(section) {
				$.get('/api/bots/' + botId + '/commands', function(data) {
					if (data.error != null) return console.error(data.error);
					data = data.data;

					console.log('Commands:', data);

					var commands = data.length;


					const headerRow = createElement('div', { className: 'header-row' }, section);
					createElement('h4', { className: 'title', innerText: 'Commands' }, headerRow);
					createElement('button', { className: 'button success newitem', innerText: 'New' }, headerRow)
					.addEventListener('click', function() { newCommand({}, commands++); });

					// Table init
					const table = createTable({
						footer: false
					});

					const tableRowElement = table.addHeaderRow();
					createElement('th', { innerText: 'Status', style: 'width: 6rem;' }, tableRowElement);
					createElement('th', { innerText: 'Command' }, tableRowElement);
					createElement('th', { innerText: 'Message' }, tableRowElement);
					createElement('th', { innerText: 'Perms', style: 'width: 10rem;' }, tableRowElement);
					createElement('th', { innerText: 'Actions', style: 'width: 6rem;' }, tableRowElement);


					section.appendChild(table.tableElement);

					data.forEach(function(c, i) { newCommand(c, i); });

					const popup = createPopup('Editing Command');

					popup.addFormGroup({
						label: 'Command',
						helpText: 'The command name. It\'s prefixed with the current bot prefix.',
						input: {
							type: 'text',
							name: 'command',
							required: 'true',
							value: 'Testing',
							placeholder: 'Stuff Goes here',
							maxlength: '20'
						}
					});

					popup.addFormGroup({
						label: 'Message',
						helpText: 'This is the commands\' response. You can also use the command variables (soon) to make more-dynamic responses.',
						input: {
							type: 'textarea',
							name: 'message',
							required: 'true',
							placeholder: 'Follow me on twitter!',
							maxlength: '600'
						}
					});

					popup.addFormGroup({
						label: '',
						helpText: '',
						input: {
							type: ''
						}
					});

					popup.addFormGroup({
						label: '',
						helpText: '',
						input: {
							type: ''
						}
					});

					popup.onSubmit(function(values) {
						console.log(values);
					});

					popup.open();

					function createPopup(title) {
						const containerElement = createElement('div', { className: 'popup-container' });
						const innerContainer = createElement('div', { className: 'popup-inner' }, containerElement);

						const titleContainer = createElement('div', { className: 'popup-title' }, innerContainer);
						createElement('span', { innerText: 'x', className: 'exit' }, titleContainer)
						.addEventListener('click', close);
						createElement('h6', { innerText: title }, titleContainer);

						const formElement = createElement('form', { className: 'popup-contents' }, innerContainer);

						const bodyElement = createElement('div', { className: 'form-body' }, formElement);
						const footerElement = createElement('div', { className: 'form-footer' }, formElement);

						createElement('button', { className: 'button', innerText: 'Submit', type: 'submit' }, footerElement);
						createElement('a', { className: 'button', innerText: 'Cancel' }, footerElement)
						.addEventListener('click', close, true);

						function addFormGroup(opts) {
							const container = createElement('div', { className: 'form-group grid-x' });

							createElement('label', { className: 'cell small-2 control-label', innerText: opts.label }, container);

							const rightContainer = createElement('div', { className: 'cell small-10 control-right' }, container);

							switch(opts.input.type) {
								case 'button':
								case 'checkbox':
								case 'color':
								case 'date':
								case 'datetime-local':
								case 'email':
								case 'file':
								case 'hidden':
								case 'image':
								case 'month':
								case 'number':
								case 'password':
								case 'radio':
								case 'range':
								case 'reset':
								case 'search':
								case 'submit':
								case 'tel':
								case 'text':
								case 'time':
								case 'url':
								case 'week': // Same element, different attr type
									var element = createElement('input', { type: opts.input.type, className: 'form-control' }, rightContainer);
									for(var item in opts.input) {
										if (item != 'type') {
											element.setAttribute(item, opts.input[item]);
										}
									}
									break;

								case 'button':
								case 'meter':
								case 'textarea': // Different elements but don't require any internal elements.
									var element = createElement(opts.input.type, { type: opts.input.type, className: 'form-control' }, rightContainer);
									for(var item in opts.input) {
										element.setAttribute(item, opts.input[item]);
									}
									break;
								case 'datalist':
								case 'option':
								case 'select': // All lists w/ <option value="">
									var element = createElement(opts.input.type, { className: 'form-control' }, rightContainer);
									for(var item in opts.input) {
										if (item != 'type' && item != 'items') {
											element.setAttribute(item, opts.input[item]);
										}
									}

									if (opts.input.items != null) {
										opts.input.items.forEach(i => {
											const itemElement = createElement('option', null, element);
											for(var item in i) {
												itemElement.setAttribute(item, i[item]);
											}
										});
									}
									break;
							}

							createElement('span', { className: 'form-control-help', innerText: opts.helpText }, rightContainer);

							bodyElement.appendChild(container);

							return;
						}

						function open() {
							document.body.appendChild(containerElement);
						}

						function close() {
							if (containerElement.parentElement != null) {
								document.body.removeChild(containerElement);
							}
						}

						function onSubmit(todo) {
							if (typeof todo == 'string') {
								// URL
								formElement.method = 'post';
								formElement.action = todo;
							} else if (typeof todo == 'function') {
								// CALLBACK
								formElement.addEventListener('submit', function(e) {
									var cerial = $(formElement).serializeArray();
									// TODO: Account for "name = item[test]"
									var proper = {};
									cerial.forEach(c => proper[c.name] = c.value);
									todo(proper);

									e.preventDefault();
									return false;
								}, true);
							} else {
								throw new Error('Invalid onSubmit. needs to be a string or function, found: ' + (typeof todo));
							}
						}

						return {
							containerElement,

							open,
							close,
							onSubmit,
							addFormGroup
						};
					}

					function newCommand(cmd, i) {
						console.log('new Command[' + i + ']:', cmd);

						const tableRowElement = table.addBodyRow();
						createElement('td', { innerText: cmd.enabled ? 'Enabled' : 'Disabled' }, tableRowElement);
						createElement('td', { innerText: cmd.alias.join(', ') }, tableRowElement);
						createElement('td', { innerText: cmd.params.map(p => p.response.message).join(', ') }, tableRowElement);
						createElement('td', { innerText: 'Anything' }, tableRowElement);

						const actions = createElement('td', null, tableRowElement);
						createElement('button', { className: 'button tiny warning', innerText: 'E', style: 'margin: 0 0.5rem 0 0;' }, actions)
						.addEventListener('click', function() {
							//
						});

						createElement('button', { className: 'button tiny alert', innerText: 'D', style: 'margin: 0;' }, actions)
						.addEventListener('click', function() {
							//
						});

						// var container = createElement('div', { className: 'callout command-container' });

						// // Tools
						// var tools = createElement('div', { className: 'grid-x' }, container);

						// var toggle = createTogglable('Enabled', 'command-enabled-' + i, cmd.enabled == null ? false : cmd.enabled);
						// toggle.container.classList.add('large-4');
						// tools.appendChild(toggle.container);

						// // Right
						// var bsection = createElement('div', { className: 'large-8' }, tools);
						// var saveButton = createElement('button', { className: 'button success', innerText: 'Save', style: 'float: right;' }, bsection);
						// createElement('button', { className: 'button alert', innerText: 'Delete', style: 'float: right;' }, bsection)
						// .addEventListener('click', function() {
						// 	if (cmd.id != null) {
						// 		$.ajax({
						// 			type: 'DELETE',
						// 			url: '/api/bots/' + botId + '/commands/' + cmd.id,
						// 			dataType: 'json'
						// 		});
						// 	}

						// 	// section.removeChild(container);
						// });


						// var bRow = createElement('div', { className: 'grid-x' }, container);



						// // Alias's
						// var lSection = createElement('div', { className: 'large-2' }, bRow);
						// createElement('span', { className: 'title', innerText: 'Alias\'s' }, lSection);

						// var newAlias = createElement('button', { className: 'button success add-button', innerText: '+' }, lSection);
						// newAlias.addEventListener('click', function() { cmd.alias.length < 5 && cmd.alias.push(createAlias('')); });

						// if (cmd.alias == null) cmd.alias = [];

						// cmd.alias = cmd.alias.map(createAlias);

						// if (cmd.alias.length == 0) cmd.alias.push(createAlias(''));


						// function createAlias(name) {
						// 	createElement('input', { type: 'text', value: name }, lSection)
						// 	.addEventListener('keyup', function() { name = this.value; });

						// 	return {
						// 		val: function() {
						// 			return name;
						// 		}
						// 	}
						// }



						// // Responses
						// var rSection = createElement('div', { className: 'large-10', style: 'padding-left: 5px;' }, bRow);
						// createElement('span', { className: 'title', innerText: 'Responses' }, rSection);

						// var newParam = createElement('button', { className: 'button success add-button', innerText: '+' }, rSection);
						// newParam.addEventListener('click', function() { cmd.params.length < 1 && cmd.params.push(createParam({ length: 0 })); });


						// if (cmd.params == null) cmd.params = [];

						// cmd.params = cmd.params.map(createParam);

						// if (cmd.params.length == 0) cmd.params.push(createParam({ length: 0, response: { type: 'echo', message: '' } }));



						// function createParam(param) {
						// 	var group = createElement('div', { className: 'input-group' }, rSection);

						// 	// Dropdown
						// 	var section = createElement('select', { style: 'width: auto;' }, group);
						// 	createElement('option', { value: 'echo', innerText: 'Echo' }, section);
						// 	createElement('option', { value: 'interval', innerText: 'Interval', disabled: 'true' }, section);
						// 	createElement('option', { value: 'set', innerText: 'Set', disabled: 'true' }, section);

						// 	section.addEventListener('change', function() {
						// 		// param.response.type = section.value;
						// 	});

						// 	createElement('input', { type: 'text', value: param.response.message }, group)
						// 	.addEventListener('keyup', function() {
						// 		param.response.message = this.value;
						// 	});

						// 	return {
						// 		val: function() {
						// 			return param;
						// 		}
						// 	}
						// }

						// saveButton.addEventListener('click', function() {
						// 	function finished(data) {
						// 		console.log('NEW:', data);
						// 		console.log(Object.assign({}, cmd));

						// 		Object.assign(cmd, data);

						// 		toggle.set(cmd.enabled);

						// 		// while (lSection.firstChild) lSection.removeChild(lSection.firstChild);
						// 		// cmd.alias.forEach(createAlias);
						// 		// if (cmd.alias.length == 0) createAlias('');

						// 		// while (rSection.firstChild) rSection.removeChild(rSection.firstChild);
						// 		// cmd.params.forEach(createParam);
						// 		// if (cmd.params.length == 0) createParam({ length: 0 });
						// 	}

						// 	if (cmd.id == null) {
						// 		$.ajax({
						// 			type: 'POST',
						// 			url: '/api/bots/' + botId + '/commands',
						// 			data: { alias: cmd.alias.map(a => a.val()), enabled: toggle.val(), params: cmd.params.map(p => p.val()) },
						// 			success: finished,
						// 			dataType: 'json'
						// 		});
						// 	} else {
						// 		$.ajax({
						// 			type: 'PUT',
						// 			url: '/api/bots/' + botId + '/commands/' + cmd.id,
						// 			data: { alias: cmd.alias.map(a => a.val()), enabled: toggle.val(), params: cmd.params.map(p => p.val()) },
						// 			success: finished,
						// 			dataType: 'json'
						// 		});
						// 	}
						// });

						// // section.appendChild(container);
					}
				});
			});
		}

		pagePhrases() {
			super.setupComponents();

			this.addComponent('cell large-12 phrases', function(section) {
				$.get('/api/bots/' + botId + '/phrases', function(data) {
					if (data.error != null) return console.error(data.error);
					data = data.data;

					console.log('Phrases:', data);

					var phrases = data.length;


					createElement('h4', { className: 'title', innerText: 'Phrases' }, section);
					createElement('button', { className: 'button success newitem', innerText: 'New' }, section)
					.addEventListener('click', function() {
						newPhrase({
							enabled: true,
							ignoreCase: true,
							responses: [],
							phrases: []
						}, phrases++);
					});

					data.forEach(function(p, i) { newPhrase(p, i); });

					/** @param { {id: string, enabled: boolean, ignoreCase: boolean, phrases: string[], responses: DiscordBot.PhraseResponses[]} } [phrase]  */
					function newPhrase(phrase, i) {
						var container = createElement('div', { className: 'callout phrase-container' });

						createElement('h5', { innerText: 'ID: ' + (phrase.id || 'New') }, container);

						// Tools
						var tools = createElement('div', { className: 'grid-x' }, container);

						var toggle = createTogglable('Enabled', 'phrase-enabled-' + i, phrase.enabled, function(toggle) {
							phrase.enabled = toggle;
						});
						toggle.container.classList.add('large-4');
						tools.appendChild(toggle.container);

						var ignoreCase = createTogglable('Ignore Case', 'phrase-ignorecase-' + i, phrase.ignoreCase, function(toggle) {
							phrase.ignoreCase = toggle;
						});
						ignoreCase.container.classList.add('large-4');
						tools.appendChild(ignoreCase.container);

						var bsection = createElement('div', { className: 'large-4' }, tools);
						var saveButton = createElement('button', { className: 'button success', innerText: 'Save', style: 'float: right;' }, bsection);
						createElement('button', { className: 'button alert', innerText: 'Delete', style: 'float: right;' }, bsection)
						.addEventListener('click', function() {
							// TODO: Delete  phrase.id
						});

						// Phrases
						var items = createItems(phrase.phrases);
						container.appendChild(items.element);

						// Responses
						var resp = createResponses(phrase.responses);
						container.appendChild(resp.element);

						saveButton.addEventListener('click', function() {
							// TODO: Save
							console.log({
								id: phrase.id,
								enabled: phrase.enabled,
								ignoreCase: phrase.ignoreCase,
								phrases: items.val(),
								responses: resp.val()
							});
						});

						section.appendChild(container);
					}

					// $.post('/api/bots/status', { id: botId }, function(res) {
					// 	if (res.error != null) return console.error(res.error);
					// 	res = res.data;
					// });
				});
			});
		}

		pageTimers() {
			super.setupComponents();

			this.addComponent('cell large-12 timers', function(section) {
				$.get('/api/bots/' + botId + '/intervals', function(data) {
					if (data.error != null) return console.error(data.error);
					data = data.data;

					console.log('Timers:', data);

					var timersLength = data.length;

					createElement('h4', { className: 'title', innerText: 'Timers' }, section);
					createElement('button', { className: 'button success newitem', innerText: 'New' }, section)
					.addEventListener('click', function() {
						newTimer({ every: '30m', displayName: 'New Interval', message: '' }, timersLength++);
					});

					data.forEach(function(c, i) { newTimer(c, i); });

					function newTimer(interval, i) {
						console.log('new Interval[' + i + ']:', interval);

						var container = createElement('div', { className: 'callout command-container' });

						// Tools
						var tools = createElement('div', { className: 'grid-x' }, container);

						var toggle = createTogglable('Enabled', 'command-enabled-' + i, interval.enabled == null ? false : interval.enabled);
						toggle.container.classList.add('large-4');
						tools.appendChild(toggle.container);

						// Right
						var bsection = createElement('div', { className: 'large-8' }, tools);
						var saveButton = createElement('button', { className: 'button success', innerText: 'Save', style: 'float: right;' }, bsection);
						createElement('button', { className: 'button alert', innerText: 'Delete', style: 'float: right;' }, bsection)
						.addEventListener('click', function() {
							if (interval.pid != null) {
								$.ajax({
									type: 'DELETE',
									url: '/api/bots/' + botId + '/commands/' + interval.pid,
									dataType: 'json'
								});
							}

							section.removeChild(container);
						});


						var bRow = createElement('div', { className: 'grid-x' }, container);



						// Left Section. Timing
						var lSection = createElement('div', { className: 'large-2' }, bRow);


						createElement('span', { className: 'title', innerText: 'Timing' }, lSection);

						createElement('input', { type: 'text', value: interval.every}, lSection)
						.addEventListener('keyup', function() { interval.every = this.value; });


						// Right Section. Message
						var rSection = createElement('div', { className: 'large-10', style: 'padding-left: 5px;' }, bRow);


						createElement('span', { className: 'title', innerText: 'Display Name' }, rSection);

						createElement('input', { type: 'text', value: interval.displayName }, rSection)
						.addEventListener('keyup', function() { interval.displayName = this.value; });


						createElement('span', { className: 'title', innerText: 'Message' }, rSection);

						createElement('input', { type: 'text', value: interval.message }, rSection)
						.addEventListener('keyup', function() { interval.message = this.value; });


						saveButton.addEventListener('click', function() {
							function finished(data) {
								console.log('NEW:', data);
								console.log(Object.assign({}, interval));

								Object.assign(interval, data);

								toggle.set(interval.enabled);

								// while (lSection.firstChild) lSection.removeChild(lSection.firstChild);
								// cmd.alias.forEach(createAlias);
								// if (cmd.alias.length == 0) createAlias('');

								// while (rSection.firstChild) rSection.removeChild(rSection.firstChild);
								// cmd.params.forEach(createParam);
								// if (cmd.params.length == 0) createParam({ length: 0 });
							}

							if (interval.pid == null) {
								$.ajax({
									type: 'POST',
									url: '/api/bots/' + botId + '/intervals',
									data: { displayName: interval.displayName, message: interval.message, active: interval.active, every: interval.every },
									success: finished,
									dataType: 'json'
								});
							} else {
								$.ajax({
									type: 'PUT',
									url: '/api/bots/' + botId + '/intervals/' + interval.pid,
									data: { displayName: interval.displayName, message: interval.message, active: interval.active, every: interval.every },
									success: finished,
									dataType: 'json'
								});
							}
						});

						section.appendChild(container);
					}
				});
			});
		}
	}


	function createTable(opts) {
		const container = document.createElement('table');

		let thead = document.createElement('thead');
		let tbody = document.createElement('tbody');
		let tfoot = document.createElement('tfoot');

		if (opts.header === false) thead = null;
		if (opts.footer === false) tfoot = null;
		if (opts.body === false) tbody = null;


		if (thead != null) {
			var header = opts.header;
			if (Array.isArray(header)) {
				header.forEach(h => {
					addHeaderRow(...h);
				});
			}

			container.appendChild(thead);
		}

		if (tbody != null) {
			if (Array.isArray(opts.body)) {
				var body = opts.body;
				if (Array.isArray(body)) {
					body.forEach(h => {
						addBodyRow(...h);
					});
				}
			}

			container.appendChild(tbody);
		}

		if (tfoot != null) {
			if (Array.isArray(opts.footer)) {
				var footer = opts.footer;
				if (Array.isArray(footer)) {
					footer.forEach(h => {
						addFooterRow(...h);
					});
				}
			}

			container.appendChild(tfoot);
		}

		function addHeaderRow(...items) {
			if (thead == null) return;

			const row = document.createElement('tr');

			if (items != null && items.length != 0) {
				items.forEach(i => {
					var item = document.createElement('th');
					item.innerText = i;
					row.appendChild(item);
				});
			}

			thead.appendChild(row);

			return row;
		}

		function addBodyRow(...items) {
			if (tbody == null) return;

			const row = document.createElement('tr');

			if (items != null && items.length != 0) {
				items.forEach(i => {
					var item = document.createElement('td');
					item.innerText = i;
					row.appendChild(item);
				});
			}

			tbody.appendChild(row);

			return row;
		}

		function addFooterRow(...items) {
			if (tfoot == null) return;

			const row = document.createElement('tr');

			if (items != null && items.length != 0) {
				items.forEach(i => {
					var item = document.createElement('th');
					item.innerText = i;
					row.appendChild(item);
				});
			}

			tfoot.appendChild(row);

			return row;
		}

		return {
			addHeaderRow,
			addBodyRow,
			addFooterRow,

			tableElement: container,
			headerElement: thead,
			bodyElement: tbody,
			footerElement: tfoot
		}
	}

	/** @param { import("../../../typings/manager/index").DiscordBot.PhraseResponses[] } responses  */
	function createResponses(responses) {
		var contents = [];

		var container = createElement('div', { className: 'resp-container' });

		var tools = createElement('div', {}, container);
		createElement('button', { innerText: 'New', className: 'button success' }, tools)
		.addEventListener('click', function() { container.appendChild(create()); });


		if (responses != null) {
			responses.forEach(function(e) { container.appendChild(create(e)); });
		}

		// Each Response
		/** @param { import("../../../typings/manager/index").DiscordBot.PhraseResponses } [res]  */
		function create(res) {
			var value = new Object();
			contents.push(value);

			var innercontainer = createElement('div', { className: 'grid-x', style: 'height: 39px; margin-bottom: 5px;' });

			// Select
			var select = createElement('select', { className: 'large-2', style: 'margin: 0px;' });

			createElement('option', { innerText: 'Echo', value: 'echo' }, select);
			createElement('option', { innerText: 'Interval', value: 'interval' }, select);

			select.value = 'echo';

			select.addEventListener('change', function(e) { changeType({ type: select.value }); });

			var removeButton = createElement('button', { className: 'button alert large-2', innerText: 'Remove', style: 'margin: 0px; border: none;' });
			removeButton.addEventListener('click', function() {
				container.removeChild(innercontainer);
				contents.splice(contents.indexOf(value), 1);
			});

			// Set data

			if (typeof res == 'string') {
				var split = res.split(' ');
				value.type = select.value = split.shift();

				if (select.value == 'echo') {
					value.message = split.join(' ');
				} else if (select.value == 'interval') {
					value.id = split.shift();
					value.do = split.shift();
				}
			} else if (res != null) {
				for(var name in res) {
					value[name] = res[name];
				}
			}

			if (value == null) value = { type: 'echo' };
			else if (value.type == null) value.type = 'echo';

			changeType(Object.assign({}, value));

			//

			function changeType(obj) {
				reset();

				innercontainer.appendChild(select);

				if (obj != null) {
					Object.assign(value, obj);

					if (obj.type == 'echo') {
						value['message'] = obj.message || '';

						createElement('input', {
							className: 'large-8',
							placeholder: 'Message',
							type: 'text',
							style: 'margin: 0px;',
							value: value['message']
						}, innercontainer)
						.addEventListener('keyup', function() { value['message'] = this.value; });
					} else if (obj.type == 'interval') {
						value['id'] = obj.id || '';
						value['do'] = obj.do || 'reset';

						createElement('input', {
							className: 'large-5',
							placeholder: 'Interval ID',
							type: 'text',
							style: 'margin: 0px;',
							value: value['id']
						}, innercontainer)
						.addEventListener('keyup', function() { value['id'] = this.value; });
						// TODO: Make selectable ^

						var select_do = createElement('select', { className: 'large-3', style: 'margin: 0px;' }, innercontainer);
						createElement('option', {
							innerText: 'Reset',
							value: value['do']
						}, select_do);
						select_do.addEventListener('change', function() { value['do'] = this.value; });
					}
				}

				innercontainer.appendChild(removeButton);
			}

			function reset() {
				delete value['do'];
				delete value['id'];
				delete value['message'];
				delete value['type'];

				while(innercontainer.firstChild) innercontainer.removeChild(innercontainer.firstChild);
			}

			return innercontainer;
		}

		return {
			element: container,
			val: function() {
				var correct = [];

				contents.forEach(function(item) {
					switch(item.type) {
						case 'echo':
							if (item.message == null || item.message.length == 0) return;
							break;
						case 'interval':
							if (item.id == null || item.id.length == 0) return;
							if (item.do == null) return;
							break;
					}

					correct.push(item);
				});

				return correct;
			}
		};
	}

	function createItems(chips, onAdd) {
		var contents = [];

		var chipContainer = createElement('div', { className: 'chip-container' });

		var input = createElement('input', { className: 'input' }, chipContainer);

		input.addEventListener('keypress', function(e) {
			if (e.key == 'Enter' && input.value.length != 0 && contents.indexOf(input.value) == -1) {
				addChip(input.value);
				input.value = '';
				if (onAdd != null) onAdd(contents);
			}
		});

		if (chips != null) chips.forEach(function(c) { addChip(c); });


		function addChip(name) {
			contents.push(name);

			var chip = createElement('div', { className: 'chip', innerText: name });

			var ex = createElement('i', { className: 'remove', innerText: 'x' }, chip);
			ex.addEventListener('click', function() {
				chipContainer.removeChild(chip);
				contents.splice(contents.indexOf(name), 1);
				if (onAdd != null) onAdd(contents);
			});

			chipContainer.insertBefore(chip, input);

			return chip;
		}

		return {
			element: chipContainer,
			val: function() { return contents; }
		};
	}

	class TwitchListener extends Listener {
		constructor() {
			super('ttv', 'Twitch TV', 'purple', 'fa-twitch');
		}

		display() {
			super.display();
		}

		displaySetup() {
			if (super.displaySetup()) return;

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


	const listeners = {
		'twitch': new TwitchListener(),
		'discord': new DiscordListener(),
		'youtube': new YoutubeListener(),
		'telegram': new TelegramListener(),
		'slack': new SlackListener(),
		'twitter': new TwitterListener()
	}



	// App Selection
	const appSelection = rowContainer('cell large-12 apps', function(cont) {
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
	}, false);

	listenerContainer = rowContainer('cell large-12 listener', null, false);


	$.post('/api/bots/status', { bid: botId }, function(data) {
		if (data.error != null) return console.error(data.error);
		data = data.data;

		user = data.user;

		var bot = user.bot = data.bot;

		console.log(user);

		let status = createElement('div', { className: 'callout status' });

		createElement('h4', { innerText: (bot.displayName || 'Bot') }, status);

		createElement('p', { innerText: 'Active: ' + bot.active }, status);
		createElement('p', { innerText: 'Created: ' + new Date(bot.created).toLocaleDateString() },  status);
		createElement('p', { innerText: 'Edited: ' + new Date(bot.edited).toLocaleDateString() }, status);

		document.getElementById('bot-info').appendChild(status);

		var bc = document.getElementById('bot-container');
		var dd = document.getElementById('dropdown');

		if (bot.type != null) {
			listeners[bot.type].display();

			var liL = createElement('li');
			var aL = createElement('a', { href: 'javascript:void()', innerText: 'Listener' }, liL);

			aL.addEventListener('click', () => {
				if (appSelection.parentElement) {
					bc.removeChild(appSelection);
					bc.removeChild(listenerContainer);
				} else {
					bc.appendChild(appSelection);
					bc.appendChild(listenerContainer);
				}
			});

			dd.insertBefore(liL, dd.firstChild);
		} else {
			bc.appendChild(appSelection);
			bc.appendChild(listenerContainer);
		}

		var liD = createElement('li');
		var aD = createElement('a', { href: 'javascript:void()', innerText: 'Listener' }, liD);

		aD.addEventListener('click', () => {
			$.ajax({
				method: 'DELETE',
				url: '/api/bots/' + botId
			})
			.done(function(msg) {
				console.log(msg);
				// window.redirect('');
			});
		});

		dd.insertBefore(liD, dd.firstChild);
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

	function rowContainer(clazz, func, append) {
		let div = createElement('div', { className: clazz });
		if (func != null) func(div);
		if (append !== false) document.getElementById('bot-container').appendChild(div);

		return div;
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} T
	 * @param {T} name
	 * @param { { [name: string]: any } } [opts]
	 * @param {HTMLElement} [appendTo]
	 * @return {HTMLElementTagNameMap[T]}
	 */
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

	/**
	 * @param {string} name
	 * @param {string} id
	 * @param {boolean} toggled
	 * @param {(toggled: boolean) => any} [onClick]
	 */
	function createTogglable(name, id, toggled, onClick) {
		var container = createElement('div', { style: 'height: 32px;' });

		createElement('span', { innerText: name }, container);

		var cont = createElement('div', { className: 'switch', style: 'float: left; margin-right: 4px; margin-bottom: 0;' }, container);

		var button = createElement('input', { className: 'switch-input', type: 'checkbox', id: id, checked: toggled }, cont);

		var label = createElement('label', { className: 'switch-paddle', htmlFor: id }, cont);
		createElement('span', { className: 'show-for-sr', innerText: name }, label);
		createElement('span', { className: 'switch-active', 'aria-hidden': 'true', innerText: 'Yes' }, label);
		createElement('span', { className: 'switch-inactive', 'aria-hidden': 'true', innerText: 'No' }, label);

		label.addEventListener('click', function() {
			toggled = !toggled;
			(onClick && onClick(toggled));
		});

		return {
			container: container,
			label: label,
			input: button,
			/** @param {boolean} [value] */
			set: function(value) {
				label.checked = value;
			},
			/** @return {boolean} */
			val: function() {
				return label.checked;
			}
		};
	}
}());