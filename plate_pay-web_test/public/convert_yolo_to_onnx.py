#!/usr/bin/env python3
"""
YOLOv8 .pt 모델을 ONNX로 변환하는 스크립트
"""

from ultralytics import YOLO
import torch

def convert_pt_to_onnx(pt_path, onnx_path):
    """
    YOLOv8 .pt 모델을 ONNX 형식으로 변환

    Args:
        pt_path: .pt 모델 파일 경로
        onnx_path: 출력할 .onnx 파일 경로
    """
    try:
        print(f"🔄 YOLOv8 모델 로딩: {pt_path}")

        # YOLOv8 모델 로드
        model = YOLO(pt_path)

        print("📤 ONNX 형식으로 변환 중...")

        # ONNX로 내보내기
        model.export(
            format='onnx',
            imgsz=640,  # 입력 이미지 크기
            simplify=True,  # 모델 단순화
            dynamic=False,  # 고정 크기 입력
            opset=11  # ONNX opset 버전
        )

        print(f"✅ 변환 완료: {onnx_path}")
        print("📋 웹에서 사용 가능한 ONNX 모델이 생성되었습니다.")

    except Exception as e:
        print(f"❌ 변환 실패: {e}")
        print("💡 ultralytics를 설치하세요: pip install ultralytics")

if __name__ == "__main__":
    # 모델 파일 경로 설정
    pt_model_path = "license_plate_detector.pt"  # 다운로드한 .pt 파일
    onnx_model_path = "license_plate_detector.onnx"  # 변환될 .onnx 파일

    convert_pt_to_onnx(pt_model_path, onnx_model_path)