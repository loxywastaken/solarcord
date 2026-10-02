import {
	emitEvent,
	Guild,
	GuildMemberUpdateEvent,
	GuildUpdateEvent,
	Member,
	Message,
	MessageCreateEvent,
	MessageType,
	Rights,
	User,
} from "@solarcord/util";
import { HTTPError } from "lambert-server";

interface StoredGuildBoost {
	id: string;
	slot_id: string;
	guild_id: string;
	started_at: string;
	canceled?: boolean;
	ends_at?: string | null;
}

interface SolarcordExtendedSettings {
	solarcord_boosts?: StoredGuildBoost[];
	[key: string]: unknown;
}

function parseSettings(value?: string): SolarcordExtendedSettings {
	try {
		const parsed = JSON.parse(value || "{}");
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

function slotId(userId: string, index: number) {
	return (BigInt(userId) + BigInt(index + 1)).toString();
}

function boostId(userId: string, index: number) {
	return (BigInt(userId) + BigInt(index + 101)).toString();
}

export const BOOST_TIER_REQUIREMENTS = [0, 2, 7, 14] as const;

function slotCount(user: Pick<User, "premium" | "premium_type" | "rights">) {
	if ((BigInt(user.rights || "0") & Rights.FLAGS.OPERATOR) !== BigInt(0))
		return BOOST_TIER_REQUIREMENTS[3];
	if (!user.premium || user.premium_type <= 0) return 0;
	return user.premium_type >= 2 ? 2 : 1;
}

async function loadBoostUser(userId: string) {
	return User.findOneOrFail({
		where: { id: userId },
		select: [
			"id",
			"premium",
			"premium_type",
			"rights",
			"extended_settings",
		],
	});
}

function readBoosts(user: Pick<User, "extended_settings">) {
	const settings = parseSettings(user.extended_settings);
	return {
		settings,
		boosts: Array.isArray(settings.solarcord_boosts)
			? settings.solarcord_boosts
			: [],
	};
}

async function saveBoosts(
	userId: string,
	settings: SolarcordExtendedSettings,
	boosts: StoredGuildBoost[],
) {
	settings.solarcord_boosts = boosts;
	await User.update(
		{ id: userId },
		{ extended_settings: JSON.stringify(settings) },
	);
}

function publicBoost(boost: StoredGuildBoost, userId: string) {
	return {
		id: boost.id,
		guild_id: boost.guild_id,
		user_id: userId,
		ended: false,
		ends_at: boost.ends_at || null,
	};
}

async function allStoredBoosts() {
	const users = await User.find({ select: ["id", "extended_settings"] });
	return users.flatMap((user) =>
		readBoosts(user).boosts.map((boost) => ({ boost, user_id: user.id })),
	);
}

function tierForCount(count: number) {
	if (count >= BOOST_TIER_REQUIREMENTS[3]) return 3;
	if (count >= BOOST_TIER_REQUIREMENTS[2]) return 2;
	if (count >= BOOST_TIER_REQUIREMENTS[1]) return 1;
	return 0;
}

async function emitMemberUpdate(userId: string, guildId: string) {
	const member = await Member.findOne({
		where: { id: userId, guild_id: guildId },
		relations: ["user", "roles"],
	});
	if (!member) return;

	await emitEvent({
		event: "GUILD_MEMBER_UPDATE",
		guild_id: guildId,
		data: {
			guild_id: guildId,
			user: member.user,
			nick: member.nick,
			roles: member.roles.map((role) => role.id),
			premium_since: member.premium_since,
		},
	} as GuildMemberUpdateEvent);
}

async function recalculateGuild(guildId: string) {
	const guild = await Guild.findOneOrFail({ where: { id: guildId } });
	const count = (await allStoredBoosts()).filter(
		({ boost }) => boost.guild_id === guildId,
	).length;

	guild.premium_subscription_count = count;
	guild.premium_tier = tierForCount(count);
	await guild.save();
	await emitEvent({
		event: "GUILD_UPDATE",
		guild_id: guild.id,
		data: guild,
	} as GuildUpdateEvent);
	return guild;
}

async function createBoostMessage(userId: string, guild: Guild) {
	if (!guild.system_channel_id) return;
	const user = await User.getPublicUser(userId);
	const message = Message.create({
		type: MessageType.USER_PREMIUM_GUILD_SUBSCRIPTION,
		guild_id: guild.id,
		channel_id: guild.system_channel_id,
		author: user,
		author_id: user.id,
		timestamp: new Date(),
		reactions: [],
		attachments: [],
		embeds: [],
		sticker_items: [],
	});
	await message.save();
	await emitEvent({
		event: "MESSAGE_CREATE",
		channel_id: message.channel_id,
		data: message,
	} as MessageCreateEvent);
}

export async function getGuildBoostSlots(userId: string) {
	const user = await loadBoostUser(userId);
	const { boosts } = readBoosts(user);
	return Array.from({ length: slotCount(user) }, (_, index) => {
		const id = slotId(user.id, index);
		const boost = boosts.find((item) => item.slot_id === id);
		return {
			id,
			subscription_id: user.id,
			premium_guild_subscription: boost
				? { id: boost.id, guild_id: boost.guild_id }
				: null,
			canceled: boost?.canceled || false,
			cooldown_ends_at: null,
		};
	});
}

export async function getUserGuildBoosts(userId: string) {
	const user = await loadBoostUser(userId);
	return readBoosts(user).boosts.map((boost) => publicBoost(boost, userId));
}

export async function getGuildBoosts(guildId: string) {
	const boosts = (await allStoredBoosts()).filter(
		({ boost }) => boost.guild_id === guildId,
	);
	return Promise.all(
		boosts.map(async ({ boost, user_id }) => {
			const user = await User.getPublicUser(user_id);
			return {
				...publicBoost(boost, user_id),
				user: user.toPublicUser(),
			};
		}),
	);
}

export async function applyGuildBoosts(
	userId: string,
	guildId: string,
	requestedSlotIds: string[],
) {
	if (!Array.isArray(requestedSlotIds) || requestedSlotIds.length === 0)
		throw new HTTPError("Choose at least one boost slot", 400);

	await Promise.all([
		Guild.findOneOrFail({ where: { id: guildId } }),
		Member.IsInGuildOrFail(userId, guildId),
	]);
	const user = await loadBoostUser(userId);
	const { settings, boosts } = readBoosts(user);
	const validSlots = Array.from({ length: slotCount(user) }, (_, index) =>
		slotId(user.id, index),
	);
	const added: StoredGuildBoost[] = [];

	for (const requested of [...new Set(requestedSlotIds)]) {
		if (!validSlots.includes(requested))
			throw new HTTPError("That boost slot is not available", 400);
		const current = boosts.find((boost) => boost.slot_id === requested);
		if (current) {
			if (current.guild_id !== guildId)
				throw new HTTPError("That boost slot is already assigned", 400);
			added.push(current);
			continue;
		}
		const index = validSlots.indexOf(requested);
		const boost: StoredGuildBoost = {
			id: boostId(user.id, index),
			slot_id: requested,
			guild_id: guildId,
			started_at: new Date().toISOString(),
			canceled: false,
			ends_at: null,
		};
		boosts.push(boost);
		added.push(boost);
	}

	await saveBoosts(user.id, settings, boosts);
	const firstBoost = boosts
		.filter((boost) => boost.guild_id === guildId)
		.map((boost) => Date.parse(boost.started_at))
		.sort((a, b) => a - b)[0];
	await Member.update(
		{ id: userId, guild_id: guildId },
		{ premium_since: firstBoost },
	);
	const guild = await recalculateGuild(guildId);
	await Promise.all([
		emitMemberUpdate(userId, guildId),
		...added.map(() => createBoostMessage(userId, guild)),
	]);
	return added.map((boost) => publicBoost(boost, userId));
}

export async function removeGuildBoost(
	userId: string,
	guildId: string,
	boostIdToRemove: string,
) {
	const user = await loadBoostUser(userId);
	const { settings, boosts } = readBoosts(user);
	const existing = boosts.find(
		(boost) => boost.id === boostIdToRemove && boost.guild_id === guildId,
	);
	if (!existing) throw new HTTPError("Boost not found", 404);

	const remaining = boosts.filter((boost) => boost !== existing);
	await saveBoosts(user.id, settings, remaining);
	const remainingForGuild = remaining.filter(
		(boost) => boost.guild_id === guildId,
	);
	await Member.update(
		{ id: userId, guild_id: guildId },
		{
			premium_since: remainingForGuild.length
				? Math.min(
						...remainingForGuild.map((boost) =>
							Date.parse(boost.started_at),
						),
				  )
				: (null as unknown as number),
		},
	);
	await recalculateGuild(guildId);
	await emitMemberUpdate(userId, guildId);
}

export async function setGuildBoostSlotCanceled(
	userId: string,
	slotIdToUpdate: string,
	canceled: boolean,
) {
	const user = await loadBoostUser(userId);
	const { settings, boosts } = readBoosts(user);
	const validSlots = await getGuildBoostSlots(userId);
	if (!validSlots.some((slot) => slot.id === slotIdToUpdate))
		throw new HTTPError("Boost slot not found", 404);
	const boost = boosts.find((item) => item.slot_id === slotIdToUpdate);
	if (boost) {
		boost.canceled = canceled;
		boost.ends_at = canceled
			? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
			: null;
		await saveBoosts(user.id, settings, boosts);
	}
	return (await getGuildBoostSlots(userId)).find(
		(slot) => slot.id === slotIdToUpdate,
	);
}
