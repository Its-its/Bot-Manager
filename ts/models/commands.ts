import mongoose = require('mongoose');
import { CustomDocs } from '../../typings/manager';

const Schema = mongoose.Schema;

const Commands = new Schema({
	// Creator ID
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },

	// bot_uids: [ { type: String } ],

	pid: String,
	alias: [ { type: String } ],
	params: [ { type: Schema.Types.Mixed } ],

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});

export = (<mongoose.Model<CustomDocs.global.CommandsDoc>>mongoose.model('commands', Commands));