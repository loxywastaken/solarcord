import { Sticker } from "@solarcord/util";
import { Router, Request, Response } from "express";
import { route } from "@solarcord/api";
const router = Router();

router.get("/", route({}), async (req: Request, res: Response) => {
	const { sticker_id } = req.params;

	res.json(await Sticker.find({ where: { id: sticker_id } }));
});

export default router;
