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

        this.config = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
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
        return this.socket;
    }

    setupSocketListeners(){
        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
            this.joinRoom();
        });
        this.socket.on('user-joined', ({ userId, stationType}) => {
            console.log(`User joined: ${userId} as ${stationType}`);
            if(this.stationType === 'dog' && stationType === 'person'){
                this.createOffer();  //dog station creates offer when person joins
            }
        });
        this.socket.on('offer', async({ offer, senderId}) => {
            console.log('Received offer from:', senderId);
            await this.handleOffer(offer, senderId);
        });
        this.socket.on('answer', async({ answer}) => {
            console.log('Received answer');
            await this.handleAnswer(answer);
        });
        this.socket.on('ice-candidate', async({ candidate }) => {
            console.log('Received ICE candidate');
            await this.handleIceCandidate(candidate);
        });
        this.socket.on('user-left', ({ stationType }) =>{
            console.log(`User left: ${stationType}`);
            this.handleUserLeft();
        });
        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    }

    joinRoom(){
        if(this.socket && this.roomId && this.userId && this.stationType){
            this.socket.emit('join-room', {
                roomId: this.roomId,
                userId: this.userId,
                stationType: this.stationType
            });
            console.log(`Joined room: ${this.roomId} as ${this.stationType}`);
        }
    }

    async startLocalStream(videoElement){
        try{
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });
            if(videoElement){
                videoElement.srcObject = this.localStream;
            }
            return this.localStream;
        }catch(err){
            console.error('Error accessing media devices:', err);
            throw err;
        }
    }

    createPeerConnection(){
        this.peerConnection = new RTCPeerConnection(this.config);
        
        // Add local stream tracks to peer connection
        if(this.localStream){
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
        
        //handle incoming remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track');
            if(!this.remoteStream){
                this.remoteStream = new MediaStream();
            }
            this.remoteStream.addTrack(event.track);

            if(this.onRemoteStream){
                this.onRemoteStream(this.remoteStream);
            }
        };

        //handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if(event.candidate){
                console.log('Sending ICE candidate');
                this.socket.emit('ice-candidate', {
                    roomId: this.roomId,
                    candidate: event.candidate,
                    targetSocket: this.targetSocketId
                });
            }
        };

        //handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state: ', this.peerConnection.connectionState);
            if(this.onConnectionStateChange){
                this.onConnectionStateChange(this.peerConnection.connectionState);
            }
        };

        return this.peerConnection;
    }

    async createOffer(){
        try{
            if(!this.peerConnection){
                this.createPeerConnection();
            }
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
            console.log('Offer sent');
        }catch(err){
            console.error('Error creating offer:', err);
        }   
    }

    async handleOffer(offer, senderId){
        try{
            this.targetSocketId = senderId;
            if(!this.peerConnection){
                this.createPeerConnection();
            }
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            this.socket.emit('answer', {
                roomId: this.roomId,
                answer: answer,
                targetSocket: senderId
            });
            console.log('Answer sent');
        }catch(err){
            console.error('Error handling offer:', err);
        }
    }

    async handleAnswer(answer){
        try{
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Answer handled');
        }catch(err){
            console.error('Error handling answer:', err);
        }
    }

    async handleIceCandidate(candidate){
        try{
            if(this.peerConnection){
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('ICE candidate added');
            }
        }catch(err){
            console.error('Error adding ICE candidate:', err);
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