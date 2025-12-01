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

            //Initialize ml5 sound classifier 
            this.soundClassifier = ml5.soundClassifier('SpeechCommands18w', { 
                probabilityThreshold: 0.7 
            });
            console.log('Sound Classifier loaded');

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
            console.error('Error estimating pose:', err);
            return null;
        }
    }

    startSoundClassification(callback){
        if(!this.soundClassifier){
            throw new Error('Sound Classifier not initialized');
        }
        this.soundClassifier.classify((error, results) => {
            if(error){
                console.error('Sound classification error:', error);
                return;
            }
            callback(results);
        });
    }

    stopSoundClassification(){
        // ml5 soundClassifier does not have a built-in stop method, It will stop when the comp unmounts
    }
    
    analyseActivityAnomaly(detections, historicalData){
        //simple anomoly
        const anomalies = [];
        //check for unusual no. of detections
        if(detections.length > 5){
            anomalies.push({
                type: 'high_activity',
                confidence: 0.8,
                description: 'Unusually high activity detected'
            });
        }

        //check for specific pet-related detections
        const petClasses = ['dog', 'cat', 'bird'];
        const petDetections = detections.filter(d => petClasses.includes(d.class));
        if(petDetections.length === 0 && historicalData.hadPetBefore){
            anomalies.push({
                type: 'pet_missing',
                confidence: 0.7,
                description: 'Pet not detected in the frame'
            });
        }

        ////check for rapid movements 
        if(historicalData.previousDetections){
            const movementScore = this.calculateMovement(
                detections,
                historicalData.previousDetections
            );
            if(movementScore > 0.7){
                anomalies.push({
                    type: 'rapid_movement',
                    confidence: movementScore,
                    description: 'Rapid movements detected'
                });
            }
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

    analysePoseForBehaviour(pose){
        if(!pose || !pose.keypoints) return null;

        //behaviour analysis
        const keypoints = pose.keypoints;
        const behaviours = [];

        //if pet is standing ie. nose higher than hips
        const nose = keypoints.find(kp => kp.part === 'nose');
        const leftHip = keypoints.find(kp => kp.part === 'leftHip');
        const rightHip = keypoints.find(kp => kp.part === 'rightHip');

        if(nose && leftHip && rightHip && nose.score > 0.5){
            const avgHipY = (leftHip.position.y + rightHip.position.y) / 2;

            if(nose.position.y < avgHipY - 50){
                behaviours.push({
                    type: 'standing',
                    confidence: Math.min(nose.score, leftHip.score, rightHip.score)
                });
            }else {
                behaviours.push({
                    type: 'lying_down',
                    confidence: Math.min(nose.score, leftHip.score, rightHip.score)
                });
            }
        } 
        return behaviours.length > 0 ? behaviours[0] : null;
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