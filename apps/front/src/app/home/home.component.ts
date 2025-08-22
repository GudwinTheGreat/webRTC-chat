import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WebRTCService } from '../services/webrtc.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [FormsModule]
})
export class HomeComponent {
  iceServersInput = 'stun:stun.l.google.com:19302';
  username = ''
  credential = ''
  password = ''
  isLoading = false;
  public servers: RTCIceServer[] = []

  constructor(
    private webrtcService: WebRTCService,
    private router: Router
  ) { }

  ngOnInit() {
    this.debug();
    localStorage.setItem("role", "callee");
  }

  get isServrsEmpty() {
    return this.servers.length === 0
  }

  private debug() {
    this.servers.push({
      "urls": "turn:git.demetrix.ru:3478",
      "credential": "passowrd",
      "username": "test",
      //@ts-ignore
      "password": "test"
    })
  }

  addServer() {
    const server: RTCIceServer = {
      urls: this.iceServersInput,
      credential: this.credential ?? undefined,
      username: this.username ?? undefined,
      //@ts-ignore
      password: this.password ?? undefined
    }
    this.servers.push(server);
  }

  async proceed() {
    this.isLoading = true;

    try {
      this.webrtcService.role = 'caller';
      localStorage.setItem("role", "caller");

      const iceServers = this.servers;
      const roomId = await this.webrtcService.createRoom(iceServers);

      this.router.navigate([roomId]);
    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to initialize video call');
    } finally {
      this.isLoading = false;
    }
  }
}