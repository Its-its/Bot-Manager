import mongoose = require('mongoose');

let Schema = mongoose.Schema;

// TODO: Every 5 minutes Activity for major things like; music playing, chat messages so I know when peaks are.

// TODO: Send update every 30 minutes.
const DailyActivity = new Schema({
	guild_count: { type: Number, default: 0 },
	user_count: { type: Number, default: 0 },

	// guild_chat_count: { type: Number, default: 0 },
	// private_chat_count: { type: Number, default: 0 },

	// music_plays_count: { type: Number, default: 0 },
	// music_bandwidth: { type: Number, default: 0 },

	// punishment_count: { type: Number, default: 0 },
	// phrase_response_count: { type: Number, default: 0 },

	// active_feed_count: { type: Number, default: 0 },
	// feed_bandwidth: { type: Number, default: 0 },

	created_at: Date // Make 12:00 AM
});

export = mongoose.model('discord_activity_daily', DailyActivity);