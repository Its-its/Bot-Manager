import Music = require('./music');
import Logs = require('./logs');
import RSSFeed = require('./rssfeed');

export = [
	new Music(),
	new Logs(),
	new RSSFeed()
];