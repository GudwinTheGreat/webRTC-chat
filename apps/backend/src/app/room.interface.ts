export interface Room {
  initiator: string;
  peers: Set<string>;
  iceServers: RTCIceServer[];
  createdAt: Date;
  lastActivity: Date;
  timeoutId?: NodeJS.Timeout;
}