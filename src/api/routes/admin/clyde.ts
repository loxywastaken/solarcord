import { Request, Response, Router } from "express";
import { Guild, Member } from "@solarcord/util";
import { getClydeUser, initClyde, route } from "@solarcord/api";

const router = Router();

const commands = [
	"help",
	"ping",
	"status",
	"server",
	"boosts",
	"members",
	"channels",
	"badges",
	"rules",
	"theme",
	"about",
];

router.get(
	"/",
	route({ right: "OPERATOR" }),
	async (_req: Request, res: Response) => {
		const clyde = await getClydeUser();
		const [servers, memberships] = await Promise.all([
			Guild.count(),
			Member.count({ where: { id: clyde.id } }),
		]);
		return res.json({
			id: clyde.id,
			username: clyde.username,
			discriminator: clyde.discriminator,
			avatar: clyde.avatar,
			verified: clyde.verified,
			online: true,
			servers,
			memberships,
			commands,
		});
	},
);

router.post(
	"/repair",
	route({ right: "OPERATOR" }),
	async (_req: Request, res: Response) => {
		const clyde = await initClyde();
		return res.json({
			success: true,
			id: clyde.id,
			message: "Clyde was verified and added to every server.",
		});
	},
);

export default router;
