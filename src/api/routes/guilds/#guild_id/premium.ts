import { Router, Request, Response } from "express";
import {
	applyGuildBoosts,
	getGuildBoosts,
	removeGuildBoost,
	route,
} from "@solarcord/api";
import { HTTPError } from "lambert-server";
const router = Router();

router.get("/subscriptions", route({}), async (req: Request, res: Response) => {
	res.json(await getGuildBoosts(req.params.guild_id));
});

router.put("/subscriptions", route({}), async (req: Request, res: Response) => {
	const slots = req.body?.user_premium_guild_subscription_slot_ids;
	if (!Array.isArray(slots)) throw new HTTPError("Boost slots are required", 400);
	res.json(await applyGuildBoosts(req.user_id, req.params.guild_id, slots));
});

router.delete(
	"/subscriptions/:subscription_id",
	route({}),
	async (req: Request, res: Response) => {
		await removeGuildBoost(
			req.user_id,
			req.params.guild_id,
			req.params.subscription_id,
		);
		res.sendStatus(204);
	},
);

router.get("/subscriptions/cooldown", route({}), (_req, res) => {
	res.sendStatus(404);
});

export default router;
