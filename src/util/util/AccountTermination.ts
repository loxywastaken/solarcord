export interface AccountTermination {
	at: string;
	by: string;
	reason: string;
}

interface SolarcordAccountSettings {
	solarcord_terminated?: AccountTermination;
	[key: string]: unknown;
}

function parseExtendedSettings(value?: string): SolarcordAccountSettings {
	try {
		const parsed = JSON.parse(value || "{}");
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export function getAccountTermination(value?: string) {
	return parseExtendedSettings(value).solarcord_terminated || null;
}

export function isAccountTerminated(value?: string) {
	return Boolean(getAccountTermination(value));
}

export function setAccountTermination(
	value: string | undefined,
	termination: AccountTermination | null,
) {
	const settings = parseExtendedSettings(value);
	if (termination) settings.solarcord_terminated = termination;
	else delete settings.solarcord_terminated;
	return JSON.stringify(settings);
}
