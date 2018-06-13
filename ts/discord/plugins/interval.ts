import ModelIntervals = require('../../models/intervals');

function getAllFromGuild(id: string, cb: (err, items) => any) {
	ModelIntervals.find({ server_id: id }, (err, items) => cb(err, items));
}

function editInterval(server_id: string, newObj: Interval) {
	ModelIntervals.findOneAndUpdate({ _id: server_id }, { $set: newObj }, err => err && console.error(err));
}

function addInterval(params: Interval) {
	if (params.active && params.nextCall == null && params.every != null) {
		params.nextCall = Date.now() * (params.every * 1000);
	}

	var model = new ModelIntervals(params);
	model.save((err, item) => {});
	return model._id;
}

function removeInterval(id: string) {
	ModelIntervals.remove({ _id: id }, () => {});
}


interface Interval {
	_id?: string;

	pid?: string;

	server_id?: string;
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