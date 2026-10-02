import { Request, Response, Router } from "express";
import { route } from "@solarcord/api";

const router: Router = Router();

router.get("/", route({}), async (req: Request, res: Response) => {
	//TODO
	res.json({ country_code: "US" }).status(200);
});

export default router;
