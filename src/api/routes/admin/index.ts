import { Request, Response, Router } from "express";
import { Channel, Config, Guild, Message, User } from "@solarcord/util";
import { route } from "@solarcord/api";

const router = Router();

router.get(
	"/",
	route({ right: "OPERATOR" }),
	async (req: Request, res: Response) => {
		const [users, guildList, channels, messages, owner] = await Promise.all([
			User.count({ where: { system: false } }),
			Guild.find({ select: ["id", "premium_subscription_count"] }),
			Channel.count(),
			Message.count(),
			User.findOneOrFail({
				where: { id: req.user_id },
				select: ["id", "username", "discriminator", "email", "rights"],
			}),
		]);

		const general = Config.get().general;
		const guilds = guildList.length;
		const boosts = guildList.reduce(
			(total, guild) => total + (guild.premium_subscription_count || 0),
			0,
		);

		return res.json({
			instance: {
				name: general.instanceName,
				description: general.instanceDescription,
			},
			owner: {
				id: owner.id,
				username: owner.username,
				discriminator: owner.discriminator,
				email: owner.email,
			},
			stats: { users, guilds, channels, messages, boosts },
		});
	},
);

export default router;
