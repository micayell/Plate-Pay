import * as tf from '@tensorflow/tfjs';

export interface YOLOv8DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class YOLOv8Downloader {
  private static readonly MODEL_URLS = {
    // ONNX.js 호환 YOLOv8n 모델 URL들
    'yolov8n-web': 'https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx',
    'yolov8n-tfjs': 'https://storage.googleapis.com/tfjs-models/savedmodel/yolov8n-classification/model.json',
    // 로컬 개발용 백업
    'local-backup': '/models/yolov8n/model.json'
  };

  static async downloadModel(
    modelKey: keyof typeof YOLOv8Downloader.MODEL_URLS = 'local-backup',
    onProgress?: (progress: YOLOv8DownloadProgress) => void
  ): Promise<tf.GraphModel> {
    const modelUrl = this.MODEL_URLS[modelKey];
    
    console.log(`📥 YOLOv8n 모델 다운로드 시작: ${modelUrl}`);
    
    try {
      // TensorFlow.js GraphModel 로드 (진행률 콜백 포함)
      const model = await tf.loadGraphModel(modelUrl, {
        onProgress: (fraction) => {
          if (onProgress) {
            onProgress({
              loaded: Math.round(fraction * 100),
              total: 100,
              percentage: Math.round(fraction * 100)
            });
          }
          console.log(`📊 다운로드 진행률: ${Math.round(fraction * 100)}%`);
        }
      });

      console.log('✅ YOLOv8n 모델 다운로드 완료');
      console.log('📋 모델 정보:', {
        inputs: model.inputs.map(input => ({
          name: input.name,
          shape: input.shape,
          dtype: input.dtype
        })),
        outputs: model.outputs.map(output => ({
          name: output.name, 
          shape: output.shape,
          dtype: output.dtype
        }))
      });

      return model;

    } catch (error) {
      console.error(`❌ YOLOv8n 모델 다운로드 실패 (${modelKey}):`, error);
      
      // 다른 URL로 재시도
      if (modelKey !== 'local-backup') {
        console.log('🔄 로컬 백업 모델로 재시도...');
        return this.downloadModel('local-backup', onProgress);
      }
      
      throw new Error(`YOLOv8n 모델을 로드할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async checkModelAvailability(modelKey: keyof typeof YOLOv8Downloader.MODEL_URLS): Promise<boolean> {
    const modelUrl = this.MODEL_URLS[modelKey];
    
    try {
      const response = await fetch(modelUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  static getModelSize(modelKey: keyof typeof YOLOv8Downloader.MODEL_URLS): string {
    const sizes = {
      'yolov8n-web': '~6MB',
      'yolov8n-tfjs': '~12MB', 
      'local-backup': '~8MB'
    };
    
    return sizes[modelKey] || '알 수 없음';
  }
}