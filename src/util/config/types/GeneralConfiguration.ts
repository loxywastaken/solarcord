import { Snowflake } from "@solarcord/util";

export class GeneralConfiguration {
	instanceName: string = "Solarcord";
	instanceDescription: string | null =
		"A private Solarcord community owned by zxme.";
	frontPage: string | null = null;
	tosPage: string | null = null;
	correspondenceEmail: string | null = null;
	correspondenceUserID: string | null = null;
	image: string | null = "/assets/solarcord-logo.png";
	instanceId: string = Snowflake.generate();
}
