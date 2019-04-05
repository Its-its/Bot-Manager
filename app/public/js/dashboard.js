(function() {
	$(document).foundation();

	// Bot Preview

	$('.bot-preview').on('click', function() {
		var botType = $(this).data('bots');
		window.location = window.location.origin + '/dashboard/' + botType;
	});

	$('#createBot').on('click', function() {
		$.post('/api/dashboard/create', function(data) {
			console.log(data);
			window.location.reload();
		});
	});

	$.post('/api/dashboard/status', function(data) {
		if (data.error != null) return console.error(data.error);
		data = data.data;

		var botTypes = {};

		data.forEach(function(bot) {
			// let container = document.createElement('div');
			// container.className = 'bot-preview-container';
			// // div.style.display = 'block';
			// // div.href = '/bot/' + bot.uid;

			// let div = document.createElement('div');
			// div.className = 'bot-preview';
			// container.appendChild(div);

			// let title = document.createElement('h5');
			// title.innerText = (bot.displayName || 'New Bot')
			// div.appendChild(title);

			// let content = document.createElement('p');
			// content.innerText = 'Active: ' + bot.is_active;
			// div.appendChild(content);

			// content = document.createElement('p');
			// content.innerText = 'Type: ' + (bot.selectedBot == null ? 'Unknown' : bot.selectedBot);
			// div.appendChild(content);

			// content = document.createElement('p');
			// content.innerText = 'Created: ' + bot.created_at;
			// div.appendChild(content);

			if (botTypes[bot.selectedBot] == null) botTypes[bot.selectedBot] = [];

			botTypes[bot.selectedBot].push(createPreviewBots(bot));

		});

		function createPreviewBots(bot) {
			const container = createElement('div', { className: 'bot-preview-container' });
			const inner = createElement('div', { className: 'bot-preview' }, container);

			inner.appendChild(header());
			inner.appendChild(center());
			inner.appendChild(footer());

			function header() {
				const container = createElement('div', { className: 'bot-header' });

				// Visual
				const visualContainer = createElement('div', { className: 'header-visual' }, container);
				const visualInner = createElement('a', { className: 'visual-inner', href: `/bot/${bot.uid}` }, visualContainer);

				const visualIcon = createElement('div', { className: 'visual-icon not-active' }, visualInner);
				createElement('svg', {
					width: '38',
					height: '38',
					viewBox: '0 0 48 48',
					innerHTML: `
						<g fill="none" fill-rule="evenodd">
							<circle stroke="currentColor" stroke-width="2" cx="24" cy="24" r="23" class="outerCircle"></circle>
							<g class="insidePath">
								<path stroke="#939598" stroke-linecap="round" stroke-linejoin="round"
									d="M35.5 23.5h-23v-6h23zM12.5 17.5l6-5h11l6 5"></path>
								<path
									d="M26 21a.5.5 0 1 1 .002-1.002A.5.5 0 0 1 26 21zM29 21a.5.5 0 1 1 .002-1.002A.5.5 0 0 1 29 21zM32 21a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zM15.5 21.5a1 1 0 1 1-.002-1.998A1 1 0 0 1 15.5 21.5zM35.5 23.5v4a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2v-4"
									stroke="#939598" stroke-linecap="round" stroke-linejoin="round"></path>
								<path
									d="M26 27a.5.5 0 1 1 .002-1.002A.5.5 0 0 1 26 27zM29 27a.5.5 0 1 1 .002-1.002A.5.5 0 0 1 29 27zM32 27a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zM15.5 27.5a1 1 0 1 1-.002-1.998A1 1 0 0 1 15.5 27.5zM17.5 35.5h13M24.5 29.5v6"
									stroke="#939598" stroke-linecap="round" stroke-linejoin="round"></path>
								<path
									d="M13 35.5a.5.5 0 1 0 1.002-.002A.5.5 0 0 0 13 35.5zM15 35.5a.5.5 0 1 0 1.002-.002A.5.5 0 0 0 15 35.5zM32 35.5a.5.5 0 1 0 .998-.002.5.5 0 0 0-.998.002zM34 35.5a.5.5 0 1 0 .998-.002.5.5 0 0 0-.998.002z"
									fill="#939598"></path>
							</g>
						</g>
					`
				}, visualIcon);


				createElement('h3', { className: 'visual-title', innerText: (bot.displayName || 'New Bot') }, visualInner);

				// Dropdown
				const dropdown = createElement('div', { className: 'header-dropdown' }, container);
				createElement('svg', {
					className: 'dropdown-item',
					focusable: 'false',
					viewBox: '0 0 24 24',
					'aria-hidden': 'true',
					role: 'presentation',
					type: 'primary',
					innerHTML: `
						<path fill="none" d="M0 0h24v24H0z"></path>
						<path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
					`
				}, dropdown);

				// createElement('path', { fill: 'none': d: 'M0 0h24v24H0z' });

				return container;
			}

			function center() {
				const container = createElement('div', { className: 'bot-inner-container' });

				const section00 = createElement('div', { className: 'inner-section' }, container);
				createElement('span', { innerText: 'testing' }, section00);

				return container;
			}

			function footer() {
				const container = createElement('div', { className: 'bot-footer' });

				const buttonConsole = createElement('button', { className: 'footer-button' }, container);
				createElement('span', { innerText: 'Open Console' }, buttonConsole);

				const buttonToggle = createElement('button', { className: 'footer-button' }, container);
				createElement('span', { innerText: 'Disable' }, buttonToggle);

				return container;
			}


			return container;

			/**
					<div class="bot-footer">
						<button class="footer-button"><span>Open Console</span></button>
						<button class="footer-button"><span>Disable</span></button>
					</div>
				</div>
			</div>
			*/
		}


		var container = document.getElementById('bots');

		for(var category in botTypes) {
			var bots = botTypes[category];

			// Later
			// var title = document.createElement('h4');
			// title.innerText = category;
			// container.appendChild(title);

			bots.forEach(b => container.appendChild(b));
		}
	});

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
				if (div[key] == null) div.setAttributeNS(null, key, opts[key]);
				else div[key] = opts[key];
			}
		}

		if (appendTo != null) appendTo.appendChild(div);

		return div;
	}
}());