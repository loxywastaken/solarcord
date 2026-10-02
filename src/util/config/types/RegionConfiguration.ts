import { Region } from ".";

export class RegionConfiguration {
	default: string = "solarcord";
	useDefaultAsOptimal: boolean = true;
	available: Region[] = [
		{
			id: "solarcord",
			name: "Solarcord",
			endpoint: "127.0.0.1:3004",
			vip: false,
			custom: false,
			deprecated: false,
		},
	];
}
