import { Request, Response, Router } from "express";
import { getUserGuildBoosts, route } from "@solarcord/api";

const router = Router();

router.get("/", route({}), async (req: Request, res: Response) => {
	res.json(await getUserGuildBoosts(req.user_id));
});

router.get("/cooldown", route({}), (_req, res) => {
	res.sendStatus(404);
});

export default router;
