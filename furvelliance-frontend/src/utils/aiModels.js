import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';
import ml5 from 'ml5';

class AiModelsManager {
    constructor(){
        this.objectDetectionModel = null;
        this.poseModel = null;
        this.soundClassifier = null;
        this.isInitialized = false;
    }

    async initialize(){
        if(this.isInitialized) return;
        try{
            console.log('Initializing AI models...');
            //set tensorFlow.js backend
            await tf.ready();
            console.log('TensorFlow.js ready');

            //load coco-ssd - object detection model
            this.objectDetectionModel = await cocoSsd.load({
                base: 'lite_mobilenet_v2'
            });
            console.log('Coco-SSD model loaded');

            //load posenet - pose estimation model
            this.poseModel = await posenet.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                inputResolution: { width: 640, height: 480 },
                multiplier: 0.75
            });
            console.log('PoseNet model loaded');

            //Initialize ml5 sound classifier - properly wait for it to load
            try {
                this.soundClassifier = await new Promise((resolve, reject) => {
                    const classifier = ml5.soundClassifier('SpeechCommands18w', {
                        probabilityThreshold: 0.7
                    }, () => {
                        console.log('Sound Classifier loaded');
                        resolve(classifier);
                    });
                    
                    // Add timeout to prevent hanging
                    setTimeout(() => {
                        if (!this.soundClassifier) {
                            console.warn('Sound classifier loading timeout, continuing without it');
                            resolve(null);
                        }
                    }, 10000);
                });
            } catch (soundError) {
                console.warn('Sound classifier failed to load, continuing without it:', soundError);
                this.soundClassifier = null;
            }

            this.isInitialized = true;
            console.log('All AI models successfully initialized!');
        }catch(err){
            console.error('Error initializing AI models:', err);
            throw err;
        }
    }

    async detectObjects(videoElement){
        if(!this.objectDetectionModel){
            throw new Error('Object Detection model not initialized');
        }
        try{
            const predictions = await this.objectDetectionModel.detect(videoElement);
            return predictions;
        }catch(err){
            console.error('Error detecting objects:', err);
            return [];
        }
    }

    async detectPose(videoElement){
        if(!this.poseModel){
            throw new Error('Pose Estimation model not initialized');
        }
        try{
            const pose = await this.poseModel.estimateSinglePose(videoElement, {
                flipHorizontal: false
            });
            return pose;
        }catch(err){
            console.error('Error detecting pose:', err);
            return null;
        }
    }

    startSoundClassification(callback){
        if(!this.soundClassifier){
            console.warn('Sound Classifier not available, skipping sound classification');
            return;
        }
        
        try {
            // Check if the classifier has the classify method
            if (typeof this.soundClassifier.classify !== 'function') {
                console.warn('Sound classifier does not have classify method, skipping sound classification');
                return;
            }
            
            this.soundClassifier.classify((error, results) => {
                if(error){
                    console.error('Sound classification error:', error);
                    return;
                }
                callback(results);
            });
        } catch (error) {
            console.error('Error starting sound classification:', error);
        }
    }

    stopSoundClassification(){
        // ml5 soundClassifier does not have a built-in stop method, It will stop when the comp unmounts
    }
    
    analyseActivityAnomaly(currentDetections, historicalData) {
        const anomalies = [];
        
        // Check for sudden appearance/disappearance
        const currentPets = currentDetections.filter(d => ['dog', 'cat'].includes(d.class));
        const hadPetBefore = historicalData.hadPetBefore;
        
        // Pet suddenly appeared (motion detection)
        if (currentPets.length > 0 && !hadPetBefore) {
            anomalies.push({
                type: 'motion',
                alertType: 'motion',
                confidence: 0.8,
                description: 'Pet movement detected',
                message: 'Your pet is now active in the monitored area'
            });
        }
        
        // Check for unusual number of detections (could indicate unusual behavior)
        if (currentDetections.length > 5) {
            anomalies.push({
                type: 'unusual_behavior',
                alertType: 'unusual_activity',
                confidence: 0.7,
                description: 'High activity detected',
                message: 'Unusual amount of activity detected in the area'
            });
        }
        
        return anomalies;
    }

    calculateMovement(currentDetections, previousDetections){
        if(!previousDetections || previousDetections.length === 0){
            return 0;
        }
        let totalMovement = 0;
        let count = 0;

        currentDetections.forEach(current => {
            const previous = previousDetections.find(p => p.class === current.class);
            if(previous){
                const dx = current.bbox[0] - previous.bbox[0];
                const dy = current.bbox[1] - previous.bbox[1];
                const distance = Math.sqrt(dx * dx + dy * dy);
                totalMovement += distance;
                count++;
            }
        });
        return count > 0 ? Math.min(totalMovement / (count * 100), 1) : 0;
    }

    analysePoseForBehaviour(pose) {
        if (!pose || !pose.keypoints) return null;
        
        const keypoints = pose.keypoints.filter(kp => kp.score > 0.5);
        if (keypoints.length < 3) return null;
        
        // Simplified behavior analysis based on pose
        const headKeypoints = keypoints.filter(kp => 
            ['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar'].includes(kp.part)
        );
        
        const bodyKeypoints = keypoints.filter(kp => 
            ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'].includes(kp.part)
        );
        
        // Determine behavior based on pose analysis
        if (headKeypoints.length >= 2 && bodyKeypoints.length >= 2) {
            // Simple heuristic: if head is lower than body, might be eating
            const avgHeadY = headKeypoints.reduce((sum, kp) => sum + kp.position.y, 0) / headKeypoints.length;
            const avgBodyY = bodyKeypoints.reduce((sum, kp) => sum + kp.position.y, 0) / bodyKeypoints.length;
            
            if (avgHeadY > avgBodyY + 20) {
                return {
                    type: 'eating',
                    confidence: pose.score || 0.7,
                    description: 'Pet appears to be eating'
                };
            }
            
            // Default to general pose detection
            return {
                type: 'pose_detected',
                confidence: pose.score || 0.6,
                description: 'Pet pose detected and analyzed'
            };
        }
        
        return null;
    }

    cleanup(){
        if(this.objectDetectionModel){
            this.objectDetectionModel.dispose();
            this.objectDetectionModel = null;
        }
        if(this.poseModel){
            this.poseModel.dispose();
            this.poseModel = null;
        }
        this.isInitialized = false;
    }
}

export default new AiModelsManager();