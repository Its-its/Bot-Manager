import Rank = require('./rank');
import Message = require('./message');
import Plugin = require('./plugin');
import Perms = require('./perms');
import Nick = require('./nick');
import Prefix = require('./prefix');

import Backup = require('./backup');
import Restore = require('./restore');

import Options = require('./options');

import RSSFeed = require('./rssfeed');
import TwitterFeed = require('./twitter');

export = [
	Options,
	Plugin,
	Rank,
	Perms,
	Nick,
	Prefix,
	Backup,
	Restore,
	Message,
	RSSFeed,
	TwitterFeed
];