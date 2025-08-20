import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WebRTCService } from '../services/webrtc.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-call-room',
  templateUrl: './call-room.component.html',
  styleUrls: ['./call-room.component.scss'],
  imports: [NgIf]
})
export class CallRoomComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  roomId: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private webrtcService: WebRTCService
  ) { }

  ngAfterViewInit() {
    // Перенесем отключение аудио сюда
    setTimeout(() => {
      if (this.localVideo?.nativeElement?.srcObject) {
        const stream = this.localVideo.nativeElement.srcObject as MediaStream;
        stream.getAudioTracks().forEach(track => track.enabled = false);
      }
    }, 1000);
  }

  async ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id');

    if (!this.roomId) {
      this.router.navigate(['/']);
      return;
    }

    try {
      const joinResponse = await this.webrtcService.joinRoom(this.roomId);

      if (!joinResponse.success) {
        this.errorMessage = `Room ${this.roomId} not available`;
        return;
      }

      console.log('joinResponse.iceServers', joinResponse.iceServers)
      // Инициализируем сервис с ICE-серверами с сервера
      await this.webrtcService.init(joinResponse.iceServers);

      await this.initializeStreams();
      this.setupEventHandlers();
    } catch (error) {
      console.error('Call setup error:', error);
      this.errorMessage = 'Failed to join the call';
    }
  }

  private async initializeStreams() {
    const localStream = this.webrtcService.localStream;
    const remoteStream = this.webrtcService.remoteStream;

    if (localStream) {
      this.localVideo.nativeElement.srcObject = localStream;
    }

    this.remoteVideo.nativeElement.srcObject = remoteStream;
  }

  private setupEventHandlers() {
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private cleanup() {
    this.webrtcService.cleanup();
  }
}