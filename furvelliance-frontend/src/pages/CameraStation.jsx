import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import webRTCService from "../services/webrtcServices";
import aiModels from '../utils/aiModels';
import { logActivity } from '../slices/petSlice';
import { addNotification } from '../slices/notificationSlice';
import './CameraStation.css';

const CameraStation = ({ stationType }) => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const { selectedPet } = useSelector(state => state.pets);
    const { roomId } = useParams();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const canvasRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const historicalDataRef = useRef({
        previousDetections: null,
        hadPetBefore: false
    });
    const webrtcInstanceRef = useRef(null);
    const remoteStreamSet = useRef(false);
    const initializationRef = useRef(false);

    const [isConnected, setIsConnected] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [detections, setDetections] = useState([]);
    const [soundDetections, setSoundDetections] = useState([]);
    const [aiInitialized, setAiInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [remoteVideoVisible, setRemoteVideoVisible] = useState(false);

    useEffect(() => {
        initializeStation();
        return () => cleanup();
    }, [roomId, stationType]);

    useEffect(() => {
        if(isConnected && stationType === 'dog' && aiInitialized){
            startAIDetection();
        }
        return () => stopAIDetection();
    }, [isConnected, stationType, aiInitialized]);

    const initializeStation = async () => {
        try{
            setError(null);
            console.log(`🚀 Initializing ${stationType} station for room: ${roomId}`);
            
            if(webrtcInstanceRef.current) {
                console.log(`🔄 ${stationType} station cleaning up existing WebRTC instance`);
                webrtcInstanceRef.current.disconnect();
                webrtcInstanceRef.current = null;
            }
            
            if(stationType === 'dog'){
                console.log('🤖 Loading AI models for dog station...');
                await aiModels.initialize();
                setAiInitialized(true);
                console.log('✅ AI models loaded successfully');
            }
            
            const serverUrl = 'http://localhost:3030';
            console.log('🔌 Creating WebRTC instance...');
            const webrtcInstance = webRTCService.initialize(
                serverUrl,
                user._id,
                roomId,
                stationType
            );
            
            webrtcInstanceRef.current = webrtcInstance;
            
            // Set up callbacks BEFORE starting local stream
            webrtcInstance.onRemoteStream = (stream) => {
                console.log('🎥 Remote stream received! Setting to video element');
                console.log('Remote stream details:', {
                    id: stream.id,
                    active: stream.active,
                    tracks: stream.getTracks().map(t => ({ 
                        kind: t.kind, 
                        enabled: t.enabled, 
                        readyState: t.readyState 
                    }))
                });
                
                if(remoteStreamSet.current) {
                    console.log('🔄 Remote stream already set, skipping duplicate');
                    return;
                }
                
                if(remoteVideoRef.current && stream.active){
                    remoteStreamSet.current = true;
                    
                    // Set essential video properties
                    remoteVideoRef.current.muted = true;
                    remoteVideoRef.current.autoplay = true;
                    remoteVideoRef.current.playsInline = true;
                    
                    // Set the stream
                    remoteVideoRef.current.srcObject = stream;
                    console.log('✅ Remote video element updated with stream');
                    
                    // Try to play immediately
                    forceVideoPlay(remoteVideoRef.current);
                }
            };
            
            // Set up connection state handler
            webrtcInstance.onConnectionStateChange = (state) => {
                console.log(`🔗 Connection state changed to: ${state}`);
                setConnectionState(state);
                
                // Update connection status
                if (['connected', 'connecting'].includes(state)) {
                    setIsConnected(true);
                } else if (state === 'failed') {
                    console.log('⚠️ Connection failed but keeping streams active');
                    setIsConnected(false);
                } else {
                    setIsConnected(false);
                }
            };

            // Set up notification handler for person station
            if(stationType === 'person'){
                webrtcInstance.socket.on('pet-alert', (notification) => {
                    dispatch(addNotification(notification));
                    showNotification(notification);
                });
            }

            console.log(`🎬 Starting local video stream...`);
            const stream = await webrtcInstance.startLocalStream(localVideoRef.current);
            console.log(`✅ Local stream started successfully`);

        }catch(err){
            console.error(`❌ Error initializing station:`, err);
            setError(err.message);
            initializationRef.current = false;
        }
    };

    const startAIDetection = () => {
        if(detectionIntervalRef.current) return;

        detectionIntervalRef.current = setInterval(async () => {
            if(localVideoRef.current && localVideoRef.current.readyState === 4){
                await performDetection();
            }
        }, 2000);

        // Only start sound classification if AI models are properly initialized
        try {
            aiModels.startSoundClassification((results) => {
                handleSoundDetection(results);
            });
        } catch (error) {
            console.warn('Failed to start sound classification:', error);
        }
    };

    const stopAIDetection = () => {
        if(detectionIntervalRef.current){
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        aiModels.stopSoundClassification();
    };

    const performDetection = async () => {
        try{
            const video = localVideoRef.current;
            const objectPredictions = await aiModels.detectObjects(video);
            const pose = await aiModels.detectPose(video);

            setDetections(objectPredictions);
            drawDetections(objectPredictions, pose);

            const anomalies = aiModels.analyseActivityAnomaly(
                objectPredictions,
                historicalDataRef.current
            );

            const petDetections = objectPredictions.filter(d => ['dog', 'cat'].includes(d.class));

            if(petDetections.length > 0){
                historicalDataRef.current.hadPetBefore = true;
            }

            if(pose){
                const behaviour = aiModels.analysePoseForBehaviour(pose);
                if(behaviour){
                    handleBehaviourDetected(behaviour);
                }
            }
            if(anomalies.length > 0){
                anomalies.forEach(anomaly => {
                    sendNotification(anomaly);
                });
            }
            historicalDataRef.current.previousDetections = objectPredictions;
        }catch(err){
            console.error('Detection error', err);
        }
    };

    const drawDetections = (predictions, pose) => {
        const canvas = canvasRef.current;
        const video = localVideoRef.current;

        if(!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = '#00ff00';
            ctx.font = '16px Arial';
            const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
            ctx.fillText(label, x, y > 20 ? y - 5 : y + 20);
        });

        if(pose && pose.keypoints){
            pose.keypoints.forEach(keypoint => {
                if(keypoint.score > 0.5){
                    ctx.beginPath();
                    ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = '#ff0000';
                    ctx.fill();
                }
            });
        }
    };

    const handleSoundDetection = (results) => {
        if(results && results.length > 0){
            const topResult = results[0];

            setSoundDetections(prev => [...prev.slice(-9), topResult]);
            
            const alertSounds = ['bark', 'meow', 'whistle', 'clap'];
            if(alertSounds.some(sound => topResult.label.toLowerCase().includes(sound))){
                const notification = {
                    type: topResult.label.toLowerCase().includes('bark') ? 'barking' : 'unusual_behavior',
                    confidence: topResult.confidence,
                    description: `Detected sound: ${topResult.label}`,
                    alertType: 'info',
                    message: `Your pet might be making noise: ${topResult.label}`
                };
                sendNotification(notification);
            }
        }
    };

    const handleBehaviourDetected = (behaviour) => {
        if(selectedPet && behaviour.confidence > 0.6){
            // Don't let activity logging errors break the main functionality
            dispatch(logActivity({
                petId: selectedPet._id,
                type: behaviour.type, // Use the type from the behaviour analysis
                confidence: behaviour.confidence,
                description: behaviour.description
            })).catch(error => {
                console.warn('Failed to log activity:', error);
                // Continue without breaking the app
            });
        }
    };

    const sendNotification = (data) => {
        const notification = {
            user: user._id,
            pet: selectedPet?._id,
            message: data.message || data.description,
            alertType: data.alertType, // Use the alertType from the data
            timestamp: new Date(),
            read: false 
        };

        webRTCService.sendNotification(notification);

        if(selectedPet){
            // Don't let activity logging errors break notifications
            dispatch(logActivity({
                petId: selectedPet._id,
                type: data.type, // Use the correct activity type
                confidence: data.confidence,
                description: data.description
            })).catch(error => {
                console.warn('Failed to log activity for notification:', error);
                // Continue without breaking the notification system
            });
        }
    };

    const showNotification = (notification) => {
        if('Notification' in window && Notification.permission === 'granted'){
            new Notification('Pet Alert', {
                body: notification.message,
                icon: '/pet-icon.png'
            });
        }
    };

    const cleanup = () => {
        stopAIDetection();
        if (webrtcInstanceRef.current) {
            webrtcInstanceRef.current.disconnect();
            webrtcInstanceRef.current = null;
        }
    };

    const requestNotificationPermission = () => {
        if('Notification' in window && Notification.permission === 'default'){
            Notification.requestPermission();
        }
    };

    const forceVideoPlay = async (videoElement) => {
        if (!videoElement || !videoElement.srcObject) return;
        
        console.log('🎬 Attempting to play remote video...');
        
        // Add event listeners for video state tracking
        videoElement.onloadedmetadata = () => {
            console.log('📺 Remote video metadata loaded:', {
                width: videoElement.videoWidth,
                height: videoElement.videoHeight,
                readyState: videoElement.readyState
            });
            setRemoteVideoVisible(true);
        };
        
        videoElement.oncanplay = () => {
            console.log('✅ Remote video can play');
            setRemoteVideoVisible(true);
        };
        
        videoElement.onplaying = () => {
            console.log('▶️ Remote video is playing!');
            setRemoteVideoVisible(true);
        };
        
        videoElement.onerror = (e) => {
            console.error('❌ Remote video error:', e);
        };
        
        try {
            await videoElement.play();
            console.log('✅ Remote video play successful!');
            setRemoteVideoVisible(true);
        } catch (err) {
            console.log('⚠️ Remote video play failed:', err.message);
            
            // Try muted play as fallback
            videoElement.muted = true;
            try {
                await videoElement.play();
                console.log('✅ Remote video play successful (muted)!');
                setRemoteVideoVisible(true);
            } catch (err2) {
                console.log('❌ Remote video play failed even when muted:', err2.message);
            }
        }
    };

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    return (
        <div className="camera-station">
            <div className="station-header">
                <h2>{stationType === 'person' ? 'Person Station' : 'Dog Station'}</h2>
                <div className={`connection-status ${connectionState}`}>
                    {connectionState}
                </div>
            </div>

            {error && (
                <div className="error-message">
                  Error: {error}
                </div>
            )}

            <div className="video-container">
                <div className="local-video-wrapper">
                  <h3>Local Camera (You)</h3>
                  <div style={{ position: 'relative' }}>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="video-element"
                    />
                    {stationType === 'dog' && (
                     <canvas
                        ref={canvasRef}
                        className="detection-canvas"
                      />
                    )}
                  </div>
                </div>

                <div className="remote-video-wrapper">
                    <h3>Remote Camera (Other Station)</h3>
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className="video-element"
                          style={{ display: remoteVideoVisible ? 'block' : 'none' }}
                        />
                </div>
            </div>

            {stationType === 'dog' && detections.length > 0 && (
                <div className="detections-panel" >
                  <h3>Current Detections</h3>
                  <div className="detections-list">
                    {detections.map((detection, idx) => (
                      <div key={idx} className="detection-item">
                        {detection.class}: {Math.round(detection.score * 100)}%
                      </div>
                    ))}
                  </div>
                </div>
            )}

            {stationType === 'dog' && soundDetections.length > 0 && (
                <div className="sound-panel">
                  <h3>Sound Detection</h3>
                  <div className="sound-item">
                    {soundDetections[soundDetections.length - 1].label}
                  </div>
                </div>
            )}
        </div>
    ); 
};

export default CameraStation;