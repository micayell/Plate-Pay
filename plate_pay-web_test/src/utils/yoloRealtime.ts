import * as ort from 'onnxruntime-web';

// COCO 클래스 이름
export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
  'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
  'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
  'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
  'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
  'toothbrush'
];

export interface Detection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  class: string;
  confidence: number;
  classId: number;
}

export class YOLOv8RealtimeDetector {
  private session: ort.InferenceSession | null = null;
  private isLoaded = false;

  async loadModel(modelPath: string, onProgress?: (progress: number) => void): Promise<void> {
    try {
      console.log('🤖 YOLOv8 모델 로딩 시작:', modelPath);
      
      // ONNX Runtime 설정
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
      
      if (onProgress) onProgress(10);
      
      // 모델 로드
      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['webgl', 'cpu'],
        graphOptimizationLevel: 'all',
      });
      
      if (onProgress) onProgress(100);
      
      this.isLoaded = true;
      console.log('✅ YOLOv8 모델 로드 완료');
      console.log('입력 형태:', this.session.inputNames);
      console.log('출력 형태:', this.session.outputNames);
      
    } catch (error) {
      console.error('❌ YOLOv8 모델 로드 실패:', error);
      throw error;
    }
  }

  async detect(videoElement: HTMLVideoElement): Promise<Detection[]> {
    if (!this.session || !this.isLoaded) {
      console.warn('⚠️ 모델이 아직 로드되지 않음');
      return [];
    }

    try {
      // 캔버스에 비디오 프레임 그리기
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // YOLOv8 입력 크기 (640x640)
      canvas.width = 640;
      canvas.height = 640;
      
      // 비디오를 640x640으로 리사이즈해서 그리기
      ctx.drawImage(videoElement, 0, 0, 640, 640);
      
      // 이미지 데이터를 텐서로 변환
      const imageData = ctx.getImageData(0, 0, 640, 640);
      const input = this.preprocessImage(imageData);
      
      // YOLO 추론 실행
      const feeds = { images: input };
      const results = await this.session.run(feeds);
      
      // 결과 처리
      const output = results.output0.data as Float32Array;
      const detections = this.postprocess(output, videoElement.videoWidth, videoElement.videoHeight);
      
      return detections;
      
    } catch (error) {
      console.error('❌ YOLO 감지 오류:', error);
      return [];
    }
  }

  private preprocessImage(imageData: ImageData): ort.Tensor {
    const { data, width, height } = imageData;
    
    // RGB로 변환하고 정규화 (0-255 -> 0-1)
    const input = new Float32Array(3 * width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const r = data[i] / 255.0;     // Red
      const g = data[i + 1] / 255.0; // Green  
      const b = data[i + 2] / 255.0; // Blue
      
      // CHW 형태로 배열 (Channel-Height-Width)
      input[pixelIndex] = r;                              // R 채널
      input[pixelIndex + width * height] = g;             // G 채널  
      input[pixelIndex + 2 * width * height] = b;         // B 채널
    }
    
    return new ort.Tensor('float32', input, [1, 3, height, width]);
  }

  private postprocess(output: Float32Array, originalWidth: number, originalHeight: number): Detection[] {
    const detections: Detection[] = [];
    const numDetections = output.length / 84; // YOLOv8: [x, y, w, h] + 80 classes = 84
    
    const confidenceThreshold = 0.5;
    const nmsThreshold = 0.4;
    
    const boxes: number[][] = [];
    const scores: number[] = [];
    const classIds: number[] = [];
    
    // 감지된 객체들 파싱
    for (let i = 0; i < numDetections; i++) {
      const offset = i * 84;
      
      // 바운딩 박스 좌표 (중심점, 폭, 높이)
      const centerX = output[offset];
      const centerY = output[offset + 1];
      const width = output[offset + 2];
      const height = output[offset + 3];
      
      // 클래스 확률들 (80개 클래스)
      let maxScore = 0;
      let maxClassId = 0;
      
      for (let j = 4; j < 84; j++) {
        const score = output[offset + j];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = j - 4;
        }
      }
      
      // 신뢰도 임계값 확인
      if (maxScore > confidenceThreshold) {
        // 중심점 좌표를 모서리 좌표로 변환
        const x1 = (centerX - width / 2) / 640 * originalWidth;
        const y1 = (centerY - height / 2) / 640 * originalHeight;
        const x2 = (centerX + width / 2) / 640 * originalWidth;
        const y2 = (centerY + height / 2) / 640 * originalHeight;
        
        boxes.push([x1, y1, x2, y2]);
        scores.push(maxScore);
        classIds.push(maxClassId);
      }
    }
    
    // NMS (Non-Maximum Suppression) 적용
    const nmsIndices = this.applyNMS(boxes, scores, nmsThreshold);
    
    // 최종 감지 결과 생성
    for (const idx of nmsIndices) {
      detections.push({
        bbox: boxes[idx] as [number, number, number, number],
        class: COCO_CLASSES[classIds[idx]] || 'unknown',
        confidence: scores[idx],
        classId: classIds[idx]
      });
    }
    
    return detections;
  }

  private applyNMS(boxes: number[][], scores: number[], threshold: number): number[] {
    const indices: number[] = [];
    const sortedIndices = scores
      .map((_, idx) => idx)
      .sort((a, b) => scores[b] - scores[a]);
    
    const suppress = new Array(boxes.length).fill(false);
    
    for (const i of sortedIndices) {
      if (suppress[i]) continue;
      
      indices.push(i);
      
      for (let j = i + 1; j < boxes.length; j++) {
        if (suppress[j]) continue;
        
        const iou = this.calculateIoU(boxes[i], boxes[j]);
        if (iou > threshold) {
          suppress[j] = true;
        }
      }
    }
    
    return indices;
  }

  private calculateIoU(box1: number[], box2: number[]): number {
    const [x1_1, y1_1, x2_1, y2_1] = box1;
    const [x1_2, y1_2, x2_2, y2_2] = box2;
    
    const intersectionX1 = Math.max(x1_1, x1_2);
    const intersectionY1 = Math.max(y1_1, y1_2);
    const intersectionX2 = Math.min(x2_1, x2_2);
    const intersectionY2 = Math.min(y2_1, y2_2);
    
    const intersectionWidth = Math.max(0, intersectionX2 - intersectionX1);
    const intersectionHeight = Math.max(0, intersectionY2 - intersectionY1);
    const intersectionArea = intersectionWidth * intersectionHeight;
    
    const box1Area = (x2_1 - x1_1) * (y2_1 - y1_1);
    const box2Area = (x2_2 - x1_2) * (y2_2 - y1_2);
    const unionArea = box1Area + box2Area - intersectionArea;
    
    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  dispose(): void {
    if (this.session) {
      this.session = null;
      this.isLoaded = false;
    }
  }
}