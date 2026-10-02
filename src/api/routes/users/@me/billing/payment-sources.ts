import { Router, Response, Request } from "express";
import { route } from "@solarcord/api";

const router = Router();

router.get("/", route({}), (req: Request, res: Response) => {
	// TODO:
	res.json([]).status(200);
});

export default router;
