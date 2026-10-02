import { Request, Response, Router } from "express";
import { Guild } from "@solarcord/util";
import { route } from "@solarcord/api";

const router = Router();

router.get(
	"/",
	route({ right: "MANAGE_GUILDS" }),
	async (_req: Request, res: Response) => {
		const guilds = await Guild.find({
			relations: ["owner"],
			order: { name: "ASC" },
		});
		return res.json(
			guilds.map((guild) => {
				const boosts = guild.premium_subscription_count || 0;
				const tier = guild.premium_tier || 0;
				const nextRequirement = [2, 7, 14, 14][tier];
				return {
					id: guild.id,
					name: guild.name,
					icon: guild.icon,
					member_count: guild.member_count || 0,
					premium_subscription_count: boosts,
					premium_tier: tier,
					boost_progress: {
						current: boosts,
						next: nextRequirement,
						remaining: Math.max(0, nextRequirement - boosts),
					},
					boost_tier_requirements: [0, 2, 7, 14],
					community: (guild.features || []).includes("COMMUNITY"),
					rules_channel_id: guild.rules_channel_id,
					public_updates_channel_id: guild.public_updates_channel_id,
					features: guild.features || [],
					owner: guild.owner
						? {
								id: guild.owner.id,
								username: guild.owner.username,
								discriminator: guild.owner.discriminator,
						  }
						: null,
				};
			}),
		);
	},
);

export default router;
