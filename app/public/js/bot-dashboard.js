(function() {
	$(document).foundation();

	let botType = window.location.pathname.split('/');
	botType = botType[botType.length - 1];

	$.post('/api/dashboard/status', { botType: botType }, function(data) {
		if (data.error != null) return console.error(data.error);
		data = data.data;

		let bots = data.bots; // confirmation_id created_at custom_token edited_at is_active is_disconnected

		bots.forEach(function(bot) {
			let div = document.createElement('div');
			div.className = 'callout secondary bot-preview';

			let title = document.createElement('h5');
			title.innerText = bot.name == null ? 'Discord Bot' : bot.name

			div.appendChild(title);

			let content = document.createElement('p');
			content.innerText = 'Active: ' + bot.is_active;
			div.appendChild(content);

			content = document.createElement('p');
			content.innerText = 'Disconnected: ' + bot.is_disconnected;
			div.appendChild(content);

			content = document.createElement('p');
			content.innerText = 'Registered: ' + bot.is_registered;
			div.appendChild(content);

			content = document.createElement('p');
			content.innerText = 'Confirmation ID: ' + bot.confirmation_id;
			div.appendChild(content);

			document.getElementById('bots').appendChild(div);
		});
	});

	$('#createBot').on('click', function() {
		$.post('/api/bots/create', { botType: botType }, function(data) {
			if (data.error != null) return console.error(data.error);

			console.log(data);
		});
	});
}());