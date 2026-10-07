#!/usr/bin/env python3
"""
ANPR 모델 다운로드 및 TensorFlow.js 변환 스크립트
"""

import os
import urllib.request
import tensorflow as tf
import tensorflowjs as tfjs

def download_anpr_model():
    """사전 훈련된 ANPR 모델 다운로드"""

    # 1. WPOD-Net 모델 다운로드 (번호판 감지용)
    model_urls = {
        'wpod_net': 'https://github.com/sergiomsilva/alpr-unconstrained/raw/master/data/lp-detector/wpod-net_update1.h5',
        'ocr_model': 'https://github.com/sergiomsilva/alpr-unconstrained/raw/master/data/ocr/ocr-net.h5'
    }

    os.makedirs('models', exist_ok=True)

    for name, url in model_urls.items():
        local_path = f'models/{name}.h5'
        if not os.path.exists(local_path):
            print(f'다운로드 중: {name}...')
            urllib.request.urlretrieve(url, local_path)
            print(f'완료: {local_path}')
        else:
            print(f'이미 존재: {local_path}')

def convert_to_tfjs():
    """Keras 모델을 TensorFlow.js로 변환"""

    models_to_convert = ['wpod_net', 'ocr_model']

    for model_name in models_to_convert:
        keras_path = f'models/{model_name}.h5'
        tfjs_path = f'models/{model_name}_tfjs'

        if os.path.exists(keras_path):
            print(f'변환 중: {model_name}...')

            # Keras 모델 로드
            model = tf.keras.models.load_model(keras_path, compile=False)

            # TensorFlow.js 형태로 변환
            tfjs.converters.save_keras_model(model, tfjs_path)
            print(f'변환 완료: {tfjs_path}')
        else:
            print(f'모델 파일 없음: {keras_path}')

def create_test_html():
    """테스트용 HTML 파일 생성"""

    html_content = """
<!DOCTYPE html>
<html>
<head>
    <title>ANPR 모델 테스트</title>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script>
</head>
<body>
    <h1>ANPR 모델 테스트</h1>
    <input type="file" id="imageInput" accept="image/*">
    <canvas id="canvas" width="640" height="480"></canvas>

    <script>
        async function loadANPRModel() {
            try {
                const model = await tf.loadLayersModel('./models/wpod_net_tfjs/model.json');
                console.log('ANPR 모델 로드 성공!');
                return model;
            } catch (error) {
                console.error('모델 로드 실패:', error);
                return null;
            }
        }

        document.getElementById('imageInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const img = new Image();
                img.onload = async function() {
                    const canvas = document.getElementById('canvas');
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 640, 480);

                    // 모델로 번호판 감지 시도
                    const model = await loadANPRModel();
                    if (model) {
                        // 여기서 실제 추론 수행
                        console.log('번호판 감지 시도...');
                    }
                };
                img.src = URL.createObjectURL(file);
            }
        });

        // 페이지 로드시 모델 로드
        loadANPRModel();
    </script>
</body>
</html>
    """

    with open('anpr_test.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

    print('테스트 HTML 파일 생성: anpr_test.html')

if __name__ == '__main__':
    print('=== ANPR 모델 다운로드 및 변환 ===')

    # 필요한 패키지 설치 확인
    try:
        import tensorflowjs
    except ImportError:
        print('tensorflowjs 패키지 설치 필요: pip install tensorflowjs')
        exit(1)

    # 1. 모델 다운로드
    download_anpr_model()

    # 2. TensorFlow.js로 변환
    convert_to_tfjs()

    # 3. 테스트 HTML 생성
    create_test_html()

    print('\n=== 완료 ===')
    print('1. Python 스크립트 실행: python download_anpr_model.py')
    print('2. 웹 서버 실행 후 anpr_test.html 열기')
    print('3. 차량 이미지 업로드해서 테스트')