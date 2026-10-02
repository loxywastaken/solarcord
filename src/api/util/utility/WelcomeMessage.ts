import {
	Channel,
	DmChannelDTO,
	emitEvent,
	User,
	UserFlags,
	UserSettings,
} from "@solarcord/util";
import { sendMessage } from "../handlers/Message";

export async function ensureSolarcordSystemUser() {
	const officialFlags =
		UserFlags.FLAGS.SYSTEM | UserFlags.FLAGS.VERIFIED_BOT;
	let bot = await User.findOne({
		where: { username: "Solarcord" },
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
		],
	});
	if (bot) {
		bot.avatar = "solarcord";
		bot.bot = true;
		bot.system = true;
		bot.flags = (BigInt(bot.flags || "0") | officialFlags).toString();
		bot.public_flags = Number(
			BigInt(bot.public_flags || 0) | officialFlags,
		);
		bot.verified = true;
		bot.rights = "1";
		bot.bio = "Official Solarcord welcome account";
		return bot.save();
	}

	const settings = await UserSettings.create({ locale: "en-US" }).save();
	bot = User.create({
		username: "Solarcord",
		discriminator: "0001",
		avatar: "solarcord",
		bot: true,
		system: true,
		verified: true,
		premium: true,
		premium_type: 2,
		flags: officialFlags.toString(),
		public_flags: Number(officialFlags),
		rights: "1",
		bio: "Official Solarcord welcome account",
		data: { valid_tokens_since: new Date() },
		fingerprints: [],
		extended_settings: "{}",
		settings,
	});
	return bot.save();
}

export async function sendSolarcordWelcome(user: User) {
	const bot = await ensureSolarcordSystemUser();
	const channelDto = await Channel.createDMChannel([user.id], bot.id);
	const channel = await Channel.findOneOrFail({
		where: { id: channelDto.id },
		relations: ["recipients", "recipients.user"],
	});
	const recipient = channel.recipients?.find(
		(item) => item.user_id === user.id,
	);
	if (recipient?.closed) {
		recipient.closed = false;
		await recipient.save();
		await emitEvent({
			event: "CHANNEL_CREATE",
			user_id: user.id,
			data: (await DmChannelDTO.from(channel)).excludedRecipients([
				user.id,
			]),
		});
	}

	const message = await sendMessage({
		channel_id: channel.id,
		author_id: bot.id,
		content: `Welcome to Solarcord, **${user.username}**! 👋\n\nThis is an official message from the Solarcord team. Your account is ready—you can create a server, join one with an invite, and start chatting straight away.\n\nSolarcord staff will never ask for your password or account token.`,
	});
	channel.last_message_id = message.id;
	await channel.save();

	return message;
}
