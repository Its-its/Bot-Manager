import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let Phrases = new Schema({
	// Creator ID
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },

	pid: String,

	enabled: { type: Boolean, default: true },
	ignoreCase: { type: Boolean, default: true },

	phrases: [ { type: String } ],
	responses: [ { type: Schema.Types.Mixed } ],

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});

export = mongoose.model('phrases', Phrases);