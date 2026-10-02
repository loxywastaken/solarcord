import { GuildCreateSchema } from "@solarcord/util";

export interface GuildUpdateSchema
	extends Omit<
		GuildCreateSchema,
		"channels" | "name" | "rules_channel_id" | "system_channel_id"
	> {
	name?: string;
	banner?: string | null;
	splash?: string | null;
	description?: string;
	features?: string[];
	verification_level?: number;
	default_message_notifications?: number;
	system_channel_flags?: number;
	explicit_content_filter?: number;
	public_updates_channel_id?: string | null;
	rules_channel_id?: string | null;
	afk_timeout?: number;
	afk_channel_id?: string | null;
	system_channel_id?: string | null;
	preferred_locale?: string;
	premium_progress_bar_enabled?: boolean;
	discovery_splash?: string;
	widget_enabled?: boolean;
	widget_channel_id?: string | null;
	nsfw_level?: number;
}
