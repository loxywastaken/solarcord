import { Request, Response, Router } from "express";
import {
	Ban,
	emitEvent,
	Guild,
	GuildBanAddEvent,
	GuildBanRemoveEvent,
	GuildMemberUpdateEvent,
	Member,
	User,
} from "@solarcord/util";
import { route } from "@solarcord/api";
import { HTTPError } from "lambert-server";

const router = Router();

router.patch(
	"/",
	route({ right: "MANAGE_GUILDS" }),
	async (req: Request, res: Response) => {
		const { guild_id, user_id } = req.params;
		const guild = await Guild.findOneOrFail({ where: { id: guild_id } });
		const user = await User.getPublicUser(user_id);
		if (
			user.system ||
			user.id === guild.owner_id ||
			(user.bot && user.username === "Clyde")
		)
			throw new HTTPError("This member is protected", 400);

		switch (req.body?.action) {
			case "kick":
				await Member.removeFromGuild(user.id, guild.id);
				break;
			case "ban": {
				const existing = await Ban.findOne({
					where: { user_id: user.id, guild_id: guild.id },
				});
				if (!existing) {
					await Ban.create({
						user_id: user.id,
						guild_id: guild.id,
						executor_id: req.user_id,
						ip: "admin-panel",
						reason: String(req.body?.reason || "Banned by an administrator").slice(0, 512),
					}).save();
					const member = await Member.findOne({
						where: { id: user.id, guild_id: guild.id },
					});
					if (member) await Member.removeFromGuild(user.id, guild.id);
					await emitEvent({
						event: "GUILD_BAN_ADD",
						guild_id: guild.id,
						data: { guild_id: guild.id, user: user.toPublicUser() },
					} as GuildBanAddEvent);
				}
				break;
			}
			case "unban":
				await Ban.delete({ user_id: user.id, guild_id: guild.id });
				await emitEvent({
					event: "GUILD_BAN_REMOVE",
					guild_id: guild.id,
					data: { guild_id: guild.id, user: user.toPublicUser() },
				} as GuildBanRemoveEvent);
				break;
			case "timeout": {
				const minutes = Math.min(
					Math.max(Number(req.body?.minutes) || 60, 1),
					40320,
				);
				const member = await Member.findOneOrFail({
					where: { id: user.id, guild_id: guild.id },
					relations: ["roles"],
				});
				member.communication_disabled_until = new Date(
					Date.now() + minutes * 60 * 1000,
				);
				await member.save();
				await emitEvent({
					event: "GUILD_MEMBER_UPDATE",
					guild_id: guild.id,
					data: {
						guild_id: guild.id,
						user: user.toPublicUser(),
						roles: member.roles.map((role) => role.id),
						communication_disabled_until:
							member.communication_disabled_until,
					},
				} as unknown as GuildMemberUpdateEvent);
				break;
			}
			case "clearTimeout":
				await Member.update(
					{ id: user.id, guild_id: guild.id },
					{ communication_disabled_until: null as unknown as Date },
				);
				break;
			default:
				throw new HTTPError("Unknown moderation action", 400);
		}
		return res.json({ success: true });
	},
);

export default router;
