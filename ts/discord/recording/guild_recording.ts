import { DiscordBot, Nullable } from '@type-manager';

import redis = require('redis');
import Discord = require('discord.js');

import config = require('@config');


const redisClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.musicDB });


class RecordingClient {
	public guildId: string;

	public lastVoiceChannelId: string;
	public lastTextChannelId?: string;

	constructor(guildId: string, save: DiscordBot.plugins.RecordingOptions) {
		this.guildId = guildId;

		this.lastVoiceChannelId = save.lastVoiceChannelId;
		this.lastTextChannelId = save.lastTextChannelId;
	}

	public async save() {
		return new Promise((resolve, reject) => {
			redisClient.set(this.guildId + '-rec', this.toString(), (err, resp) => err ? reject(err) : resolve(resp));
		})
	}

	public async delete() {
		return deleteRecordingData(this.guildId);
	}

	public async regrab() {
		return getRecordingData(this.guildId);
	}

	public toString() {
		return JSON.stringify({
			lastVoiceChannelId: this.lastVoiceChannelId,
			lastTextChannelId: this.lastTextChannelId
		});
	}
}

async function getOrCreateRecordingData(serverId: string, lastVoiceChannelId: string, lastTextChannelId: string) {
	let data = await getRecordingData(serverId);

	if (data == null) {
		data = await newRecordingData(serverId, lastVoiceChannelId, lastTextChannelId);
	}

	return data;
}


async function getRecordingData(serverId: string) {
	return new Promise<Nullable<RecordingClient>>((resolve, reject) => {
		redisClient.get(serverId + '-rec', (err, str) => {
			if (err != null) {
				console.error(err);
				reject(err);
			} else {
				resolve(str == null ? null : new RecordingClient(serverId, JSON.parse(str)));
			}
		});
	});
}

async function newRecordingData(guildId: string, lastVoiceChannelId: string, lastTextChannelId?: string) {
	return new Promise<RecordingClient>((resolve, reject) => {
		const client = new RecordingClient(guildId, { lastVoiceChannelId, lastTextChannelId });

		redisClient.set(guildId + '-rec', client.toString(), err => {
			if (err != null) {
				console.error(err);
				reject(err);
			} else {
				resolve(client);
			}
		});
	});
}

async function deleteRecordingData(guildId: string) {
	return new Promise<number>((resolve, reject) => {
		redisClient.del(guildId + '-rec', (err, reply) => {
			if (err != null) {
				console.error(err);
				reject(err);
			} else {
				resolve(reply);
			}
		});
	});
}


export {
	RecordingClient,
	getRecordingData,
	newRecordingData,
	deleteRecordingData,
	getOrCreateRecordingData
};