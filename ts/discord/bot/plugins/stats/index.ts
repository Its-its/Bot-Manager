// Always enabled.
// Gets server stats
// Member count, Active Count, Message Count, Command Count, Most used Commands,

// Premium: Stats per channel / voice channel / role.

// Possibly store in redis temporarily.

// Hourly. Daily

const STATS: any[] = [];


// Possibly seperate into different docs. hourly / daily.
var example = {
	// 1 week max? 168 items x channel x role | a lot of crap.
	hourly: {
		channel: {
			'id': STATS
		},
		role: {
			'id': STATS
		}
	},

	// 3 months
	daily: {
		channel: {
			'id': STATS
		},
		role: {
			'id': STATS
		}
	}
}