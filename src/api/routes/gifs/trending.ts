import { Router, Response, Request } from "express";
import fetch from "node-fetch";
import ProxyAgent from "proxy-agent";
import { route } from "@solarcord/api";
import { Config } from "@solarcord/util";
import { HTTPError } from "lambert-server";

const router = Router();

export function parseGifResult(result: any) {
	const media = result?.media?.[0];
	if (!result?.id || !media?.mp4?.url || !media?.gif?.url) return null;
	return {
		id: result.id,
		title: result.title,
		url: result.itemurl,
		src: result.media[0].mp4.url,
		gif_src: result.media[0].gif.url,
		width: result.media[0].mp4.dims[0],
		height: result.media[0].mp4.dims[1],
		preview: result.media[0].mp4.preview,
	};
}

export function parseGifResults(results: unknown) {
	if (!Array.isArray(results)) return [];
	return results.map(parseGifResult).filter(Boolean);
}

export function getGifApiKey() {
	const { enabled, provider, apiKey } = Config.get().gif;
	if (!enabled) throw new HTTPError(`Gifs are disabled`);
	if (provider !== "tenor" || !apiKey)
		throw new HTTPError(`${provider} gif provider not supported`);

	return apiKey;
}

router.get("/", route({}), async (req: Request, res: Response) => {
	// TODO: Custom providers
	// TODO: return gifs as mp4
	const { media_format, locale } = req.query;

	const apiKey = getGifApiKey();

	const agent = new ProxyAgent();

	const [responseSource, trendGifSource] = await Promise.all([
		fetch(
			`https://g.tenor.com/v1/categories?locale=${locale}&key=${apiKey}`,
			{
				agent,
				method: "get",
				headers: { "Content-Type": "application/json" },
			},
		),
		fetch(
			`https://g.tenor.com/v1/trending?locale=${locale}&key=${apiKey}`,
			{
				agent,
				method: "get",
				headers: { "Content-Type": "application/json" },
			},
		),
	]);

	const { tags } = (await responseSource.json()) as any; // TODO: types
	const { results } = (await trendGifSource.json()) as any; //TODO: types;

	res.json({
		categories: (Array.isArray(tags) ? tags : []).map((x: any) => ({
			name: x.searchterm,
			src: x.image,
		})),
		gifs: parseGifResults(results).slice(0, 1),
	}).status(200);
});

export default router;
