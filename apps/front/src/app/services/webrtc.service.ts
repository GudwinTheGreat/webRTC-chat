import { Injectable, EventEmitter } from '@angular/core';
import { SocketService } from './socket';

@Injectable({ providedIn: 'root' })
export class WebRTCService {
  public role: 'caller' | 'callee' = 'callee';
  public peerConnection!: RTCPeerConnection;
  public localStream!: MediaStream;
  public remoteStream: MediaStream;
  public onTrackAdded = new EventEmitter<MediaStreamTrack>();

  private iceCandidateBuffer: RTCIceCandidate[] = [];

  constructor(private socketService: SocketService) {
    this.remoteStream = new MediaStream();
  }

  async init(iceServers?: RTCIceServer[]) {
    console.warn('Role:', this.role);
    if (this.peerConnection) {
      this.cleanup();
    }


    this.peerConnection = new RTCPeerConnection({ iceServers });

    this.setupWebRtcEvents();

    this.removeSocketEvents();
    this.setupSocketEvents();
    if (this.role === 'caller') {
      (await this.getMediaStream()).getTracks().forEach(track => {
        console.log('add media track', track);
        this.peerConnection.addTrack(track);
      });
    } else {
      (await this.getMediaStream())
    }
  }

  private async createAndSendOffer() {
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      console.log('Created offer SDP:', offer.sdp);
      await this.peerConnection.setLocalDescription(offer);
      this.socketService.socket.emit('relay-offer', {
        offer,
        roomId: this.getRoomId()
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  private removeSocketEvents() {
    this.socketService.socket.off('offer');
    this.socketService.socket.off('answer');
    this.socketService.socket.off('ice-candidate');
    this.socketService.socket.off('new-peer');
  }

  setupSocketEvents() {
    this.socketService.socket.on('offer', async (offer) => {
      console.log('handle event offer', offer);
      try {
        if (this.role === 'callee') {
          (await this.getMediaStream()).getTracks().forEach(track => {
            console.log('add media track', track);
            this.peerConnection.addTrack(track);
          });
        }
        await this.peerConnection.setRemoteDescription(offer);


        const answer = await this.peerConnection.createAnswer();
        console.log('Created answer SDP:', answer.sdp);
        await this.peerConnection.setLocalDescription(answer);

        this.socketService.socket.emit('relay-answer', {
          answer,
          roomId: this.getRoomId()
        });
        await this.processIceCandidateBuffer();
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    this.socketService.socket.on('answer', async (answer) => {
      console.log('handle event answer', answer);
      try {
        await this.peerConnection.setRemoteDescription(answer);
        await this.processIceCandidateBuffer();
        console.log('After setting remote description - signaling state:',
          this.peerConnection.signalingState);
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    });

    this.socketService.socket.on('ice-candidate', async (candidate) => {
      if (candidate) {
        try {
          if (this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            this.iceCandidateBuffer.push(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    });

    this.socketService.socket.on('new-peer', async (response: { success: boolean, iceServers: RTCIceServer[] }) => {
      if (this.role === 'caller') {
        await this.createAndSendOffer();
      }
    });
  }

  private async processIceCandidateBuffer() {
    for (const candidate of this.iceCandidateBuffer) {
      try {
        await this.peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error adding buffered ICE candidate:', error);
      }
    }
    this.iceCandidateBuffer = [];
  }

  setupWebRtcEvents() {
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'failed') {
        this.cleanup();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection.iceConnectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state:', this.peerConnection.signalingState);
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.peerConnection.iceGatheringState);
    };

    this.peerConnection.onnegotiationneeded = async () => {
      console.log('Negotiation needed');
      if (this.role === 'caller') {
        await this.createAndSendOffer();
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Track received - kind:', event.track.kind);
      console.log('Track settings:', event.track.getSettings());
      this.remoteStream.addTrack(event.track);
      this.onTrackAdded.emit(event.track);
    };

    this.peerConnection.onicecandidate = (event) => {
      console.log('ICE Candidate generated:', event.candidate);
      if (event.candidate) {
        this.sendIceCandidate(event.candidate);
      }
    };
  }

  async getMediaStream(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    return this.localStream;
  }

  createRoom(iceServers: RTCIceServer[]): Promise<string> {
    return new Promise((resolve) => {
      this.socketService.socket.emit('create-room', iceServers, (response: { roomId: string }) => {
        resolve(response.roomId);
      });
    });
  }

  joinRoom(roomId: string): Promise<{
    success: boolean;
    iceServers?: RTCIceServer[]
  }> {
    return new Promise((resolve) => {
      this.socketService.socket.emit('join-room', roomId, (response: {
        success: boolean;
        iceServers?: RTCIceServer[]
      }) => {
        resolve(response);
      });
    });
  }

  private sendIceCandidate(candidate: RTCIceCandidate) {
    console.log('sending candidate', candidate);
    this.socketService.socket.emit('relay-ice', {
      candidate,
      roomId: this.getRoomId()
    });
  }

  private getRoomId(): string {
    return window.location.pathname.split('/')[1];
  }

  cleanup() {
    if (this.peerConnection) {
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      this.peerConnection.onicegatheringstatechange = null;
      this.peerConnection.onnegotiationneeded = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.close();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    // Очистите remoteStream
    this.remoteStream.getTracks().forEach(track => track.stop());
    this.remoteStream = new MediaStream();

    // Очистите буфер кандидатов
    this.iceCandidateBuffer = [];

    this.socketService.socket.disconnect();
  }
}