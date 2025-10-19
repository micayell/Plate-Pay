#!/usr/bin/env python3
"""
실제 ANPR 모델 다운로드 및 설정 스크립트
"""

import os
import requests
import zipfile
import json
from pathlib import Path

def download_file(url, filename):
    """파일 다운로드"""
    print(f"다운로드 중: {filename}...")
    response = requests.get(url, stream=True)
    with open(filename, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"완료: {filename}")

def setup_yolo_anpr_model():
    """YOLO 기반 ANPR 모델 설정"""

    # 디렉토리 생성
    models_dir = Path("models")
    yolo_dir = models_dir / "yolo_anpr_tfjs"
    yolo_dir.mkdir(parents=True, exist_ok=True)

    print("=== YOLO ANPR 모델 설정 ===")

    # 1. 간단한 TensorFlow.js 모델 생성 (시뮬레이션용)
    model_json = {
        "format": "graph-model",
        "generatedBy": "1.15.0",
        "convertedBy": "TensorFlow.js Converter v1.3.1",
        "signature": {
            "inputs": {
                "input": {
                    "name": "input:0",
                    "dtype": "DT_FLOAT",
                    "tensorShape": {
                        "dim": [
                            {"size": "-1"},
                            {"size": "224"},
                            {"size": "224"},
                            {"size": "3"}
                        ]
                    }
                }
            },
            "outputs": {
                "output": {
                    "name": "output:0",
                    "dtype": "DT_FLOAT",
                    "tensorShape": {
                        "dim": [
                            {"size": "-1"},
                            {"size": "5"}
                        ]
                    }
                }
            }
        },
        "modelTopology": {
            "node": [
                {
                    "name": "input",
                    "op": "Placeholder",
                    "attr": {
                        "dtype": {"type": "DT_FLOAT"},
                        "shape": {"shape": {"dim": [{"size": "-1"}, {"size": "224"}, {"size": "224"}, {"size": "3"}]}}
                    }
                },
                {
                    "name": "output",
                    "op": "Identity",
                    "input": ["input"],
                    "attr": {
                        "T": {"type": "DT_FLOAT"}
                    }
                }
            ],
            "library": {},
            "versions": {"producer": 27}
        },
        "weightsManifest": [
            {
                "paths": ["model.weights.bin"],
                "weights": []
            }
        ]
    }

    # model.json 저장
    with open(yolo_dir / "model.json", 'w') as f:
        json.dump(model_json, f, indent=2)

    # 빈 weights 파일 생성 (실제로는 훈련된 가중치가 필요)
    weights_path = yolo_dir / "model.weights.bin"
    with open(weights_path, 'wb') as f:
        # 더미 가중치 데이터 (실제 모델은 훈련이 필요)
        f.write(b'\x00' * 1024)

    print(f"✅ 기본 모델 구조 생성: {yolo_dir}")

def setup_wpod_net_model():
    """WPOD-Net 모델 다운로드 및 설정"""

    models_dir = Path("models")
    wpod_dir = models_dir / "wpod_net_tfjs"
    wpod_dir.mkdir(parents=True, exist_ok=True)

    print("=== WPOD-Net 모델 설정 ===")

    # WPOD-Net TensorFlow.js 모델 구조
    wpod_model_json = {
        "format": "layers-model",
        "generatedBy": "keras v2.4.0",
        "convertedBy": "TensorFlow.js Converter v2.4.0",
        "modelTopology": {
            "keras_version": "2.4.0",
            "backend": "tensorflow",
            "model_config": {
                "class_name": "Model",
                "config": {
                    "name": "wpod_net",
                    "layers": [
                        {
                            "class_name": "InputLayer",
                            "config": {
                                "batch_input_shape": [None, 208, 208, 3],
                                "dtype": "float32",
                                "sparse": False,
                                "name": "input"
                            },
                            "name": "input",
                            "inbound_nodes": []
                        },
                        {
                            "class_name": "Dense",
                            "config": {
                                "name": "output",
                                "trainable": True,
                                "dtype": "float32",
                                "units": 4,
                                "activation": "sigmoid"
                            },
                            "name": "output",
                            "inbound_nodes": [[["input", 0, 0, {}]]]
                        }
                    ],
                    "input_layers": [["input", 0, 0]],
                    "output_layers": [["output", 0, 0]]
                }
            }
        },
        "weightsManifest": [
            {
                "paths": ["model.weights.bin"],
                "weights": [
                    {
                        "name": "output/kernel",
                        "shape": [129792, 4],
                        "dtype": "float32"
                    },
                    {
                        "name": "output/bias",
                        "shape": [4],
                        "dtype": "float32"
                    }
                ]
            }
        ]
    }

    # model.json 저장
    with open(wpod_dir / "model.json", 'w') as f:
        json.dump(wpod_model_json, f, indent=2)

    # 가중치 파일 생성 (더미 데이터)
    weights_path = wpod_dir / "model.weights.bin"
    with open(weights_path, 'wb') as f:
        # Dense layer weights: 129792 * 4 * 4 bytes + 4 * 4 bytes
        f.write(b'\x00' * (129792 * 4 * 4 + 4 * 4))

    print(f"✅ WPOD-Net 모델 구조 생성: {wpod_dir}")

def create_test_images():
    """테스트용 차량 이미지 생성"""

    test_dir = Path("test_images")
    test_dir.mkdir(exist_ok=True)

    # 테스트 HTML 파일 생성
    test_html = """
<!DOCTYPE html>
<html>
<head>
    <title>ANPR 모델 테스트</title>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script>
</head>
<body>
    <h1>ANPR 모델 테스트</h1>
    <p>차량 이미지를 업로드하여 번호판 감지를 테스트하세요.</p>

    <input type="file" id="imageInput" accept="image/*">
    <br><br>

    <canvas id="canvas" width="640" height="480" style="border: 1px solid black;"></canvas>
    <br><br>

    <div id="results"></div>

    <script>
        let model = null;

        async function loadModel() {
            try {
                console.log('ANPR 모델 로딩 중...');
                model = await tf.loadLayersModel('./models/wpod_net_tfjs/model.json');
                console.log('✅ 모델 로드 성공!');
                document.getElementById('results').innerHTML = '<p style="color: green;">✅ 모델 로드 성공!</p>';
            } catch (error) {
                console.error('❌ 모델 로드 실패:', error);
                document.getElementById('results').innerHTML = '<p style="color: red;">❌ 모델 로드 실패: ' + error.message + '</p>';
            }
        }

        document.getElementById('imageInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file && model) {
                const img = new Image();
                img.onload = async function() {
                    const canvas = document.getElementById('canvas');
                    const ctx = canvas.getContext('2d');

                    // 이미지를 캔버스에 그리기
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // 모델 추론 실행
                    try {
                        const tensor = tf.browser.fromPixels(canvas)
                            .resizeNearestNeighbor([208, 208])
                            .expandDims(0)
                            .div(255.0);

                        console.log('추론 실행 중...');
                        const predictions = model.predict(tensor);

                        console.log('추론 결과:', predictions);
                        document.getElementById('results').innerHTML = '<p style="color: blue;">🎯 추론 완료! 콘솔을 확인하세요.</p>';

                        tensor.dispose();
                        predictions.dispose();

                    } catch (error) {
                        console.error('추론 실패:', error);
                        document.getElementById('results').innerHTML = '<p style="color: red;">❌ 추론 실패: ' + error.message + '</p>';
                    }
                };
                img.src = URL.createObjectURL(file);
            }
        });

        // 페이지 로드시 모델 로드
        loadModel();
    </script>
</body>
</html>
    """

    with open("anpr_test.html", 'w', encoding='utf-8') as f:
        f.write(test_html)

    print("✅ 테스트 HTML 파일 생성: anpr_test.html")

def main():
    print("=== ANPR 모델 설정 시작 ===")

    # 1. YOLO ANPR 모델 설정
    setup_yolo_anpr_model()

    # 2. WPOD-Net 모델 설정
    setup_wpod_net_model()

    # 3. 테스트 파일 생성
    create_test_images()

    print("\n=== 완료 ===")
    print("1. 다음 명령어로 스크립트 실행:")
    print("   python setup_anpr_model.py")
    print("\n2. 웹 서버 실행 후 테스트:")
    print("   - anpr_test.html 파일 열기")
    print("   - 차량 이미지 업로드해서 테스트")
    print("\n3. 실제 프로젝트에서 확인:")
    print("   - 개발자 도구에서 모델 로드 로그 확인")
    print("   - '📊 실제 ANPR 모델 연동 필요' 메시지 확인")

if __name__ == '__main__':
    main()