import * as posenet from '@tensorflow-models/posenet';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

async function testModels() {
  try {
    console.log('Loading posenet...');
    const poseNet = await posenet.load();
    console.log('✅ Posenet loaded successfully!');
    
    console.log('Loading coco-ssd...');
    const objectDetector = await cocoSsd.load();
    console.log('✅ Coco-SSD loaded successfully!');
    
    console.log('All models working!');
  } catch (error) {
    console.error('❌ Error loading models:', error);
  }
}

testModels();