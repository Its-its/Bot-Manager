import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import request = require('request');
import sharp = require('sharp');

import UserLevel = require('../../../../plugins/levels/models/userlevel');
import util = require('../../../../plugins/levels/util');

interface Level {
	xp: number;
	level: number;
}

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (params.length == 0) {
		getRank(message.member.id, (err, user) => {
			if (err != null) {
				console.error(err);
				message.channel.send('An error occured while trying to query the DB. Please try again in a minute.');
				return;
			}

			if (user == null) {
				message.channel.send('Unable to find user in DB. Has he talked yet?');
				return;
			}

			sendImage(message.member, user);
		});
	} else {
		var user = params.shift()!;
		var type = server.idType(user);

		if (type != null && type != 'member') {
			message.channel.send('Must he a users ID or @');
			return;
		}

		var id = server.strpToId(user);

		if (id == null) {
			message.channel.send('Invalid ID');
			return;
		}

		var member = message.guild.member(id);

		if (member == null) {
			message.channel.send('User must be in the Guild.');
			return;
		}

		getRank(id, (err, user) => {
			if (err != null) {
				console.error(err);
				message.channel.send('An error occured while trying to query the DB. Please try again in a minute.');
				return;
			}

			if (user == null) {
				message.channel.send('Unable to find user in DB. Has he talked yet?');
				return;
			}

			sendImage(member, user);
		});
	}

	function getRank(id: string, cb: (err: any, leveling?: Level) => any) {
		if (message.guild.member(id) != null) {
			UserLevel.findOne({ server_id: message.guild.id, member_id: id }, (err, level) => {
				if (err != null) {
					cb(err);
					return;
				}

				cb(null, level == null ? null : level.toJSON());
			});
		}
	}

	function sendImage(member: Discord.GuildMember, level: Level) {
		var prevXP = util.levelsToExp(level.level);
		var nextXP = util.levelsToExp(level.level + 1);

		console.log('prev: ' + prevXP);
		console.log('next: ' + nextXP);
		console.log('XP: ' + level.xp);

		var currentXP = level.xp - prevXP; // 426 - 325 = 101

		var image: string[] = [];

		const cx = 320;
		const cy = 370;

		UserLevel.count({ server_id: message.guild.id, xp: { $gte: level.xp } }, (err, count) => {
			if (err != null) {
				console.error(err);
				message.channel.send('An error occured while trying to query the DB. Please try again in a minute.');
				return;
			}

			const url = member.user.displayAvatarURL.replace(/\.webp.*/i, '.png').replace(/\.gif.*/i, '.png');

			addPath('none', '#223', 10, util.regularArcData(cx, cy, 250, 40, 280, false));
			addPath('none', 'yellow', 12, util.regularArcData(cx, cy, 250, 40, ((level.xp - prevXP)/(nextXP - prevXP)) * 280, false), 'filter="url(#glow)"');

			addText('Member Level', '30px', 'bold', '50%', '280px', null, 'alignment-baseline="middle" text-anchor="middle"');
			addText(level.level, '180px', 'bold', '50%', '70%', null, 'alignment-baseline="middle" text-anchor="middle"');

			var xpText = `${currentXP} / ${nextXP - prevXP} XP`;
			addText(xpText, '20px', 'normal', '50%', 600, null, 'alignment-baseline="middle" text-anchor="middle"');

			addText(member.user.username + `<tspan font-size="23px" font-weight="400">#${member.user.discriminator}</tspan>`, '35px', 'bold', '130px', '45px', null, 'textLength="300" lengthAdjust="spacing"');
			addText('RANK' + `<tspan font-size="40px" font-weight="bold">#${count}</tspan>`, '25px', 'normal', '130px', '90px', '#EEE');


			const imgWidth = 640;
			const imgHeight = 640;

			const avatar = sharp();


			request.get(url + '?size=256')
			.on('end', () => {
				// Create Avatar
				avatar
				.background({ r: 0, g: 0, b: 0, alpha: 0 })
				.overlayWith(Buffer.from(`
					<svg width="100" height="100" viewBox="0 0 100 100">
						<circle r="50" cx="50" cy="50" />
					</svg>`
				), { cutout: true })
				.resize(100, 100)
				.toBuffer()
				.then(avatarBuffer => {
					// Create Base
					sharp(<any>{
						create: {
							width: imgWidth,
							height: imgHeight,
							channels: 4,
							background: { r: 0, g: 0, b: 0, alpha: 0 }
						}
					})
					.overlayWith(Buffer.from(
						`<svg width="${imgWidth}" height="${imgHeight}" font-family="sans-serif">
							<rect x="0" y="0" width="${imgWidth}" height="${imgHeight}" rx="8" ry="8" fill="#15161b" />
							<filter id="glow">
								<feGaussianBlur stdDeviation="6" result="coloredBlur"/>
								<feMerge>
									<feMergeNode in="coloredBlur"/>
									<feMergeNode in="SourceGraphic"/>
								</feMerge>
							</filter>
							${image.join('')}
							<rect x="50%" y="600" width="${xpText.length * 12 + 10}" height="34" fill="none" stroke="#EEE" transform="translate(-${Math.floor((xpText.length * 12 + 10)/2)}, -24)" />
						</svg>`
					))
					.png()
					.toBuffer()
					.then(baseBuffer => {
						// Combine -> Output
						sharp(baseBuffer)
						.overlayWith(avatarBuffer, { top: 10, left: 10 })
						.png()
						.toBuffer()
						.then(fin => {
							message.channel.sendFile(fin);
						})
						.catch(e => console.error(e));
					})
					.catch(e => console.error(e));
				})
				.catch(e => console.error(e));
			})
			.on('error', (e) => console.error(e))
			.pipe(avatar);
		});

		function addText(text: any, size: any, weight: any, x: any, y: any, color: any, extra?: any) {
			image.push(`<text
				${extra == null ? '' : extra}
				fill="${color == null ? '#EEE' : color}"
				x="${x}"
				y="${y}"
				font-size="${size}"
				font-weight="${weight}">${text}</text>`);
		}

		function addPath(fill: any, stroke: any, strokeWidth: any, data: any, extra?: any) {
			image.push('<path fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" d="' + data + `" ${extra == null ? '' : extra} />`);
		}
	}
}


export {
	call
};