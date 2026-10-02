import { Request, Response, Router } from "express";
import {
	getAccountTermination,
	Rights,
	Session,
	setAccountTermination,
	User,
} from "@solarcord/util";
import { route } from "@solarcord/api";
import { HTTPError } from "lambert-server";

const router = Router();

router.patch(
	"/",
	route({ right: "MANAGE_USERS" }),
	async (req: Request, res: Response) => {
		const action = req.body?.action;
		const user = await User.findOneOrFail({
			where: { id: req.params.user_id },
			select: [
				"id",
				"username",
				"rights",
				"verified",
				"disabled",
				"deleted",
				"bot",
				"system",
				"premium",
				"premium_type",
				"premium_since",
				"data",
				"extended_settings",
			],
		});
		if (user.system || (user.bot && user.username === "Clyde"))
			throw new HTTPError("This service account is protected", 400);

		if (
			user.id === req.user_id &&
			(action === "disable" ||
				action === "revokeOperator" ||
				action === "terminate")
		)
			throw new HTTPError("You cannot lock yourself out", 400);

		switch (action) {
			case "enable":
				user.disabled = false;
				break;
			case "disable":
				user.disabled = true;
				break;
			case "verify":
				user.verified = true;
				break;
			case "grantOperator":
				user.rights = (
					BigInt(user.rights) | Rights.FLAGS.OPERATOR
				).toString();
				break;
			case "revokeOperator":
				user.rights = (
					BigInt(user.rights) & ~Rights.FLAGS.OPERATOR
				).toString();
				break;
			case "grantPremium":
				user.premium = true;
				user.premium_type = 2;
				user.premium_since = new Date();
				break;
			case "revokePremium":
				user.premium = false;
				user.premium_type = 0;
				user.premium_since = null as unknown as Date;
				break;
			case "terminate":
				user.extended_settings = setAccountTermination(
					user.extended_settings,
					{
						at: new Date().toISOString(),
						by: req.user_id,
						reason: String(
							req.body?.reason ||
								"Terminated by a Solarcord administrator",
						).slice(0, 512),
					},
				);
				user.disabled = true;
				user.deleted = false;
				user.rights = "0";
				user.data = {
					...(user.data || {}),
					valid_tokens_since: new Date(),
				};
				break;
			case "restore":
				if (!getAccountTermination(user.extended_settings))
					throw new HTTPError("This account is not terminated", 400);
				user.extended_settings = setAccountTermination(
					user.extended_settings,
					null,
				);
				user.disabled = false;
				user.deleted = false;
				user.data = {
					...(user.data || {}),
					valid_tokens_since: new Date(),
				};
				break;
			default:
				throw new HTTPError("Unknown admin action", 400);
		}

		await user.save();
		if (action === "terminate" || action === "restore")
			await Session.delete({ user_id: user.id });
		const termination = getAccountTermination(user.extended_settings);
		return res.json({
			id: user.id,
			username: user.username,
			verified: user.verified,
			disabled: user.disabled,
			terminated: Boolean(termination),
			terminated_at: termination?.at || null,
			operator:
				(BigInt(user.rights) & Rights.FLAGS.OPERATOR) !== BigInt(0),
			premium: user.premium,
			premium_type: user.premium_type,
		});
	},
);

export default router;
