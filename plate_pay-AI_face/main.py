from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import numpy as np
from PIL import Image
import io
import base64
import os
import tempfile
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel
import asyncio

app = FastAPI(title="Face Recognition API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic 모델들
class ImageToBase64Response(BaseModel):
    success: bool
    message: str
    base64_data: Optional[str] = None

class FaceCompareRequest(BaseModel):
    base64_text: str

class FaceCompareResponse(BaseModel):
    success: bool
    message: str
    is_same_person: bool
    confidence: Optional[float] = None


def extract_face_embedding(image_array: np.ndarray) -> Optional[np.ndarray]:
    """DeepFace를 사용하여 이미지에서 얼굴 임베딩 추출"""
    try:
        print(f"🔍 얼굴 임베딩 추출 시작 - 이미지 크기: {image_array.shape}")
        
        # 임시 파일로 이미지 저장 (DeepFace가 파일 경로를 요구함)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            # numpy array를 PIL Image로 변환 후 저장
            if len(image_array.shape) == 3:
                image = Image.fromarray(image_array)
            else:
                image = Image.fromarray(image_array, mode='L')
            
            image.save(temp_file.name, 'JPEG')
            temp_path = temp_file.name
            print(f"📁 임시 이미지 파일 저장됨: {temp_path}")
        
        try:
            # DeepFace로 얼굴 임베딩 추출 (VGG-Face 모델 사용)
            print("🤖 DeepFace VGG-Face 모델로 얼굴 분석 중...")
            embedding_result = DeepFace.represent(img_path=temp_path, model_name='VGG-Face', enforce_detection=True)
            print(f"✅ 얼굴 임베딩 추출 성공!")
            
            # 결과가 리스트 형태일 수 있음
            if isinstance(embedding_result, list) and len(embedding_result) > 0:
                embedding = np.array(embedding_result[0]['embedding'])
                print(f"📊 임베딩 벡터 크기: {embedding.shape}, 범위: [{embedding.min():.4f}, {embedding.max():.4f}]")
            else:
                embedding = np.array(embedding_result['embedding'])
                print(f"📊 임베딩 벡터 크기: {embedding.shape}, 범위: [{embedding.min():.4f}, {embedding.max():.4f}]")
            
            return embedding
            
        finally:
            # 임시 파일 삭제
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                print(f"🗑️ 임시 파일 삭제됨: {temp_path}")
    
    except ValueError as e:
        if "Face could not be detected" in str(e):
            print(f"❌ 얼굴 감지 실패: 이미지에서 얼굴을 찾을 수 없습니다.")
            print(f"💡 해결 방법: 더 명확한 얼굴 사진을 사용하세요 (정면, 밝은 조명)")
        else:
            print(f"❌ 얼굴 분석 오류: {str(e)}")
        return None
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {str(e)}")
        print(f"🔧 오류 타입: {type(e).__name__}")
        return None

def compare_faces_deepface(known_embedding: np.ndarray, test_embedding: np.ndarray, threshold: float = 0.6) -> Tuple[bool, float]:
    """두 얼굴 임베딩 비교 (코사인 유사도 사용)"""
    try:
        # 코사인 유사도 계산
        dot_product = np.dot(known_embedding, test_embedding)
        norm_a = np.linalg.norm(known_embedding)
        norm_b = np.linalg.norm(test_embedding)
        
        if norm_a == 0 or norm_b == 0:
            return False, 0.0
        
        cosine_similarity = dot_product / (norm_a * norm_b)
        
        # 신뢰도 계산 (0-100%)
        confidence = max(0, cosine_similarity * 100)
        
        # 매치 여부 판단 (threshold보다 높으면 같은 사람)
        is_match = cosine_similarity >= threshold
        
        return is_match, confidence
    
    except Exception as e:
        print(f"Error comparing faces: {str(e)}")
        return False, 0.0

async def process_uploaded_image(file: UploadFile) -> np.ndarray:
    """업로드된 이미지 파일 처리"""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="업로드된 파일이 이미지가 아닙니다.")
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # RGB로 변환
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return np.array(image)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"이미지 처리 중 오류 발생: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Face Recognition API"}

@app.post("/api/v1/image/to-base64", response_model=ImageToBase64Response)
async def convert_image_to_base64(file: UploadFile = File(...)):
    """이미지를 base64로 변환하는 API"""

    print(f"\n📸 이미지를 base64로 변환 요청 - 파일: {file.filename}")

    try:
        # 이미지 처리
        image_array = await process_uploaded_image(file)
        print(f"🖼️ 이미지 처리 완료 - 크기: {image_array.shape}")

        # 얼굴 임베딩 추출
        face_embedding = extract_face_embedding(image_array)

        if face_embedding is None:
            print(f"❌ 얼굴 임베딩 추출 실패")
            return ImageToBase64Response(
                success=False,
                message="이미지에서 얼굴을 찾을 수 없습니다. 명확한 얼굴 사진을 사용해주세요."
            )

        # NumPy 배열을 base64로 변환
        base64_data = base64.b64encode(face_embedding.tobytes()).decode('utf-8')

        print(f"✅ base64 변환 완료 - 길이: {len(base64_data)} 문자")

        return ImageToBase64Response(
            success=True,
            message="이미지가 성공적으로 base64로 변환되었습니다.",
            base64_data=base64_data
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 이미지 변환 중 예상치 못한 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"이미지 변환 중 오류 발생: {str(e)}")

@app.post("/api/v1/face/compare", response_model=FaceCompareResponse)
async def compare_face_with_base64(file: UploadFile = File(...), base64_text: str = Form(...)):
    """이미지와 base64 텍스트를 비교하여 동일 인물인지 확인하는 API"""

    print(f"\n🔍 얼굴 비교 요청 - 파일: {file.filename}")

    try:
        # 업로드된 이미지 처리
        image_array = await process_uploaded_image(file)
        print(f"🖼️ 업로드 이미지 처리 완료 - 크기: {image_array.shape}")

        # 새 얼굴 임베딩 추출
        new_face_embedding = extract_face_embedding(image_array)

        if new_face_embedding is None:
            print(f"❌ 업로드 이미지에서 얼굴 임베딩 추출 실패")
            return FaceCompareResponse(
                success=False,
                message="업로드된 이미지에서 얼굴을 찾을 수 없습니다. 명확한 얼굴 사진을 사용해주세요.",
                is_same_person=False
            )

        # base64 텍스트를 NumPy 배열로 변환
        try:
            face_bytes = base64.b64decode(base64_text.encode('utf-8'))
            stored_face_embedding = np.frombuffer(face_bytes, dtype=np.float64)
            print(f"📊 base64에서 복원된 임베딩 크기: {stored_face_embedding.shape}")
        except Exception as e:
            print(f"❌ base64 텍스트 디코딩 실패: {str(e)}")
            return FaceCompareResponse(
                success=False,
                message="잘못된 base64 텍스트입니다.",
                is_same_person=False
            )

        print(f"📊 새로운 임베딩 크기: {new_face_embedding.shape}")

        # 얼굴 비교
        print(f"🔄 얼굴 유사도 비교 중...")
        is_match, confidence = compare_faces_deepface(stored_face_embedding, new_face_embedding)

        print(f"📈 유사도 점수: {confidence:.2f}%")
        print(f"🎯 임계값: 60.0%")

        if is_match:
            print(f"✅ 동일 인물 확인! (신뢰도: {confidence:.2f}%)")
            return FaceCompareResponse(
                success=True,
                message="동일한 인물입니다.",
                is_same_person=True,
                confidence=round(confidence, 2)
            )
        else:
            print(f"❌ 다른 인물 (신뢰도: {confidence:.2f}% < 60.0%)")
            return FaceCompareResponse(
                success=True,
                message="다른 인물입니다.",
                is_same_person=False,
                confidence=round(confidence, 2)
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 얼굴 비교 중 예상치 못한 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"얼굴 비교 중 오류 발생: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)