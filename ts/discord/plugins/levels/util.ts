

class RandValue {
	public min: number;
	public max: number;

	constructor(min: number, max?: number) {
		this.min = min;
		this.max = max;
	}

	public value() {
		if (this.max = null) return this.min;
		return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
	}
}


const CHECK_IF_ONLINE = 15;

const COOLDOWN_FOR_MESSAGE = 30;
const XP_FOR_MESSAGE = new RandValue(12, 20);

const COOLDOWN_FOR_REACTION = 15;
const XP_FOR_REACTION_RECEIVE = new RandValue(6);
const XP_FOR_REACTION_GIVE = new RandValue(3);

const XP_FOR_ONLINE_STATUS = new RandValue(3);

const XP_FOR_VOICE_PER_MINUTE = new RandValue(3);

const XP_FOR_MESSAGE_COUNT = new RandValue(0.3);

// TODO: The more you talk in a day = the more xp you get. | message_count * 0.3
// TODO: Ignore if sent a message a second after the last one.

function expToNextLevel(level: number) {
	return 5 * (Math.pow(level, 2) + (20 * level));
}


function levelsToExp(levels: number) {
	var xp = 0;

	for(var level = 0; level <= levels; level++) {
		xp += expToNextLevel(level);
	}

	return xp;
}

function expToLevels(totalXp: number) {
	var level = 0;

	while(true) {
		var xp = levelsToExp(level);

		if (totalXp < xp) return level;

		level++;
	}
}

function remainingExp(totalXp: number) {
	var level = expToLevels(totalXp);

	if (level == 0) return totalXp;

	var xp = levelsToExp(level);

	return totalXp - xp + expToNextLevel(level);
}


export {
	COOLDOWN_FOR_MESSAGE,
	XP_FOR_MESSAGE,
	XP_FOR_MESSAGE_COUNT,

	COOLDOWN_FOR_REACTION,
	XP_FOR_REACTION_GIVE,
	XP_FOR_REACTION_RECEIVE,
	
	XP_FOR_VOICE_PER_MINUTE,
	XP_FOR_ONLINE_STATUS,

	CHECK_IF_ONLINE,

	expToNextLevel,
	levelsToExp,
	expToLevels,
	remainingExp
};