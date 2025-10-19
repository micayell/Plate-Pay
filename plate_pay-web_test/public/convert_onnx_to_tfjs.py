#!/usr/bin/env python3
"""
ONNX 모델을 TensorFlow.js로 변환하는 스크립트
"""

import os
import sys

def convert_onnx_to_tfjs():
    try:
        print("🔄 ONNX → TensorFlow.js 변환 시작...")

        # 1. 필요한 패키지 설치
        print("📦 필요한 패키지 설치 중...")
        os.system("py -m pip install onnx tf2onnx tensorflow tensorflowjs")

        # 2. ONNX → TensorFlow SavedModel 변환
        print("🔄 ONNX → TensorFlow SavedModel 변환...")
        onnx_path = "license_plate_detector.onnx"
        saved_model_path = "license_plate_detector_tf"

        os.system(f"python -m tf2onnx.convert --onnx {onnx_path} --output {saved_model_path} --inputs images:0 --outputs output0:0")

        # 3. TensorFlow SavedModel → TensorFlow.js 변환
        print("🔄 TensorFlow SavedModel → TensorFlow.js 변환...")
        tfjs_path = "models/license_plate_detector_tfjs"

        os.system(f"tensorflowjs_converter --input_format=tf_saved_model --output_format=tfjs_graph_model {saved_model_path} {tfjs_path}")

        print(f"✅ 변환 완료: {tfjs_path}")
        print("📋 TensorFlow.js 모델이 생성되었습니다!")

    except Exception as e:
        print(f"❌ 변환 실패: {e}")
        print("💡 대신 Computer Vision 모드로 번호판을 감지합니다.")

if __name__ == "__main__":
    convert_onnx_to_tfjs()