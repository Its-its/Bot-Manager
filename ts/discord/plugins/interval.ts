import ModelIntervals = require('../../models/intervals');


function getAllFromGuild(id: string, cb: (err, items) => any) {
	ModelIntervals.find({ $or: [ { _id: id }, { guild_id: id } ] }, (err, items) => cb(err, items));
}


function editInterval(guild_id: string, newObj: Interval) {
	ModelIntervals.findOneAndUpdate(
		{ $or: [ { _id: guild_id }, { guild_id: guild_id } ] }, 
		{ $set: newObj }, 
		err => err && console.error(err)
	);
}


function addInterval(params: Interval) {
	if (params.active && params.nextCall == null && params.every != null) {
		params.nextCall = Date.now() * (params.every * 1000);
	}

	var model = new ModelIntervals(params);
	model.save(() => {});
	return model._id;
}


function removeInterval(id: string) {
	ModelIntervals.remove({ $or: [ { _id: id }, { guild_id: id } ] }, () => {});
}


interface Interval {
	_id?: string;

	pid?: string;

	guild_id?: string;
	channel_id?: string;

	displayName?: string;
	message?: string;
	active?: boolean;

	every?: number;
	nextCall?: number; // Only exists if it's active.

	events?: {
		onCall?: string;
		onReset?: string;
	};
}

export = {
	addInterval,
	editInterval,
	removeInterval,
	getAllFromGuild
};