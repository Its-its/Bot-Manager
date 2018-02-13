import Blacklist = require('./blacklist');
import Whitelist = require('./whitelist');
import CreateCommand = require('./create');
import RemoveCommand = require('./remove');
import Interval = require('./interval');
import Phrase = require('./phrase');

export = [
	new CreateCommand(),
	new RemoveCommand(),
	new Blacklist(),
	new Whitelist(),
	new Interval(),
	new Phrase()
];