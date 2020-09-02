

class RandValue {
	public min: number;
	public max?: number;

	constructor(min: number, max?: number) {
		this.min = min;
		this.max = max;
	}

	public value() {
		if (this.max == null) return this.min;
		return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
	}
}

const MAX_LEVEL = 999;
const MAX_EXP = levelsToExp(MAX_LEVEL);

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

// rename to XP amount for Level
function xpAmountForLevel(level: number) {
	return 5 * (Math.pow(level, 2) + (20 * level));
}


function levelsToExp(levels: number) {
	let xp = 0;

	for(let level = 0; level <= levels; level++) {
		xp += xpAmountForLevel(level);
	}

	return xp;
}

function expToLevels(user_total_xp: number) {
	let level = 0;

	let total_xp = 0;

	while(true) {
		total_xp += levelsToExp(level);

		if (user_total_xp < total_xp) return level;

		level++;
	}
}

function remainingExp(totalXp: number) { // 677
	let level = expToLevels(totalXp); // 3
	return levelsToExp(level + 1) - totalXp;
}

function regularArcData(cx: number, cy: number, radius: number, startDegrees: number, endDegrees: number, isCounterClockwise: boolean): string {
	let offsetRadians = Math.PI/2;
	let sweepFlag = isCounterClockwise ? 0 : 1;

	let startRadians = offsetRadians + startDegrees * Math.PI / 180;
	let endRadians = offsetRadians + (startDegrees + endDegrees) * Math.PI / 180;
	let largeArc = ((endRadians - startRadians) % (2 * Math.PI)) > Math.PI ? 1 : 0;

	let startX = (cx + radius * Math.cos(startRadians));
	let startY = (cy + radius * Math.sin(startRadians));
	let endX = (cx + radius * Math.cos(endRadians));
	let endY = (cy + radius * Math.sin(endRadians));

	let space = " ";
	let arcData = "";

	arcData += "M" + space + startX + space + startY + space;
	arcData += "A" + space + radius + space + radius + space + offsetRadians + space + largeArc + space + sweepFlag + space + endX + space + endY;
	return (arcData);
}


export {
	MAX_LEVEL,
	MAX_EXP,

	COOLDOWN_FOR_MESSAGE,
	XP_FOR_MESSAGE,
	XP_FOR_MESSAGE_COUNT,

	COOLDOWN_FOR_REACTION,
	XP_FOR_REACTION_GIVE,
	XP_FOR_REACTION_RECEIVE,

	XP_FOR_VOICE_PER_MINUTE,
	XP_FOR_ONLINE_STATUS,

	CHECK_IF_ONLINE,

	// xpAmountForLevel,
	levelsToExp,
	expToLevels,
	remainingExp,

	regularArcData
};