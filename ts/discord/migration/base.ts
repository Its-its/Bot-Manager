import Server = require('../discordserver');
import logging = require('../logging');

class Base {
	static migration: number;

	public dbUpgrade(server: Server, cb: () => any) {}

	public up(server: Server, fin?: (resp: boolean) => any) {
		logging.info(`Upgrading Server (${server.serverId}) (${server.migration})`);
		try {
			this.dbUpgrade(server, () => {
				server.migration++;
				logging.info(`Upgraded Server (${server.serverId}) (${server.migration})`);
				(fin && fin(true));
			});
		} catch(e) {
			logging.error(e);
			(fin && fin(false))
		}
	}
}

export = Base;