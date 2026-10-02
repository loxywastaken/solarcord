import { Channel, ChannelType, Guild } from "@solarcord/util";

async function resolveCommunityChannel(
	guildId: string,
	requestedId: string | null | undefined,
	name: string,
	topic: string,
) {
	if (requestedId && requestedId !== "1") {
		const requested = await Channel.findOne({
			where: { id: requestedId, guild_id: guildId },
		});
		if (requested && requested.type === ChannelType.GUILD_TEXT)
			return requested.id;
	}

	const existing = await Channel.findOne({
		where: { guild_id: guildId, name, type: ChannelType.GUILD_TEXT },
	});
	if (existing) return existing.id;

	const channel = await Channel.createChannel(
		{
			guild_id: guildId,
			name,
			topic,
			type: ChannelType.GUILD_TEXT,
			nsfw: false,
		},
		"0",
		{ skipPermissionCheck: true },
	);
	return channel.id!;
}

export async function enableCommunityServer(
	guild: Guild,
	rulesChannelId?: string | null,
	updatesChannelId?: string | null,
) {
	const [rules, updates] = await Promise.all([
		resolveCommunityChannel(
			guild.id,
			rulesChannelId || guild.rules_channel_id,
			"rules",
			"Read the Solarcord server rules before participating.",
		),
		resolveCommunityChannel(
			guild.id,
			updatesChannelId || guild.public_updates_channel_id,
			"community-updates",
			"Important updates from this server's moderation team.",
		),
	]);

	const features = new Set(guild.features || []);
	features.add("COMMUNITY");
	guild.features = [...features];
	guild.rules_channel_id = rules;
	guild.public_updates_channel_id = updates;
	guild.verification_level = Math.max(guild.verification_level || 0, 1);
	guild.explicit_content_filter = Math.max(
		guild.explicit_content_filter || 0,
		2,
	);
	guild.default_message_notifications = 1;
	return guild;
}

export function disableCommunityServer(guild: Guild) {
	guild.features = (guild.features || []).filter(
		(feature) =>
			feature !== "COMMUNITY" && feature !== "DISCOVERABLE",
	);
	return guild;
}
