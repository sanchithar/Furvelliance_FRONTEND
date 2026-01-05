import io from "socket.io-client";

class WebRTCService {
    constructor() {
        this.socket = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.roomId = null;
        this.stationType = null;
        this.userId = null;
        this.onRemoteStream = null;
        this.onConnectionStateChange = null;
        this.targetSocketId = null;
        this.isInitiator = false;
        
        // Optimized config for localhost testing
        this.config = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ],
        };
    }

    initialize(serverUrl, userId, roomId, stationType){
        this.userId = userId;
        this.roomId = roomId;
        this.stationType = stationType;

        this.socket = io(serverUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        this.setupSocketListeners();
        return this;
    }

    setupSocketListeners(){
        this.socket.on('connect', () => {
            console.log(`Socket connected: ${this.socket.id}`);
            this.joinRoom();
        });
        
        this.socket.on('user-joined', (data) => {
            console.log('User joined:', data.userId, 'as', data.stationType);
            
            // Only initiate connection if it's a different station type
            if (data.stationType !== this.stationType) {
                console.log(`Remote ${data.stationType} station is ready`);
                
                // Check if we have local stream and should initiate
                this.checkAndInitiateConnection();
            }
        });

        this.socket.on('offer', async (data) => {
            console.log(`📨 ${this.stationType} station received offer from:`, data.senderId);
            await this.handleOffer(data.offer, data.senderId);
        });

        this.socket.on('answer', async (data) => {
            console.log(`📨 ${this.stationType} station received answer`);
            await this.handleAnswer(data.answer);
        });
        
        this.socket.on('ice-candidate', async (data) => {
            console.log(`📨 ${this.stationType} station received ICE candidate`);
            await this.handleIceCandidate(data.candidate);
        });
        
        this.socket.on('user-left', ({ stationType }) => {
            console.log(`👋 User left: ${stationType}`);
            this.handleUserLeft();
        });
        
        this.socket.on('disconnect', () => {
            console.log(`🔌 ${this.stationType} station socket disconnected`);
        });
    }

    checkAndInitiateConnection() {
        // Only dog station initiates, and only when it has local stream
        if (this.stationType === 'dog' && this.localStream) {
            // If we don't have a peer connection yet, or if we have one but it's not connected
            if (!this.peerConnection || this.peerConnection.connectionState === 'new' || this.peerConnection.connectionState === 'disconnected') {
                console.log('🚀 dog station: Both conditions met - initiating connection');
                console.log('🐕 Dog station creating offer...');
                setTimeout(() => this.createOffer(), 500); // Small delay for stability
            } else {
                console.log(`⏳ dog station has peer connection in state: ${this.peerConnection.connectionState}`);
            }
        } else {
            console.log(`⏳ ${this.stationType} station waiting - localStream: ${!!this.localStream}, stationType: ${this.stationType}`);
        }
    }

    joinRoom(){
        if(this.socket && this.roomId && this.userId && this.stationType){
            this.socket.emit('join-room', {
                roomId: this.roomId,
                userId: this.userId,
                stationType: this.stationType
            });
            console.log(`🏠 ${this.stationType} station joined room: ${this.roomId}`);
        }
    }

    async startLocalStream(videoElement){
        try{
            console.log(`🎬 ${this.stationType} station starting local stream...`);
            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });

            if(videoElement){
                videoElement.srcObject = this.localStream;
            }
            
            console.log(`✅ ${this.stationType} station local stream ready`);
            
            // Check if we can initiate connection now that we have local stream
            this.checkAndInitiateConnection();
            
            return this.localStream;
        }catch(err){
            console.error(`❌ ${this.stationType} station error accessing media:`, err);
            throw err;
        }
    }

    createPeerConnection(){
        console.log(`🆕 ${this.stationType} station creating peer connection`);
        
        this.peerConnection = new RTCPeerConnection(this.config);
        
        // Add local stream tracks
        if(this.localStream){
            console.log(`📤 Adding ${this.localStream.getTracks().length} tracks to peer connection`);
            this.localStream.getTracks().forEach(track => {
                console.log(`📤 Adding ${track.kind} track`);
                this.peerConnection.addTrack(track, this.localStream);
            });
        } 
        
        // Handle incoming remote streams
        this.peerConnection.ontrack = (event) => {
            console.log(`🎥 ${this.stationType} station received remote ${event.track.kind} track`);
            
            // Create or update remote stream
            if(!this.remoteStream){
                this.remoteStream = new MediaStream();
                console.log(`📺 ${this.stationType} station created new remote stream`);
            }
            
            // Add track to remote stream
            this.remoteStream.addTrack(event.track);
            
            // Trigger callback with the complete stream
            if(this.onRemoteStream){
                console.log(`✅ ${this.stationType} station calling onRemoteStream callback`);
                this.onRemoteStream(this.remoteStream);
            }
        };

        this.peerConnection.onicecandidate = (event) => {
            if(event.candidate){
                console.log(`📤 ${this.stationType} station sending ICE candidate`);
                this.socket.emit('ice-candidate', {
                    roomId: this.roomId,
                    candidate: event.candidate,
                    targetSocket: this.targetSocketId
                });
            } else {
                console.log(`✅ ${this.stationType} station ICE gathering complete`);
            }
        };

        // Enhanced connection state handling
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log(`🔗 ${this.stationType} station connection state: ${state}`);
            
            if(this.onConnectionStateChange){
                this.onConnectionStateChange(state);
            }
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log(`🧊 ${this.stationType} station ICE connection state: ${state}`);
        };

        return this.peerConnection;
    }

    async createOffer(){
        try{
            console.log(`🐕 ${this.stationType} station creating offer...`);
            
            if(!this.peerConnection){
                this.createPeerConnection();
            }

            console.log(`📝 ${this.stationType} station creating offer...`);
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await this.peerConnection.setLocalDescription(offer);

            const targetStation = this.stationType === 'dog' ? 'person' : 'dog';
            this.socket.emit('offer', {
                roomId: this.roomId,
                offer: offer,
                targetStation: targetStation
            });
            console.log(`📤 ${this.stationType} station sent offer to ${targetStation}`);
        }catch(err){
            console.error(`❌ ${this.stationType} station error creating offer:`, err);
        }   
    }

    async handleOffer(offer, senderId){
        try{
            console.log(`📥 ${this.stationType} station handling offer from: ${senderId}`);
            this.targetSocketId = senderId;
            
            if(!this.peerConnection){
                this.createPeerConnection();
            }

            console.log(`📝 ${this.stationType} station setting remote description from offer`);
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            console.log(`📝 ${this.stationType} station creating answer...`);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            this.socket.emit('answer', {
                roomId: this.roomId,
                answer: answer,
                targetSocket: senderId
            });
            console.log(`📤 ${this.stationType} station sent answer`);
        }catch(err){
            console.error(`❌ ${this.stationType} station error handling offer:`, err);
        }
    }

    async handleAnswer(answer){
        try{
            console.log(`📥 ${this.stationType} station handling answer...`);
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`✅ ${this.stationType} station handled answer successfully`);
        }catch(err){
            console.error(`❌ ${this.stationType} station error handling answer:`, err);
        }
    }

    async handleIceCandidate(candidate){
        try{
            if(this.peerConnection && this.peerConnection.remoteDescription){
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`✅ ${this.stationType} station added ICE candidate`);
            } else {
                console.log(`⏳ ${this.stationType} station queuing ICE candidate - no remote description yet`);
            }
        }catch(err){
            console.error(`❌ ${this.stationType} station error adding ICE candidate:`, err);
        }
    }

    handleUserLeft(){
        if(this.remoteStream){
            this.remoteStream.getTracks().forEach(track => track.stop());
            this.remoteStream = null;
        }
        if(this.peerConnection){
            this.peerConnection.close();
            this.peerConnection = null;
        }
    }

    sendNotification(notification){
        if(this.socket){
            this.socket.emit('send-notification', {
                roomId: this.roomId,
                notification: notification
            });
        }
    }

    disconnect(){
        if(this.localStream){
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if(this.remoteStream){
            this.remoteStream.getTracks().forEach(track => track.stop());
            this.remoteStream = null;
        }
        if(this.peerConnection){
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if(this.socket){
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export default new WebRTCService();