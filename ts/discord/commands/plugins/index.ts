import Music = require('./music');
import Logs = require('./logs');
import RSSFeed = require('./rssfeed');
import Leveling = require('./leveling');

export = [
	new Leveling(),
	new Music(),
	new Logs(),
	new RSSFeed()
];