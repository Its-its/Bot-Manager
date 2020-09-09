import Discord = require('discord.js');
import { Server } from '../../GuildServer';

import redis = require('redis');
import async = require('async');

import util = require('./util');
import UserLevel = require('./models/userlevel');
import config = require('@config');


// const redisXP = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.xpDB });


function announceNewLevel(member: Discord.GuildMember, level: number, server: Server) {
	// member.guild.defaultChannel.send('<@' + member.id + '> just advanced to level ' + level + '! Congrats!');
}


function onMessage(message: Discord.Message, server: Server): boolean {
	if (!server.isPluginEnabled('leveling')) return false;

	UserLevel.findOneAndUpdate({
		server_id: message.guild!.id,
		member_id: message.member!.id
	}, {
		$inc: {
			xp: util.XP_FOR_MESSAGE.value()
		},
		$setOnInsert: {
			server_id: message.guild!.id,
			member_id: message.member!.id,
			level: 0
		}
	}, { upsert: true }, (err, item) => {
		if (err != null) {
			console.error(err);
			return false;
		}

		if (item == null) return true;

		let newLevel = util.expToLevels(item.xp);

		if (item.level < newLevel) {
			UserLevel.updateOne({ server_id: message.guild!.id, member_id: message.member!.id }, { $set: { level: newLevel } }).exec();
			announceNewLevel(message.member!, newLevel, server);
		}
	});

	return true;
}

function roleRemove(role: Discord.Role, server: Server) {
	// TODO: Should I auto re-assign roles?
	// TODO: If someone is removing all of them, it'll be called many times and spam discord servers.

	if (server.leveling == null) return;

	let lRoles = server.leveling.roles;
	for(let i = 0; i < lRoles.length; i++) {
		let currRole = lRoles[i];

		if (currRole.id == role.id) {
			if (server.leveling.keepPreviousRoles) {
				server.leveling.roles.splice(i, 1);
			} else {
				if (i == 0) return; // No need if it's the first role.

				let prevRole = lRoles[i - 1];
				let nextRole = (i == lRoles.length - 1 ? null : lRoles[i + 1]);

				server.leveling.roles.splice(i, 1);

				let args: { [str: string]: any } = { $gte: currRole.level };

				if (nextRole != null) args['$lt'] = nextRole.level;

				UserLevel.find({ server_id: role.guild.id, level: args }, (err, items) => {
					// All the users who had this role.

					async.eachLimit(items, 10, (item, callback) => {
						let member = role.guild.member(item['member_id']);
						if (member == null) return callback();

						member.roles.add(prevRole.id)
						.then(() => callback())
						.catch(() => callback());
					}, () => {
						console.log('Finished role migration.');
					});
				});
			}

			server.save().catch(console.error);
			break;
		}
	}
}

function memberLeave(member: Discord.GuildMember | Discord.PartialGuildMember) {
	UserLevel.remove({ server_id: member.guild.id, member_id: member.id }).exec();
	// Remove from redis
}

async function onReactionAdd(user: Discord.User | Discord.PartialUser, reaction: Discord.MessageReaction, server: Server) {
	if (!server.isPluginEnabled('leveling')) return;

	if (!reaction.me) {
		if (!user.bot) {
			// redisXP.zincrby(reaction.message.guild!.id, -util.XP_FOR_REACTION_GIVE.value(), user.id);
			await UserLevel.updateOne({
				server_id: reaction.message.guild!.id,
				member_id: user.id
			}, {
				$inc: {
					xp: util.XP_FOR_REACTION_GIVE.value()
				},
				$setOnInsert: {
					server_id: reaction.message.guild!.id,
					member_id: user.id,
					level: 0
				}
			}, { upsert: true }).exec();
		}

		if (reaction.message.partial) {
			await reaction.message.fetch();
		}

		if (!reaction.message.member!.user.bot) {
			// redisXP.zincrby(reaction.message.guild!.id, -util.XP_FOR_REACTION_RECEIVE.value(), reaction.message.member!.id);
			await UserLevel.updateOne({
				server_id: reaction.message.guild!.id,
				member_id: reaction.message.member!.id
			}, {
				$inc: {
					xp: util.XP_FOR_REACTION_RECEIVE.value()
				},
				$setOnInsert: {
					server_id: reaction.message.guild!.id,
					member_id: reaction.message.member!.id,
					level: 0
				}
			}, { upsert: true }).exec();
		}
	}
}

async function onReactionRemove(user: Discord.User | Discord.PartialUser, reaction: Discord.MessageReaction, server: Server) {
	if (!server.isPluginEnabled('leveling')) return;

	if (!reaction.me) {
		if (!user.bot) {
			// redisXP.zincrby(reaction.message.guild!.id, -util.XP_FOR_REACTION_GIVE.value(), user.id);
			await UserLevel.updateOne({
				server_id: reaction.message.guild!.id,
				member_id: user.id
			}, {
				$inc: {
					xp: -util.XP_FOR_REACTION_GIVE.value()
				},
				$setOnInsert: {
					server_id: reaction.message.guild!.id,
					member_id: user.id,
					level: 0
				}
			}, { upsert: true }).exec();
		}

		if (reaction.message.partial) {
			await reaction.message.fetch();
		}

		if (!reaction.message.member!.user.bot) {
			// redisXP.zincrby(reaction.message.guild!.id, -util.XP_FOR_REACTION_RECEIVE.value(), reaction.message.member!.id);
			await UserLevel.updateOne({
				server_id: reaction.message.guild!.id,
				member_id: reaction.message.member!.id
			}, {
				$inc: {
					xp: -util.XP_FOR_REACTION_RECEIVE.value()
				},
				$setOnInsert: {
					server_id: reaction.message.guild!.id,
					member_id: reaction.message.member!.id,
					level: 0
				}
			}, { upsert: true }).exec();
		}
	}
}




export = {
	onMessage,
	roleRemove,
	memberLeave,
	onReactionAdd,
	onReactionRemove
};