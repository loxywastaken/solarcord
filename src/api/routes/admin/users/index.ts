import { Request, Response, Router } from "express";
import { getAccountTermination, Rights, User } from "@solarcord/util";
import { route } from "@solarcord/api";

const router = Router();

router.get(
	"/",
	route({ right: "MANAGE_USERS" }),
	async (_req: Request, res: Response) => {
		const users = await User.find({
			select: [
				"id",
				"username",
				"discriminator",
				"email",
				"rights",
				"verified",
				"disabled",
				"deleted",
				"created_at",
				"bot",
				"system",
				"premium",
				"premium_type",
				"extended_settings",
			],
			order: { created_at: "DESC" },
			take: 250,
		});

		return res.json(
			users.map((user) => {
				const termination = getAccountTermination(
					user.extended_settings,
				);
				return {
					id: user.id,
					username: user.username,
					discriminator: user.discriminator,
					email: user.email,
					verified: user.verified,
					disabled: user.disabled,
					deleted: user.deleted,
					terminated: Boolean(termination),
					terminated_at: termination?.at || null,
					termination_reason: termination?.reason || null,
					operator:
						(BigInt(user.rights) & Rights.FLAGS.OPERATOR) !==
						BigInt(0),
					bot: user.bot,
					system: user.system,
					premium: user.premium,
					premium_type: user.premium_type,
					created_at: user.created_at,
				};
			}),
		);
	},
);

export default router;
