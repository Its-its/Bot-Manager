import Blacklist = require('./blacklist');
import Whitelist = require('./whitelist');
import Command = require('./command');
import Interval = require('./interval');
import Phrase = require('./phrase');
import Alias = require('./alias');

export = [
	new Command(),
	new Blacklist(),
	// new Whitelist(),
	new Interval(),
	new Phrase(),
	new Alias()
];