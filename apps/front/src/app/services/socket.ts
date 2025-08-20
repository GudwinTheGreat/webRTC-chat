import { io, Socket } from "socket.io-client";
import { environment } from "../../environments/environment";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class SocketService {
    public socket: Socket;

    constructor() {
        this.socket = io(environment.apiUrl);
    }
}