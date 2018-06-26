import Rank = require('./rank');
import Plugin = require('./plugin');
import Perms = require('./perms');
import Raw = require('./raw');
import Nick = require('./nick');
import Prefix = require('./prefix');

import Backup = require('./backup');
import Restore = require('./restore');

export = [
	new Plugin(),
	new Rank(),
	new Perms(),
	new Nick(),
	new Prefix(),
	new Backup(),
	new Restore(),
	new Raw()
];