import { Request, Response, Router } from "express";
import {
	emitEvent,
	Guild,
	GuildUpdateEvent,
	User,
	UserFlags,
} from "@solarcord/util";
import {
	applyGuildBoosts,
	BOOST_TIER_REQUIREMENTS,
	disableCommunityServer,
	enableCommunityServer,
	getGuildBoosts,
	getGuildBoostSlots,
	getUserGuildBoosts,
	removeGuildBoost,
	route,
} from "@solarcord/api";
import { HTTPError } from "lambert-server";

const router = Router();

async function syncPartnerOwnerBadge(ownerId?: string) {
	if (!ownerId) return;
	const [owner, guilds] = await Promise.all([
		User.findOne({
			where: { id: ownerId },
			select: ["id", "flags", "public_flags"],
		}),
		Guild.find({
			where: { owner_id: ownerId },
			select: ["id", "features"],
		}),
	]);
	if (!owner) return;

	const flag = UserFlags.FLAGS.PARTNERED_SERVER_OWNER;
	const hasPartner = guilds.some((guild) =>
		(guild.features || []).includes("PARTNERED"),
	);
	const privateFlags = BigInt(owner.flags || "0");
	const publicFlags = BigInt(owner.public_flags || 0);
	owner.flags = (
		hasPartner ? privateFlags | flag : privateFlags & ~flag
	).toString();
	owner.public_flags = Number(
		hasPartner ? publicFlags | flag : publicFlags & ~flag,
	);
	await owner.save();
}

router.patch(
	"/",
	route({ right: "MANAGE_GUILDS" }),
	async (req: Request, res: Response) => {
		const guild = await Guild.findOneOrFail({
			where: { id: req.params.guild_id },
		});
		const action = req.body?.action;
		if (action === "setBoostTier") {
			const tier = Number(req.body?.tier);
			if (!Number.isInteger(tier) || tier < 0 || tier > 3)
				throw new HTTPError("Boost tier must be between 0 and 3", 400);

			const target = BOOST_TIER_REQUIREMENTS[tier as 0 | 1 | 2 | 3];
			const [allBoosts, userBoosts, slots] = await Promise.all([
				getGuildBoosts(guild.id),
				getUserGuildBoosts(req.user_id),
				getGuildBoostSlots(req.user_id),
			]);
			const mine = userBoosts.filter(
				(boost) => boost.guild_id === guild.id,
			);
			const boostsFromOthers = allBoosts.filter(
				(boost) => boost.user_id !== req.user_id,
			).length;
			if (boostsFromOthers > target)
				throw new HTTPError(
					`Other members already provide ${boostsFromOthers} boosts, so this server cannot be lowered to Tier ${tier}`,
					400,
				);

			const desiredMine = target - boostsFromOthers;
			if (mine.length > desiredMine) {
				for (const boost of mine.slice(desiredMine))
					await removeGuildBoost(req.user_id, guild.id, boost.id);
			} else if (mine.length < desiredMine) {
				const needed = desiredMine - mine.length;
				const available = slots
					.filter(
						(slot) =>
							!slot.premium_guild_subscription && !slot.canceled,
					)
					.slice(0, needed);
				if (available.length !== needed)
					throw new HTTPError(
						`You need ${needed} available managed boost slots to reach Tier ${tier}`,
						400,
					);
				await applyGuildBoosts(
					req.user_id,
					guild.id,
					available.map((slot) => slot.id),
				);
			}

			return res.json(
				await Guild.findOneOrFail({ where: { id: guild.id } }),
			);
		}
		if (action === "addBoost") {
			const slots = await getGuildBoostSlots(req.user_id);
			const available = slots.find(
				(slot) => !slot.premium_guild_subscription && !slot.canceled,
			);
			if (!available)
				throw new HTTPError(
					"You do not have an available boost slot",
					400,
				);
			await applyGuildBoosts(req.user_id, guild.id, [available.id]);
			return res.json(
				await Guild.findOneOrFail({ where: { id: guild.id } }),
			);
		}
		if (action === "removeBoost") {
			const boost = (await getUserGuildBoosts(req.user_id)).find(
				(item) => item.guild_id === guild.id,
			);
			if (!boost)
				throw new HTTPError("You have not boosted this server", 400);
			await removeGuildBoost(req.user_id, guild.id, boost.id);
			return res.json(
				await Guild.findOneOrFail({ where: { id: guild.id } }),
			);
		}
		const features = new Set(guild.features || []);
		switch (action) {
			case "partner":
				features.add("PARTNERED");
				break;
			case "unpartner":
				features.delete("PARTNERED");
				break;
			case "verify":
				features.add("VERIFIED");
				break;
			case "unverify":
				features.delete("VERIFIED");
				break;
			case "enableCommunity":
				await enableCommunityServer(guild);
				features.add("COMMUNITY");
				break;
			case "disableCommunity":
				disableCommunityServer(guild);
				features.delete("COMMUNITY");
				features.delete("DISCOVERABLE");
				break;
			default:
				throw new HTTPError("Unknown server badge action", 400);
		}

		guild.features = [...features];
		await guild.save();
		await Promise.all([
			syncPartnerOwnerBadge(guild.owner_id),
			emitEvent({
				event: "GUILD_UPDATE",
				guild_id: guild.id,
				data: guild,
			} as GuildUpdateEvent),
		]);
		return res.json({
			id: guild.id,
			name: guild.name,
			features: guild.features,
		});
	},
);

export default router;
