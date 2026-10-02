import { Router, Response, Request } from "express";
import { route } from "@solarcord/api";

const router = Router();

router.post("/", route({}), (req: Request, res: Response) => {
	// TODO:
	res.sendStatus(204);
});

export default router;
