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

				createElement('div', {
					className: `visual-icon${bot.is_active ? '' : ' not-active'}`,
					innerHTML: `
					<svg width="38" height="38" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 245 240">
						<path fill="#FFF" d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zM140.9 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1s-4.5-11.1-10.2-11.1z"/>
						<path fill="#FFF" d="M189.5 20h-134C44.2 20 35 29.2 35 40.6v135.2c0 11.4 9.2 20.6 20.5 20.6h113.4l-5.3-18.5 12.8 11.9 12.1 11.2 21.5 19V40.6c0-11.4-9.2-20.6-20.5-20.6zm-38.6 130.6s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.5-14.5 4.3-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.7-14.7-4.3-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2 6.1-.8 13-1 20.2-.2 9.5 1.1 19.7 3.9 30.1 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0 0-8.5 14.5-30.6 15.2z"/>
						<circle fill="none" stroke="currentColor" stroke-width="2" cx="122" cy="120" r="120"></circle>
					</svg>
					`
						// <svg width="38" height="38" viewBox="0 0 48 48">
						// 	<g fill="none" fill-rule="evenodd">
						// 		<circle stroke="currentColor" stroke-width="2" cx="24" cy="24" r="23" class="outerCircle"></circle>
						// 		<g class="insidePath">
						// 			<path stroke="#939598" stroke-linecap="round" stroke-linejoin="round"
						// 				d="M35.5 23.5h-23v-6h23zM12.5 17.5l6-5h11l6 5"></path>
						// 			<path
						// 				d="M26 21a.5.5 0 1 1 .002-1.002A.5.5 0 0 1 26 21zM29 21a.5.5 0 1 1 .002-1.002A.5.5 0 0 1 29 21zM32 21a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zM15.5 21.5a1 1 0 1 1-.002-1.998A1 1 0 0 1 15.5 21.5zM35.5 23.5v4a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2v-4"
						// 				stroke="#939598" stroke-linecap="round" stroke-linejoin="round"></path>
						// 			<path
						// 				d="M26 27a.5.5 0 1 1 .002-1.002A.5.5 0 0 1 26 27zM29 27a.5.5 0 1 1 .002-1.002A.5.5 0 0 1 29 27zM32 27a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zM15.5 27.5a1 1 0 1 1-.002-1.998A1 1 0 0 1 15.5 27.5zM17.5 35.5h13M24.5 29.5v6"
						// 				stroke="#939598" stroke-linecap="round" stroke-linejoin="round"></path>
						// 			<path
						// 				d="M13 35.5a.5.5 0 1 0 1.002-.002A.5.5 0 0 0 13 35.5zM15 35.5a.5.5 0 1 0 1.002-.002A.5.5 0 0 0 15 35.5zM32 35.5a.5.5 0 1 0 .998-.002.5.5 0 0 0-.998.002zM34 35.5a.5.5 0 1 0 .998-.002.5.5 0 0 0-.998.002z"
						// 				fill="#939598"></path>
						// 		</g>
						// 	</g>
						// </svg>
				}, visualInner);


				createElement('h3', { className: 'visual-title', innerText: (bot.displayName || 'New Bot') }, visualInner);

				// Dropdown
				createElement('div', {
					className: 'header-dropdown',
					innerHTML: `
						<svg class="dropdown-item" focusable="false" viewBox="0 0 24 24" aria-hidden="true" role="presentation" type="primary">
							<path fill="none" d="M0 0h24v24H0z"></path>
							<path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z">
							</path>
						</svg>
					`
				}, container);

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
		let element = document.createElement(name);

		if (opts != null) {
			for (var key in opts) {
				if (element[key] == null) element.setAttribute(key, opts[key]);
				else element[key] = opts[key];
			}
		}

		if (appendTo != null) appendTo.appendChild(element);

		return element;
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} T
	 * @param {string} namespaceURI
	 * @param {T} name
	 * @param { { [name: string]: any } } [opts]
	 * @param {HTMLElement} [appendTo]
	 * @return {HTMLElementTagNameMap[T]}
	 */
	function createElementNS(namespaceURI, name, opts, appendTo) {
		let element = document.createElementNS(namespaceURI, name);

		if (opts != null) {
			for (var key in opts) {
				if (element[key] == null) element.setAttribute(key, opts[key]);
				else element[key] = opts[key];
			}
		}

		if (appendTo != null) appendTo.appendChild(element);

		return element;
	}
}());