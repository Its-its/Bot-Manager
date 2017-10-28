(function() {
	$(document).foundation();

	// Bot Preview

	$('.bot-preview').on('click', function() {
		var botType = $(this).data('bots');
		window.location = window.location.origin + '/dashboard/' + botType;
	});

	$.post('/api/dashboard/status', (data) => {
		if (data.error != null) return console.error(data.error);
		data = data.data;

		$('.bot-preview').each(function() {
			var preview = $(this);
			var botType = preview.data('bots');

			preview.find('[data-connections]').text(data[botType].count);
			preview.find('[data-errors]').text(data[botType].errors);
		});
	});
}());