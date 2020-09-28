import { DiscordBot } from '@type-manager';


import Playlists = require('../../music/models/playlists');

import Users = require('../../site/models/users');

import request = require('request');

import config = require('@config');


import client = require('../client');

// Bot Shard -> Recording Shard
function sendReq(url: string, opts: { [a: string]: string | number | null | undefined }) {
	client.shard!.send(Object.assign({ from: 'bot', to: 'recording', _event: url }, opts));
}

function sendStart(voice_channel_id: string, guild_id: string, member_id: string) {
	sendReq('start', {
		_guild: guild_id,
		_channel: voice_channel_id,
		_sender: member_id
	});
}

function sendStop(text_channel_id: string, guild_id: string, member_id: string) {
	sendReq('stop', {
		_guild: guild_id,
		_channel: text_channel_id,
		_sender: member_id
	});
}





export {
	sendReq,
	sendStart,
	sendStop
};