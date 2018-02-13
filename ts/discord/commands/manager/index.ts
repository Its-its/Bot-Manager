import Rank = require('./rank');
import Plugin = require('./plugin');
import Perms = require('./perms');

export = [
	new Plugin(),
	new Rank(),
	new Perms()
];