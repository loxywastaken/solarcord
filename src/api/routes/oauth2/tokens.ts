import { Router, Request, Response } from "express";
import { route } from "@solarcord/api";
const router = Router();

router.get("/", route({}), async (req: Request, res: Response) => {
	//TODO
	res.json([]);
});

export default router;
