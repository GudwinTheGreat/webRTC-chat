import { io, Socket } from "socket.io-client";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class SocketService {
    public socket: Socket;

    constructor() {
        const isDev = window.location.hostname === 'localhost';
        const url = isDev ? 'http://localhost:3000' : `wss://${window.location.hostname}`
        this.socket = io(url);
    }
}