import { Request, Response, Router } from "express";
import { route } from "@solarcord/api";
import { Application, OrmUtils, Team, trimSpecial, User } from "@solarcord/util";

const router: Router = Router();

router.get("/", route({}), async (req: Request, res: Response) => {
	res.json([]).status(200);
});

export default router;
