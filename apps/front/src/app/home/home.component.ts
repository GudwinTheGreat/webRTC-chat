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
  isLoading = false;

  constructor(
    private webrtcService: WebRTCService,
    private router: Router
  ) { }

  async proceed() {
    this.isLoading = true;

    try {
      this.webrtcService.role = 'caller';
      const iceServers = this.parseIceServers();
      const roomId = await this.webrtcService.createRoom(iceServers);

      this.router.navigate([roomId]);
    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to initialize video call');
    } finally {
      this.isLoading = false;
    }
  }

  private parseIceServers(): RTCIceServer[] {
    return this.iceServersInput.split(',').map(server => {
      const [adress, credentials] = server?.trim()?.split('|');
      console.log('adress', adress, credentials)
      const [type, url, port] = adress?.trim()?.split(':');
      console.log('type', type, url, port)
      const [username, credential] = credentials ? credentials?.trim().split('@') : ['', '']
      console.log(username, credential)
      return {
        urls: `${type}:${url}:${port}`,
        username: username || undefined,
        credential: credential || undefined
      };
    });
  }
}