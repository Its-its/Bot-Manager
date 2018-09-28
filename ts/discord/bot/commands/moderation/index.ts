import Blacklist = require('./blacklist');
import Command = require('./command');
import Interval = require('./interval');
import Phrase = require('./phrase');
import Alias = require('./alias');

import Mute = require('./mute');
import Warn = require('./warn');
import Ignore = require('./ignore');
import Prune = require('./prune');
import Punishment = require('./punishment');

export = [
	Mute,
	Warn,
	Punishment,

	Command,
	Blacklist,
	Interval,
	Phrase,
	Alias,

	Ignore,
	Prune
];