const PERMS = {
	MAIN: 'commands.music',

	INFO: 'info',
	JOIN: 'join',
	LEAVE: 'leave',
	CURRENT: 'current',
	PLAY: 'play',
	STOP: 'stop',
	SKIP: 'skip',
	SEARCH: 'search',

	HISTORY: 'history',
	HISTORY_LIST: 'history.list',
	HISTORY_CLEAR: 'history.clear',

	QUEUE: 'queue',
	QUEUE_ADD: 'queue.add',
	QUEUE_PLAYLIST: 'queue.playlist',
	QUEUE_LIST: 'queue.list',
	QUEUE_REPEAT: 'queue.repeat',
	QUEUE_SHUFFLE: 'queue.shuffle',
	QUEUE_CLEAR: 'queue.clear',
	QUEUE_REMOVE: 'queue.remove',

	PLAYLIST: 'playlist',
	PLAYLIST_CREATE: 'playlist.create',
	PLAYLIST_INFO: 'playlist.info',
	PLAYLIST_LIST: 'playlist.list',
	PLAYLIST_DELETE: 'playlist.delete',
	PLAYLIST_ADD: 'playlist.add',
	PLAYLIST_REMOVE: 'playlist.remove',
	PLAYLIST_CLEAR: 'playlist.clear',
	PLAYLIST_TITLE: 'playlist.title',
	PLAYLIST_DESCRIPTION: 'playlist.description',
	PLAYLIST_THUMBNAIL: 'playlist.thumbnail'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

export = PERMS;