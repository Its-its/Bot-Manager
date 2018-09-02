import Blacklist = require('./blacklist');
import Command = require('./command');
import Interval = require('./interval');
import Phrase = require('./phrase');
import Alias = require('./alias');

import Ignore = require('./ignore');
import Prune = require('./prune');

export = [
	new Command(),
	new Blacklist(),
	new Interval(),
	new Phrase(),
	new Alias(),

	new Ignore(),
	new Prune()
];