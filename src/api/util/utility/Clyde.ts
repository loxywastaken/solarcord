import {
	Channel,
	Guild,
	Member,
	Message,
	User,
	UserFlags,
	UserSettings,
} from "@solarcord/util";
import { sendMessage } from "../handlers/Message";

let clydeId: string | undefined;

export async function getClydeUser() {
	let clyde = await User.findOne({
		where: { username: "Clyde", bot: true },
		select: [
			"id",
			"username",
			"discriminator",
			"avatar",
			"bot",
			"system",
			"flags",
			"public_flags",
			"verified",
			"rights",
			"bio",
		],
	});
	const flags = UserFlags.FLAGS.VERIFIED_BOT;
	if (!clyde) {
		const settings = await UserSettings.create({ locale: "en-US" }).save();
		clyde = await User.create({
			username: "Clyde",
			discriminator: "0001",
			avatar: "solarcord",
			bot: true,
			system: false,
			verified: true,
			premium: true,
			premium_type: 2,
			flags: flags.toString(),
			public_flags: Number(flags),
			rights: "1",
			bio: "Solarcord's built-in helper bot",
			data: { valid_tokens_since: new Date() },
			fingerprints: [],
			extended_settings: "{}",
			settings,
		}).save();
	} else {
		clyde.avatar = "solarcord";
		clyde.bot = true;
		clyde.system = false;
		clyde.bio = "Solarcord's built-in helper bot";
		clyde.flags = (BigInt(clyde.flags || "0") | flags).toString();
		clyde.public_flags = Number(BigInt(clyde.public_flags || 0) | flags);
		clyde.verified = true;
		clyde.rights = "1";
		await clyde.save();
	}
	clydeId = clyde.id;
	return clyde;
}

export async function ensureClydeInGuild(guildId: string) {
	const clyde = await getClydeUser();
	const exists = await Member.findOne({
		where: { id: clyde.id, guild_id: guildId },
	});
	if (!exists) await Member.addToGuild(clyde.id, guildId);
	return clyde;
}

export async function initClyde() {
	const clyde = await getClydeUser();
	const guilds = await Guild.find({ select: ["id"] });
	for (const guild of guilds) await ensureClydeInGuild(guild.id);
	return clyde;
}

export async function handleClydeMessage(message: Message) {
	if (!message.content || message.author?.bot) return;
	const clyde = clydeId
		? await User.findOne({ where: { id: clydeId } })
		: await getClydeUser();
	if (!clyde) return;

	const channel = await Channel.findOne({
		where: { id: message.channel_id },
		relations: ["recipients"],
	});
	if (!channel) return;
	const directMessage =
		channel.isDm() &&
		!!channel.recipients?.some(
			(recipient) => recipient.user_id === clyde.id,
		);
	const called = new RegExp(`<@!?${clyde.id}>|^clyde\\b`, "i").test(
		message.content,
	);
	if (!directMessage && !called) return;

	const command = message.content
		.replace(new RegExp(`<@!?${clyde.id}>`, "g"), "")
		.replace(/^clyde\b/i, "")
		.trim()
		.toLowerCase();
	const commandName = command.split(/\s+/)[0] || "help";
	let content =
		"Hey! I'm Clyde, Solarcord's built-in helper. Try `Clyde help` to see every command.";
	if (commandName === "help" || commandName === "commands")
		content =
			"**Solarcord Clyde commands**\n`Clyde ping` — check that I am online\n`Clyde status` — server health and uptime\n`Clyde server` — server overview\n`Clyde boosts` — boost tier progress\n`Clyde members` — member count\n`Clyde channels` — channel count\n`Clyde badges` — Partnered, Verified and Community status\n`Clyde rules` — find the rules channel\n`Clyde theme` — open the theme picker\n`Clyde about` — learn about Solarcord";
	else if (commandName === "ping")
		content = "Pong! 🏓 Solarcord is online and Clyde is responding.";
	else if (commandName === "status")
		content = `✅ All Solarcord systems are online. Clyde uptime: ${Math.floor(
			process.uptime() / 60,
		)} minute(s).`;
	else if (commandName === "theme" || commandName === "themes")
		content =
			"Use the ✨ theme button in the client to choose Midnight, Aurora, Sunset, Cotton Candy, Galaxy, or Mint. Your choice is saved on this device.";
	else if (commandName === "about")
		content =
			"Solarcord is your private Discord-style community. I'm Clyde, the built-in verified helper bot.";
	else if (
		channel.guild_id &&
		(commandName === "boost" || commandName === "boosts")
	) {
		const guild = await Guild.findOneOrFail({
			where: { id: channel.guild_id },
		});
		const boosts = guild.premium_subscription_count || 0;
		const tier = guild.premium_tier || 0;
		const next = [2, 7, 14, 14][tier];
		content =
			tier === 3
				? `🚀 **${guild.name}** has ${boosts} boost(s) and is at the maximum Boost Tier 3.`
				: `🚀 **${
						guild.name
				  }** has ${boosts} boost(s) and is Boost Tier ${tier}. ${Math.max(
						0,
						next - boosts,
				  )} more boost(s) unlock Tier ${tier + 1}.`;
	} else if (
		channel.guild_id &&
		(commandName === "rule" || commandName === "rules")
	) {
		const guild = await Guild.findOneOrFail({
			where: { id: channel.guild_id },
		});
		content = guild.rules_channel_id
			? `You can read this server's rules in <#${guild.rules_channel_id}>.`
			: "This server has not configured a rules channel yet.";
	} else if (channel.guild_id && commandName === "members") {
		const guild = await Guild.findOneOrFail({
			where: { id: channel.guild_id },
		});
		content = `👥 **${guild.name}** currently has ${
			guild.member_count || 0
		} member(s), including bots.`;
	} else if (channel.guild_id && commandName === "channels") {
		const count = await Channel.count({
			where: { guild_id: channel.guild_id },
		});
		content = `#️⃣ This server currently has ${count} channel(s).`;
	} else if (channel.guild_id && commandName === "badges") {
		const guild = await Guild.findOneOrFail({
			where: { id: channel.guild_id },
		});
		const badges = [
			"PARTNERED",
			"VERIFIED",
			"COMMUNITY",
			"DISCOVERABLE",
		].filter((feature) => guild.features?.includes(feature));
		content = badges.length
			? `🏅 **${guild.name}** has: ${badges
					.map((badge) => `**${badge}**`)
					.join(", ")}.`
			: "This server does not have any programme badges yet.";
	} else if (
		channel.guild_id &&
		(commandName === "server" || commandName === "community")
	) {
		const guild = await Guild.findOneOrFail({
			where: { id: channel.guild_id },
		});
		content = `${guild.name} currently has ${
			guild.member_count || 0
		} member(s), ${guild.premium_subscription_count || 0} boost(s), and ${
			guild.features?.includes("COMMUNITY")
				? "Community is enabled"
				: "Community is disabled"
		}.`;
	} else if (
		!channel.guild_id &&
		[
			"server",
			"community",
			"boost",
			"boosts",
			"rules",
			"members",
			"channels",
			"badges",
		].includes(commandName)
	) {
		content =
			"Run that command inside a server so I know which server you mean.";
	}

	if (channel.guild_id) await ensureClydeInGuild(channel.guild_id);
	const response = await sendMessage({
		channel_id: channel.id,
		author_id: clyde.id,
		content,
	});
	await Channel.update({ id: channel.id }, { last_message_id: response.id });
}
