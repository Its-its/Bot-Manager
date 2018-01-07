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
		});
	});

	$.post('/api/dashboard/status', function(data) {
		if (data.error != null) return console.error(data.error);
		data = data.data;
		
		data.forEach(function(bot) {
			let div = document.createElement('a');
			div.style.display = 'block';
			div.href = '/bot/' + bot.uid;
			div.className = 'callout secondary bot-preview';

			let title = document.createElement('h5');
			title.innerText = (bot.displayName || 'New Bot')

			div.appendChild(title);

			let content = document.createElement('p');
			content.innerText = 'Active: ' + bot.is_active;
			div.appendChild(content);

			content = document.createElement('p');
			content.innerText = 'Apps: ' + bot.apps;
			div.appendChild(content);

			content = document.createElement('p');
			content.innerText = 'Created: ' + bot.created_at;
			div.appendChild(content);

			document.getElementById('bots').appendChild(div);
		});
	});
}());