import { io, Socket } from "socket.io-client";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class SocketService {
    public socket: Socket;

    constructor() {
        this.socket = io(`${window.location.protocol}//${window.location.hostname}:443`);
    }
}