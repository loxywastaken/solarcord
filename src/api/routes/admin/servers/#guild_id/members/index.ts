import { Request, Response, Router } from "express";
import { Ban, Member, User } from "@solarcord/util";
import { route } from "@solarcord/api";

const router = Router();

router.get(
	"/",
	route({ right: "MANAGE_GUILDS" }),
	async (req: Request, res: Response) => {
		const [members, bans] = await Promise.all([
			Member.find({
				where: { guild_id: req.params.guild_id },
				relations: ["user", "roles"],
			}),
			Ban.find({ where: { guild_id: req.params.guild_id } }),
		]);
		const bannedUsers = await Promise.all(
			bans.map((ban) => User.getPublicUser(ban.user_id)),
		);
		return res.json([
			...members.map((member) => ({
				id: member.id,
				status: "member",
				user: member.user.toPublicUser(),
				nick: member.nick,
				joined_at: member.joined_at,
				premium_since: member.premium_since,
				communication_disabled_until:
					member.communication_disabled_until,
				roles: member.roles.map((role) => role.id),
			})),
			...bans.map((ban, index) => ({
				id: ban.user_id,
				status: "banned",
				user: bannedUsers[index].toPublicUser(),
				reason: ban.reason,
			})),
		]);
	},
);

export default router;
