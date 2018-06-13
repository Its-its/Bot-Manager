


let PLAYLIST_USER_FLAGS = {
	FULL_ACCESS: 1 << 0,

	CHANGE_VISIBILITY: 1 << 1,
	CAN_VIEW: 1 << 2,

	EDIT_TITLE: 1 << 6,
	EDIT_DESC: 1 << 7,
	EDIT_THUMB: 1 << 8
};

let PLAYLIST_FLAGS = {
	GUILD_ADD_ITEMS: 1 << 0,
	GUILD_REMOVE_ITEMS: 1 << 1,
	WEB_ADD_ITEMS: 1 << 2,
	WEB_REMOVE_ITEMS: 1 << 3,
};



class PlaylistUserPerms {
	public bitfield: number;

	constructor(permissions) {
		this.bitfield = resolvePerms(permissions);
	}

	has(permission, checkFullAcces = true) {
		if (Array.isArray(permission)) return permission.every(p => this.has(p, checkFullAcces));
		permission = resolvePerms(permission);
		if (checkFullAcces && (this.bitfield & PLAYLIST_USER_FLAGS.FULL_ACCESS) > 0) return true;
		return (this.bitfield & permission) === permission;
	}

	missing(permissions, checkFullAcces = true) {
		if (!Array.isArray(permissions)) permissions = new PlaylistUserPerms(permissions).toArray(false);
		return permissions.filter(p => !this.has(p, checkFullAcces));
	}

	freeze() {
		return Object.freeze(this);
	}

	add(...permissions: number[]) {
		var total = 0;
		for (var p = permissions.length - 1; p >= 0; p--) {
			const perm = resolvePerms(permissions[p]);
			total |= perm;
		}
		if (Object.isFrozen(this)) return new PlaylistUserPerms(this.bitfield | total);
		this.bitfield |= total;
		return this;
	}

	remove(...permissions) {
		var total = 0;
		for (var p = permissions.length - 1; p >= 0; p--) {
			const perm = resolvePerms(permissions[p]);
			total |= perm;
		}
		if (Object.isFrozen(this)) return new PlaylistUserPerms(this.bitfield & ~total);
		this.bitfield &= ~total;
		return this;
	}

	serialize(checkFullAcces = true) {
		const serialized = {};
		for (const perm in PLAYLIST_USER_FLAGS) serialized[perm] = this.has(perm, checkFullAcces);
		return serialized;
	}

	toArray(checkFullAcces = true) {
		return Object.keys(PLAYLIST_USER_FLAGS).filter(perm => this.has(perm, checkFullAcces));
	}

	*[Symbol.iterator]() {
		const keys = this.toArray();
		while (keys.length) yield keys.shift();
	}

	static ALL = Object.values(PLAYLIST_USER_FLAGS).reduce((all, p) => all | p, 0);
}

function resolvePerms(permission: number | PlaylistUserPerms | string | any[]): number {
	if (typeof permission === 'number' && permission >= 0) return permission;
	if (permission instanceof PlaylistUserPerms) return permission.bitfield;
	if (Array.isArray(permission)) return permission.map(p => this.resolve(p)).reduce((prev, p) => prev | p, 0);
	if (typeof permission === 'string') return PLAYLIST_USER_FLAGS[permission];
	
	throw new Error('PERMISSIONS_INVALID');
}


function fieldHasPerm(bitfield: number, perms: number | number[]): boolean {
	if (Array.isArray(perms)) return perms.every(p => fieldHasPerm(bitfield, p));
	perms = resolvePerms(perms);
	return (bitfield & perms) === perms;
}

function group(...permissions: number[]) {
	var total = 0;

	for (var p = permissions.length - 1; p >= 0; p--) {
		const perm = resolvePerms(permissions[p]);
		total |= perm;
	}

	return total;
}


export = {
	PLAYLIST_FLAGS,
	PLAYLIST_USER_FLAGS,

	fieldHasPerm,
	group
}