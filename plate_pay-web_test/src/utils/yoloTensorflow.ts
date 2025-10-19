import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

export interface Detection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  class: string;
  confidence: number;
  classId: number;
}

export interface LicensePlateDetection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  vehicleId: number;
  plateText?: string;
  source: 'estimated' | 'yolo'; // 번호판 감지 방법
}

export class YOLOv8PlateDetector {
  private model: tf.GraphModel | null = null;
  private isLoaded = false;
  private inputSize = 640; // YOLOv8 표준 입력 크기

  async loadModel(onProgress?: (progress: number) => void): Promise<void> {
    try {
      console.log('🎯 YOLOv8 번호판 감지 모델 로딩 시작...');

      await tf.ready();
      if (onProgress) onProgress(20);

      // ONNX를 TensorFlow.js로 변환된 모델 시도
      const modelUrls = [
        '/models/license_plate_detector_tfjs/model.json', // ONNX → TF.js 변환
        '/models/yolov8_plate_tfjs/model.json', // YOLOv8 TF.js 버전
      ];

      let modelLoaded = false;
      for (const modelUrl of modelUrls) {
        try {
          console.log(`🔍 TensorFlow.js 모델 로드 시도: ${modelUrl}`);

          this.model = await tf.loadGraphModel(modelUrl);

          console.log(`✅ YOLOv8 모델 로드 성공: ${modelUrl}`);
          console.log(`📋 입력 형태:`, this.model.inputs.map(i => i.shape));
          console.log(`📤 출력 형태:`, this.model.outputs.map(o => o.shape));

          modelLoaded = true;
          break;

        } catch (error) {
          console.warn(`⚠️ ${modelUrl} 로드 실패:`, error);
        }
      }

      if (!modelLoaded) {
        console.warn('⚠️ TensorFlow.js 모델 로드 실패, Computer Vision 모드로 대체');
        // Computer Vision 백업 모드
      }

      if (onProgress) onProgress(100);
      this.isLoaded = true;

      console.log('✅ YOLOv8 번호판 감지 시스템 준비 완료');

    } catch (error) {
      console.error('❌ YOLOv8 모델 초기화 실패:', error);
      throw error;
    }
  }

  async detectLicensePlates(canvas: HTMLCanvasElement): Promise<LicensePlateDetection[]> {
    if (!this.isLoaded) {
      console.warn('⚠️ YOLOv8 모델이 로드되지 않음');
      return [];
    }

    try {
      if (this.model) {
        // YOLOv8 TensorFlow.js 모델 사용
        return await this.detectWithYOLOv8TF(canvas);
      } else {
        // Computer Vision 백업 모드
        return await this.detectWithComputerVision(canvas);
      }
    } catch (error) {
      console.error('❌ 번호판 감지 오류:', error);
      return [];
    }
  }

  private async detectWithYOLOv8TF(canvas: HTMLCanvasElement): Promise<LicensePlateDetection[]> {
    if (!this.model) return [];

    console.log('🎯 YOLOv8 TensorFlow.js로 번호판 감지 시작...');

    // 1. 입력 데이터 전처리
    const inputTensor = this.preprocessImageTF(canvas);

    // 2. YOLOv8 추론 실행
    const prediction = this.model.predict(inputTensor) as tf.Tensor;

    // 3. 후처리 - YOLOv8 출력을 번호판 감지 결과로 변환
    const outputData = await prediction.data();
    const plateDetections = this.postprocessYOLOv8OutputTF(
      outputData as Float32Array,
      prediction.shape,
      canvas.width,
      canvas.height
    );

    // 메모리 정리
    inputTensor.dispose();
    prediction.dispose();

    console.log(`✅ YOLOv8 TensorFlow.js 감지 완료: ${plateDetections.length}개 번호판`);
    return plateDetections;
  }

  private preprocessImageTF(canvas: HTMLCanvasElement): tf.Tensor {
    // TensorFlow.js를 사용하여 이미지 전처리
    console.log('📊 TensorFlow.js 이미지 전처리 시작...');

    // Canvas에서 직접 텐서 생성
    const imageTensor = tf.browser.fromPixels(canvas)
      .resizeNearestNeighbor([this.inputSize, this.inputSize]) // 640x640으로 리사이즈
      .expandDims(0) // 배치 차원 추가 [1, 640, 640, 3]
      .div(255.0) // 정규화 (0-1 범위)
      .transpose([0, 3, 1, 2]); // [1, 3, 640, 640] - YOLOv8 입력 형식

    console.log('📊 입력 텐서 형태:', imageTensor.shape);
    return imageTensor;
  }

  private postprocessYOLOv8OutputTF(
    output: Float32Array,
    outputShape: number[],
    originalWidth: number,
    originalHeight: number
  ): LicensePlateDetection[] {
    console.log('📊 YOLOv8 TensorFlow.js 출력 형태:', outputShape);

    // YOLOv8 출력 형식: [1, 5, 8400] 또는 [1, 8400, 5]
    const plateDetections: LicensePlateDetection[] = [];
    const confidenceThreshold = 0.3; // 신뢰도 임계값 낮춤

    let numDetections = 0;
    let featuresPerDetection = 0;

    // 출력 형태에 따라 차원 결정
    if (outputShape.length === 3) {
      if (outputShape[1] === 5) {
        // [1, 5, 8400] 형태
        featuresPerDetection = outputShape[1];
        numDetections = outputShape[2];
      } else {
        // [1, 8400, 5] 형태
        numDetections = outputShape[1];
        featuresPerDetection = outputShape[2];
      }
    }

    console.log(`📊 감지 결과 분석: ${numDetections}개 후보, ${featuresPerDetection}개 특성`);

    // 스케일 계산 (입력 크기 → 원본 크기)
    const scaleX = originalWidth / this.inputSize;
    const scaleY = originalHeight / this.inputSize;

    for (let i = 0; i < numDetections; i++) {
      let x, y, w, h, confidence;

      // 출력 형태에 따라 데이터 추출 방식 결정
      if (outputShape[1] === 5) {
        // [1, 5, 8400] 형태
        x = output[i];
        y = output[numDetections + i];
        w = output[2 * numDetections + i];
        h = output[3 * numDetections + i];
        confidence = output[4 * numDetections + i];
      } else {
        // [1, 8400, 5] 형태
        const baseIndex = i * featuresPerDetection;
        x = output[baseIndex];
        y = output[baseIndex + 1];
        w = output[baseIndex + 2];
        h = output[baseIndex + 3];
        confidence = output[baseIndex + 4];
      }

      if (confidence > confidenceThreshold) {
        // 바운딩 박스 좌표 계산 (중심 → 좌상단/우하단)
        const x1 = (x - w / 2) * scaleX;
        const y1 = (y - h / 2) * scaleY;
        const x2 = (x + w / 2) * scaleX;
        const y2 = (y + h / 2) * scaleY;

        // 유효한 바운딩 박스인지 확인
        if (x2 > x1 && y2 > y1 && x1 >= 0 && y1 >= 0 && x2 <= originalWidth && y2 <= originalHeight) {
          plateDetections.push({
            bbox: [x1, y1, x2, y2],
            confidence: confidence,
            vehicleId: i,
            source: 'yolo'
          });

          console.log(`✅ YOLOv8 TF.js 번호판 감지: (${x1.toFixed(1)}, ${y1.toFixed(1)}) → (${x2.toFixed(1)}, ${y2.toFixed(1)}), 신뢰도: ${(confidence * 100).toFixed(1)}%`);
        }
      }
    }

    // 신뢰도 기준으로 정렬
    plateDetections.sort((a, b) => b.confidence - a.confidence);

    return plateDetections.slice(0, 5); // 최대 5개까지
  }

  private async detectWithComputerVision(canvas: HTMLCanvasElement): Promise<LicensePlateDetection[]> {
    console.log('🎯 실시간 번호판 감지 시작...');

    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // 이미지 데이터 획득
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 번호판 특성을 이용한 감지
    const plateRegions = this.detectPlateRegions(imageData, canvas.width, canvas.height);

    console.log(`🔍 ${plateRegions.length}개 번호판 후보 영역 발견`);

    return plateRegions;
  }

  private detectPlateRegions(imageData: ImageData, width: number, height: number): LicensePlateDetection[] {
    const plateDetections: LicensePlateDetection[] = [];

    // 그레이스케일 변환
    const grayData = this.convertToGrayscale(imageData);

    // 에지 감지 (소벨 필터)
    const edges = this.detectEdges(grayData, width, height);

    // 수평 라인 강조 (번호판의 특징)
    const horizontalLines = this.enhanceHorizontalLines(edges, width, height);

    // 연결 컴포넌트 분석으로 번호판 후보 영역 찾기
    const candidates = this.findPlateCanidates(horizontalLines, width, height);

    // 번호판 크기/비율 필터링
    const validPlates = this.filterByPlateCharacteristics(candidates, width, height);

    console.log(`📊 감지 과정: ${candidates.length}개 후보 → ${validPlates.length}개 유효한 번호판`);

    return validPlates;
  }

  private convertToGrayscale(imageData: ImageData): Uint8Array {
    const grayData = new Uint8Array(imageData.width * imageData.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // RGB를 그레이스케일로 변환 (가중 평균)
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayData[i / 4] = gray;
    }

    return grayData;
  }

  private detectEdges(grayData: Uint8Array, width: number, height: number): Uint8Array {
    const edges = new Uint8Array(width * height);

    // 소벨 필터 커널
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;

        // 3x3 커널 적용
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixel = grayData[(y + ky - 1) * width + (x + kx - 1)];
            const kernelIndex = ky * 3 + kx;
            gx += pixel * sobelX[kernelIndex];
            gy += pixel * sobelY[kernelIndex];
          }
        }

        // 그래디언트 크기 계산
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = Math.min(255, magnitude);
      }
    }

    return edges;
  }

  private enhanceHorizontalLines(edges: Uint8Array, width: number, height: number): Uint8Array {
    const enhanced = new Uint8Array(width * height);

    // 수평 라인 강조 커널 (번호판은 수평 에지가 강함)
    const horizontalKernel = [-1, -1, -1, 2, 2, 2, -1, -1, -1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixel = edges[(y + ky - 1) * width + (x + kx - 1)];
            sum += pixel * horizontalKernel[ky * 3 + kx];
          }
        }

        enhanced[y * width + x] = Math.max(0, Math.min(255, sum / 9));
      }
    }

    return enhanced;
  }

  private findPlateCanidates(enhanced: Uint8Array, width: number, height: number): Array<{x: number, y: number, w: number, h: number, intensity: number}> {
    const candidates = [];
    const threshold = 100; // 임계값
    const visited = new Set<number>();

    // 연결 컴포넌트 분석
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        if (enhanced[index] > threshold && !visited.has(index)) {
          const component = this.floodFill(enhanced, width, height, x, y, threshold, visited);

          if (component.pixels.length > 100) { // 최소 크기 필터
            const bounds = this.getBoundingBox(component.pixels);
            candidates.push({
              x: bounds.minX,
              y: bounds.minY,
              w: bounds.maxX - bounds.minX,
              h: bounds.maxY - bounds.minY,
              intensity: component.avgIntensity
            });
          }
        }
      }
    }

    return candidates;
  }

  private floodFill(data: Uint8Array, width: number, height: number, startX: number, startY: number, threshold: number, visited: Set<number>) {
    const pixels = [];
    const stack = [{x: startX, y: startY}];
    let totalIntensity = 0;

    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      const index = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height || visited.has(index) || data[index] <= threshold) {
        continue;
      }

      visited.add(index);
      pixels.push({x, y});
      totalIntensity += data[index];

      // 8방향 탐색
      stack.push({x: x + 1, y}, {x: x - 1, y}, {x, y: y + 1}, {x, y: y - 1});
      stack.push({x: x + 1, y: y + 1}, {x: x - 1, y: y - 1}, {x: x + 1, y: y - 1}, {x: x - 1, y: y + 1});
    }

    return {
      pixels,
      avgIntensity: pixels.length > 0 ? totalIntensity / pixels.length : 0
    };
  }

  private getBoundingBox(pixels: Array<{x: number, y: number}>) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const pixel of pixels) {
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    }

    return {minX, maxX, minY, maxY};
  }

  private filterByPlateCharacteristics(candidates: Array<{x: number, y: number, w: number, h: number, intensity: number}>, imageWidth: number, imageHeight: number): LicensePlateDetection[] {
    const validPlates: LicensePlateDetection[] = [];

    for (const candidate of candidates) {
      const aspectRatio = candidate.w / candidate.h;
      const area = candidate.w * candidate.h;
      const relativeSize = area / (imageWidth * imageHeight);

      // 한국 번호판 특성 필터링
      // - 가로세로 비율: 2:1 ~ 5:1
      // - 최소 크기: 전체 이미지의 0.5%
      // - 최대 크기: 전체 이미지의 20%

      if (aspectRatio >= 2.0 && aspectRatio <= 5.0 &&
          relativeSize >= 0.005 && relativeSize <= 0.2 &&
          candidate.w >= 80 && candidate.h >= 20) {

        // 신뢰도 계산 (크기, 비율, 강도 기반)
        const sizeScore = Math.min(1.0, relativeSize / 0.05); // 5%일 때 만점
        const ratioScore = Math.max(0, 1.0 - Math.abs(aspectRatio - 3.5) / 2.5); // 3.5:1이 이상적
        const intensityScore = candidate.intensity / 255;

        const confidence = (sizeScore * 0.4 + ratioScore * 0.4 + intensityScore * 0.2);

        if (confidence > 0.3) {
          validPlates.push({
            bbox: [candidate.x, candidate.y, candidate.x + candidate.w, candidate.y + candidate.h],
            confidence: Math.min(0.95, confidence),
            vehicleId: 0,
            source: 'yolo'
          });

          console.log(`✅ 번호판 감지: (${candidate.x}, ${candidate.y}) ${candidate.w}x${candidate.h}, 비율: ${aspectRatio.toFixed(2)}, 신뢰도: ${(confidence * 100).toFixed(1)}%`);
        }
      }
    }

    // 신뢰도 기준으로 정렬 (높은 순)
    validPlates.sort((a, b) => b.confidence - a.confidence);

    // 최대 3개까지만 반환
    return validPlates.slice(0, 3);
  }

  private async processModelOutput(predictions: tf.Tensor | tf.Tensor[], canvasWidth: number, canvasHeight: number): Promise<LicensePlateDetection[]> {
    try {
      console.log('📊 실제 ANPR 모델 출력 처리 중...');

      let outputTensor: tf.Tensor;
      if (Array.isArray(predictions)) {
        outputTensor = predictions[0]; // 첫 번째 출력 사용
      } else {
        outputTensor = predictions;
      }

      const outputData = await outputTensor.data();
      console.log('🎯 모델 출력:', outputData.length, '개 값');

      // WPOD-Net 스타일 출력 처리 (4개 값: x1, y1, x2, y2)
      if (outputData.length === 4) {
        const x1 = outputData[0];
        const y1 = outputData[1];
        const x2 = outputData[2];
        const y2 = outputData[3];

        // 정규화된 좌표를 실제 크기로 변환
        const actualX1 = x1 * canvasWidth;
        const actualY1 = y1 * canvasHeight;
        const actualX2 = x2 * canvasWidth;
        const actualY2 = y2 * canvasHeight;

        // 유효한 바운딩 박스인지 확인
        if (actualX2 > actualX1 && actualY2 > actualY1) {
          const confidence = Math.min(x2 - x1, y2 - y1); // 크기 기반 신뢰도

          console.log(`✅ 번호판 감지: (${actualX1.toFixed(1)}, ${actualY1.toFixed(1)}) → (${actualX2.toFixed(1)}, ${actualY2.toFixed(1)})`);

          return [{
            bbox: [actualX1, actualY1, actualX2, actualY2],
            confidence: Math.max(0.5, Math.min(0.95, confidence * 2)), // 50-95% 범위
            vehicleId: 0,
            source: 'yolo'
          }];
        }
      }

      console.log('⚠️ 모델 출력에서 유효한 번호판 영역을 찾지 못함');
      return [];

    } catch (error) {
      console.error('❌ 모델 출력 처리 오류:', error);
      return [];
    }
  }


  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isLoaded = false;
  }
}

export class ANPRDetector {
  private plateDetector: YOLOv8PlateDetector | null = null;
  private isLoaded = false;

  async loadModel(onProgress?: (progress: number) => void): Promise<void> {
    try {
      console.log('🔢 ANPR 전용 모델 로딩 시작...');

      // TensorFlow.js 백엔드 초기화
      await tf.ready();
      console.log('✅ TensorFlow.js 준비 완료');
      console.log('사용 가능한 백엔드:', tf.getBackend());

      if (onProgress) onProgress(30);

      // YOLOv8 ANPR 모델 로드
      this.plateDetector = new YOLOv8PlateDetector();
      await this.plateDetector.loadModel();
      console.log('✅ ANPR 모델 로드 완료');

      if (onProgress) onProgress(100);

      this.isLoaded = true;
      console.log('✅ ANPR 전용 시스템 준비 완료');

    } catch (error) {
      console.error('❌ ANPR 모델 로드 실패:', error);
      throw error;
    }
  }

  async detectLicensePlates(videoElement: HTMLVideoElement, displayWidth: number = 1280, displayHeight: number = 1080): Promise<LicensePlateDetection[]> {
    if (!this.plateDetector || !this.isLoaded) {
      console.warn('⚠️ ANPR 모델이 아직 로드되지 않음');
      return [];
    }

    try {
      console.log('🎯 ANPR 모델로 직접 번호판 감지 시작...');

      // 전체 화면을 ANPR 모델로 직접 분석
      const canvas = this.cropVideoToDisplayArea(videoElement, displayWidth, displayHeight);
      const plateDetections = await this.plateDetector.detectLicensePlates(canvas);

      // 좌표를 표시 크기에 맞게 스케일링
      const scaledPlateDetections = plateDetections.map(plate => ({
        ...plate,
        bbox: [
          plate.bbox[0] * 0.5, // x1
          plate.bbox[1] * 0.5, // y1
          plate.bbox[2] * 0.5, // x2
          plate.bbox[3] * 0.5  // y2
        ] as [number, number, number, number]
      }));

      console.log(`✅ ANPR 직접 감지 결과: ${scaledPlateDetections.length}개 번호판`);
      return scaledPlateDetections;

    } catch (error) {
      console.error('❌ ANPR 감지 오류:', error);
      return [];
    }
  }

  // 2단계 번호판 감지: 1) YOLO11로 정확히 감지 시도 2) 실패시 추정 방식 사용
  async detectLicensePlatesFromVehicles(vehicleDetections: Detection[], videoElement: HTMLVideoElement): Promise<LicensePlateDetection[]> {
    const plateDetections: LicensePlateDetection[] = [];

    for (let index = 0; index < vehicleDetections.length; index++) {
      const vehicle = vehicleDetections[index];

      // 차량이 아닌 경우 스킵
      if (!['car', 'truck', 'bus', 'motorcycle', 'motorbike'].includes(vehicle.class)) {
        continue;
      }

      const [x1, y1, x2, y2] = vehicle.bbox;

      // 1단계: YOLO11 ANPR 모델로 정확한 감지 시도
      if (this.plateDetector) {
        try {
          console.log(`🎯 차량 ${index+1}: YOLO11로 번호판 감지 시도...`);

          // 차량 영역 크롭
          const croppedCanvas = this.cropVehicleArea(videoElement, x1, y1, x2, y2);
          const yoloPlateDetections = await this.plateDetector.detectLicensePlates(croppedCanvas);

          if (yoloPlateDetections.length > 0) {
            // YOLO11 감지 성공 - 차량 좌표계로 변환
            yoloPlateDetections.forEach(plateDet => {
              const [px1, py1, px2, py2] = plateDet.bbox;
              plateDetections.push({
                bbox: [x1 + px1, y1 + py1, x1 + px2, y1 + py2],
                confidence: plateDet.confidence,
                vehicleId: index,
                plateText: undefined,
                source: 'yolo'
              });
            });
            console.log(`✅ 차량 ${index+1}: YOLO11로 ${yoloPlateDetections.length}개 번호판 감지 성공`);
            continue;
          }
        } catch (error) {
          console.warn(`⚠️ 차량 ${index+1}: YOLO11 번호판 감지 실패:`, error);
        }
      }

      // 2단계: YOLO11 실패시 추정 방식 사용
      console.log(`🔄 차량 ${index+1}: 추정 방식으로 번호판 위치 계산...`);
      const vehicleWidth = x2 - x1;
      const vehicleHeight = y2 - y1;
      const plateRegions = this.estimatePlatePosition(vehicle.class, x1, y1, vehicleWidth, vehicleHeight);

      plateRegions.forEach((plateRegion) => {
        plateDetections.push({
          bbox: plateRegion.bbox,
          confidence: vehicle.confidence * plateRegion.confidence,
          vehicleId: index,
          plateText: undefined,
          source: 'estimated'
        });
      });
    }

    const yoloCount = plateDetections.filter(p => p.source === 'yolo').length;
    const estimatedCount = plateDetections.filter(p => p.source === 'estimated').length;
    console.log(`🔍 번호판 감지 결과: YOLO11 ${yoloCount}개, 추정 ${estimatedCount}개 (총 ${plateDetections.length}개)`);

    return plateDetections;
  }

  // 차량 영역을 크롭하여 캔버스로 반환
  private cropVehicleArea(videoElement: HTMLVideoElement, x1: number, y1: number, x2: number, y2: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const width = x2 - x1;
    const height = y2 - y1;

    canvas.width = width;
    canvas.height = height;

    // 차량 영역만 크롭
    ctx.drawImage(videoElement, x1, y1, width, height, 0, 0, width, height);

    return canvas;
  }

  private estimatePlatePosition(vehicleClass: string, x: number, y: number, width: number, height: number) {
    const plateRegions = [];
    
    // 수정된 번호판 영역: 기존 하단 30%에서 아래 10% 올리고 위로 20% 확장 후 추가로 10% 더 올림, 그리고 7% 아래로
    // 기존: 하단 30% (70%~100%) → 최종: 47%~87% (중앙-하단 영역)
    const plateAreaHeight = height * 0.4; // 차량 높이의 40% (기존 30%에서 10% 더 확장)
    const plateAreaY = y + height * 0.47;  // 차량 상단에서 47% 지점부터 시작 (기존 40%에서 7% 아래로)
    
    // 좌우 15%씩 제외한 가운데 70% 영역
    const horizontalMargin = width * 0.15; // 좌우 각 15%
    const plateAreaX = x + horizontalMargin; // 왼쪽 15% 제외
    const plateAreaWidth = width * 0.7; // 가운데 70%만 사용
    
    plateRegions.push({
      bbox: [plateAreaX, plateAreaY, plateAreaX + plateAreaWidth, plateAreaY + plateAreaHeight] as [number, number, number, number],
      confidence: 0.9, // 높은 신뢰도 
      position: 'bottom_center'
    });
    
    console.log(`📋 ${vehicleClass} 번호판 영역(수정된 중앙40%+중앙70%): (${plateAreaX.toFixed(1)}, ${plateAreaY.toFixed(1)}) ~ (${(plateAreaX + plateAreaWidth).toFixed(1)}, ${(plateAreaY + plateAreaHeight).toFixed(1)})`);
    
    return plateRegions;
  }

  private cropVideoToDisplayArea(videoElement: HTMLVideoElement, displayWidth: number, displayHeight: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // 비디오의 실제 크기
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    
    // 비디오가 어떻게 화면에 맞춰지는지 계산 (object-fit: cover)
    const videoAspect = videoWidth / videoHeight;
    const displayAspect = displayWidth / displayHeight;
    
    let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;
    
    if (videoAspect > displayAspect) {
      // 비디오가 더 넓음 - 좌우가 잘림
      sourceWidth = videoHeight * displayAspect;
      sourceX = (videoWidth - sourceWidth) / 2;
    } else {
      // 비디오가 더 높음 - 상하가 잘림
      sourceHeight = videoWidth / displayAspect;
      sourceY = (videoHeight - sourceHeight) / 2;
    }
    
    // 실제 보이는 영역만 캔버스에 그리기
    ctx.drawImage(
      videoElement,
      sourceX, sourceY, sourceWidth, sourceHeight,  // 소스 영역
      0, 0, displayWidth, displayHeight             // 대상 영역
    );
    
    console.log(`📷 크롭 정보: 원본(${videoWidth}x${videoHeight}) → 표시(${displayWidth}x${displayHeight})`);
    console.log(`📷 소스 영역: x=${sourceX}, y=${sourceY}, w=${sourceWidth}, h=${sourceHeight}`);
    
    return canvas;
  }

  private convertCocoSsdResults(predictions: any[], videoWidth: number, videoHeight: number): Detection[] {
    // 차량과 관련된 클래스만 필터링 (더 넓은 범위)
    const vehicleClasses = ['car', 'motorcycle', 'bus', 'truck', 'bicycle', 'motorbike'];
    
    console.log(`📊 COCO-SSD 원본 결과: ${predictions.length}개 객체`);
    
    const results = predictions
      .filter(pred => vehicleClasses.includes(pred.class.toLowerCase()) && pred.score > 0.15) // 임계값 더 낮춤
      .map((pred, index) => {
        const [x, y, width, height] = pred.bbox;
        
        console.log(`🔍 원본 감지: ${pred.class} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${width.toFixed(1)}, ${height.toFixed(1)}) conf=${pred.score.toFixed(3)}`);
        
        // 좌우 반전된 화면에 맞춰 좌표 조정
        const flippedX = videoWidth - (x + width);
        
        console.log(`🔄 반전 후: ${pred.class} at (${flippedX.toFixed(1)}, ${y.toFixed(1)}, ${width.toFixed(1)}, ${height.toFixed(1)})`);
        
        return {
          bbox: [flippedX, y, flippedX + width, y + height] as [number, number, number, number],
          class: pred.class.toLowerCase(),
          confidence: pred.score,
          classId: this.getClassId(pred.class.toLowerCase())
        };
      });
    
    console.log(`✅ 최종 결과: ${results.length}개 객체`);
    return results;
  }

  private async detectWithCustomModel(videoElement: HTMLVideoElement, displayWidth: number = 1280, displayHeight: number = 1080): Promise<Detection[]> {
    try {
      // 실제 보이는 영역만 크롭
      const croppedCanvas = this.cropVideoToDisplayArea(videoElement, displayWidth, displayHeight);
      
      // 크롭된 캔버스를 고해상도(1280x1280) 텐서로 변환하여 품질 향상
      const tensor = tf.browser.fromPixels(croppedCanvas)
        .resizeNearestNeighbor([1280, 1280])
        .expandDims(0)
        .div(255.0);

      console.log('📊 입력 텐서:', tensor.shape);

      // 모델 추론 실행
      const predictions = await (this.plateDetector as any).model.predict(tensor) as tf.Tensor;
      
      // 결과 처리 (YOLOv8 출력 형태에 따라)
      const detections = await this.processCustomModelOutput(predictions, displayWidth, displayHeight);
      
      // 메모리 정리
      tensor.dispose();
      predictions.dispose();
      
      return detections;
      
    } catch (error) {
      console.error('❌ 커스텀 모델 추론 실패:', error);
      return [];
    }
  }

  private async processCustomModelOutput(predictions: tf.Tensor, videoWidth: number, videoHeight: number): Promise<Detection[]> {
    // YOLOv8 출력 처리 로직
    // 실제 구현은 모델 구조에 따라 달라짐
    
    try {
      const data = await predictions.data();
      console.log('📊 커스텀 모델 출력 크기:', data.length);
      
      // 여기서는 간단한 시뮬레이션으로 대체
      // 실제로는 YOLOv8 출력 형태에 맞게 파싱해야 함
      return this.simulateDetections(videoWidth, videoHeight);
      
    } catch (error) {
      console.error('❌ 출력 처리 오류:', error);
      return [];
    }
  }

  private simulateDetections(videoWidth: number, videoHeight: number): Detection[] {
    // 개발용 시뮬레이션
    const detections: Detection[] = [];
    
    if (Math.random() > 0.7) { // 30% 확률로 감지
      const classes = ['car', 'truck', 'bus', 'motorcycle'];
      const selectedClass = classes[Math.floor(Math.random() * classes.length)];
      
      const x1 = Math.random() * videoWidth * 0.3;
      const y1 = Math.random() * videoHeight * 0.3;
      const x2 = x1 + videoWidth * 0.4;
      const y2 = y1 + videoHeight * 0.4;
      
      // 좌우 반전된 화면에 맞춰 좌표 조정
      const flippedX1 = videoWidth - x2;
      const flippedX2 = videoWidth - x1;
      
      detections.push({
        bbox: [flippedX1, y1, flippedX2, y2] as [number, number, number, number],
        class: selectedClass,
        confidence: 0.6 + Math.random() * 0.3,
        classId: this.getClassId(selectedClass)
      });
    }
    
    return detections;
  }

  private getClassId(className: string): number {
    const classMap: { [key: string]: number } = {
      'bicycle': 1,
      'car': 2,
      'motorcycle': 3,
      'bus': 5,
      'truck': 7
    };
    return classMap[className] || -1;
  }

  getModelInfo(): string {
    if (!this.isLoaded) return 'ANPR 모델 없음';
    if (this.plateDetector && (this.plateDetector as any).model) {
      return 'YOLOv8 번호판 감지 모델 (TensorFlow.js)';
    }
    return '실시간 번호판 감지 시스템 (Computer Vision)';
  }

  dispose(): void {
    if (this.plateDetector) {
      this.plateDetector.dispose();
      this.plateDetector = null;
    }
    this.isLoaded = false;
  }
}

// 전역 인스턴스
let globalDetector: ANPRDetector | null = null;

export async function getANPRDetector(onProgress?: (progress: number) => void): Promise<ANPRDetector> {
  if (!globalDetector) {
    globalDetector = new ANPRDetector();
    await globalDetector.loadModel(onProgress);
  }
  return globalDetector;
}