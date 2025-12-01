import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import webRTCService from "../services/webrtcServices";
import aiModels from '../utils/aiModels';
import { logActivity } from '../slices/petSlice';
import { addNotification } from '../slices/notificationSlice';
import './CameraStation.css';

const CameraStation = ({ stationType, roomId }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { selectedPet } = useSelector((state) => state.pets);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const canvasRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const historicalDataRef = useRef({
        previousDetections: null,
        hadPetBefore: false
    });

    const [isConnected, setIsConnected] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [detections, setDetections] = useState([]);
    const [soundDetections, setSoundDetections] = useState([]);
    const [aiInitialized, setAiInitialized] = useState(false);
    const [error, setError] = useState(null);

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
            //initialize ai models for dog station
            if(stationType === 'dog'){
                await aiModels.initialize();
                setAiInitialized(true);
            }
            //initialize webrtc
            const serverUrl = 'http://localhost:3030';
            const socket = webRTCService.initialize(
                serverUrl,
                user._id,
                roomId,
                stationType
            );

            //callbacks
            webRTCService.onRemoteStream = (stream) => {
                if(remoteVideoRef.current){
                    remoteVideoRef.current.srcObject = stream;
                }
            };
            webRTCService.onConnectionStateChange = (state) => {
                setConnectionState(state);
                setIsConnected(state === 'connected');
            };

            //notifications (perrson station)
            if(stationType === 'person'){
                socket.on('pet-alert', (notification) => {
                    dispatch(addNotification(notification));
                    showNotification(notification);
                });
            }

            //start local video stream
            const stream = await webRTCService.startLocalStream(localVideoRef.current);
            console.log('Local stream started');

        }catch(err){
            console.error('Error initializing station:', err);
            setError(err.message);
        }
    };

    const startAIDetection = () => {
        if(detectionIntervalRef.current) return;

        detectionIntervalRef.current = setInterval(async () => {
            if(localVideoRef.current && localVideoRef.current.readyState === 4){
                await performDetection();
            }
        }, 2000);

        //sound
        aiModels.startSoundClassification((results) => {
            handleSoundDetection(results);
        });
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

            //pet specific behaviour
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

            //label
            ctx.fillStyle = '#00ff00';
            ctx.font = '16px Arial';
            const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
            ctx.fillText(label, x, y > 20 ? y - 5 : y + 20);
        });

        //pose keypoints
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
                    type: 'sound_detected',
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
            dispatch(logActivity({
                petId: selectedPet._id,
                type: 'pose_detected',
                confidence: behaviour.confidence,
                description: `Pet ${behaviour.type}`
            }));
        }
    };

    const sendNotification = (data) => {
        const notification = {
            user: user._id,
            pet: selectedPet?._id,
            message: data.message || data.description,
            alertType: data.alertType || data.type,
            timestamp: new Date(),
            read: false 
        };

        webRTCService.sendNotification(notification);

        if(selectedPet){
            dispatch(logActivity({
                petId: selectedPet._id,
                type: data.type,
                confidence: data.confidence,
                description: data.description
            }));
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
        webRTCService.disconnect();
    };

    const requestNotificationPermission = () => {
        if('Notification' in window && Notification.permission === 'default'){
            Notification.requestPermission();
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
                  <h3>Local Camera</h3>
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
                    <h3>Remote Camera</h3>
                     <video
                       ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="video-element"
                    />
                </div>
            </div>

              {stationType === 'dog' && detections.length > 0 && (
                <div className="detections-panel">
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
