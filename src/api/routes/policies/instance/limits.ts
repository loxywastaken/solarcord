import { Router, Request, Response } from "express";
import { route } from "@solarcord/api";
import { Config } from "@solarcord/util";
const router = Router();

router.get("/", route({}), async (req: Request, res: Response) => {
	const { limits } = Config.get();
	res.json(limits);
});

export default router;
