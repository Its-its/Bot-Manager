import Blacklist = require('./blacklist');
import Whitelist = require('./whitelist');
import CreateCommand = require('./create');
import RemoveCommand = require('./remove');

export = [
	new CreateCommand(),
	new RemoveCommand(),
	new Blacklist(),
	new Whitelist()
];