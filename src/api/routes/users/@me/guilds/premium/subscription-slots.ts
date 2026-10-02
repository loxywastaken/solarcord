import { Router, Response, Request } from "express";
import {
	getGuildBoostSlots,
	route,
	setGuildBoostSlotCanceled,
} from "@solarcord/api";

const router = Router();

router.get("/", route({}), async (req: Request, res: Response) => {
	res.json(await getGuildBoostSlots(req.user_id));
});

router.post("/:slot_id/cancel", route({}), async (req, res) => {
	res.json(await setGuildBoostSlotCanceled(req.user_id, req.params.slot_id, true));
});

router.post("/:slot_id/uncancel", route({}), async (req, res) => {
	res.json(await setGuildBoostSlotCanceled(req.user_id, req.params.slot_id, false));
});

export default router;
