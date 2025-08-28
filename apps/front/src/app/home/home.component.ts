import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WebRTCService } from '../services/webrtc.service';
import { FormsModule } from '@angular/forms';

document.addEventListener('DOMContentLoaded', function() {
    const themeSwitch = <HTMLInputElement> document.getElementById('theme-switch');
    const themeText = <HTMLSpanElement> document.querySelector('.theme-text');
    const body = document.body;
    
    updateThemeText();
    

    themeSwitch.addEventListener('change', function() {
        if (this.checked) {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
        }
        updateThemeText();
    });
    
    function updateThemeText() {
        if (body.classList.contains('theme-dark')) {
            themeText.textContent = 'Светлая тема';
        } else {
            themeText.textContent = 'Тёмная тема';
        }
    }
});

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
    localStorage.setItem("role", "callee");
  }

  get isServrsEmpty() {
    return this.servers.length === 0
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