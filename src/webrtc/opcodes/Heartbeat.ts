import {
	CLOSECODES,
	Payload,
	Send,
	setHeartbeat,
	WebSocket,
} from "@solarcord/gateway";
import { VoiceOPCodes } from "../util";

export async function onHeartbeat(this: WebSocket, data: Payload) {
	setHeartbeat(this);
	if (isNaN(data.d)) return this.close(CLOSECODES.Decode_error);

	await Send(this, { op: VoiceOPCodes.HEARTBEAT_ACK, d: data.d });
}
