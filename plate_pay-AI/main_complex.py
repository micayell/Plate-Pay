from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import easyocr
import cv2
import numpy as np
from PIL import Image
import io
import re
import time
from ultralytics import YOLO
import torch

app = FastAPI(title="License Plate OCR API", version="1.0.0")

# EasyOCR 리더 초기화 (한국어, 영어 지원) - GPU 사용 시도
try:
    reader = easyocr.Reader(['ko', 'en'], gpu=True)
    print("GPU 가속 사용")
except:
    reader = easyocr.Reader(['ko', 'en'], gpu=False)
    print("CPU 사용")

# YOLO 모델과 차량 클래스 (lazy loading)
vehicle_model = None
VEHICLE_CLASSES = [2, 3, 5, 7]  # car, motorcycle, bus, truck

def get_vehicle_model():
    """YOLO 모델 lazy loading"""
    global vehicle_model
    if vehicle_model is None:
        try:
            # PyTorch 2.6+ 호환성
            import torch
            from ultralytics.nn.tasks import DetectionModel
            torch.serialization.add_safe_globals([DetectionModel])
            vehicle_model = YOLO('yolov8n.pt')
        except Exception:
            # fallback: weights_only=False로 로드
            import torch
            original_load = torch.load
            torch.load = lambda *args, **kwargs: original_load(*args, **{**kwargs, 'weights_only': False})
            vehicle_model = YOLO('yolov8n.pt')
            torch.load = original_load
    return vehicle_model

def detect_vehicles(image_array):
    """YOLO를 사용한 차량 감지"""
    model = get_vehicle_model()
    results = model(image_array)
    vehicles = []
    
    for result in results:
        boxes = result.boxes
        if boxes is not None:
            for box in boxes:
                # 차량 클래스만 필터링
                if int(box.cls) in VEHICLE_CLASSES and float(box.conf) > 0.5:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    vehicles.append({
                        'bbox': [x1, y1, x2, y2],
                        'confidence': float(box.conf),
                        'class': int(box.cls)
                    })
    
    return vehicles

def detect_license_plate_regions(vehicle_crop):
    """차량 이미지에서 번호판 후보 영역 검출"""
    gray = cv2.cvtColor(vehicle_crop, cv2.COLOR_BGR2GRAY)
    
    # 번호판은 보통 직사각형이고 가로가 세로보다 길다
    # 윤곽선 검출로 번호판 후보 찾기
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    # 모폴로지 연산으로 윤곽선 연결
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    
    # 윤곽선 찾기
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    plate_candidates = []
    h, w = vehicle_crop.shape[:2]
    
    for contour in contours:
        # 윤곽선 영역 계산
        x, y, cw, ch = cv2.boundingRect(contour)
        aspect_ratio = cw / ch if ch > 0 else 0
        area = cw * ch
        
        # 번호판 비율과 크기 조건 (더 관대하게)
        if (1.5 < aspect_ratio < 8.0 and  # 가로세로 비율 더 넓게
            area > (w * h * 0.005) and    # 최소 크기 더 작게
            area < (w * h * 0.5) and      # 최대 크기 더 크게
            ch > 8 and cw > 30):          # 절대 최소 크기 더 작게
            
            plate_candidates.append({
                'bbox': [x, y, x + cw, y + ch],
                'area': area,
                'aspect_ratio': aspect_ratio
            })
    
    # 면적순으로 정렬하여 가장 큰 후보들 반환
    plate_candidates.sort(key=lambda x: x['area'], reverse=True)
    return plate_candidates[:3]  # 상위 3개만

def enhance_license_plate_v1(plate_crop):
    """기본 번호판 향상 (원본 방식)"""
    if len(plate_crop.shape) == 3:
        gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = plate_crop
    
    h, w = gray.shape[:2]
    if w < 300:
        scale = 300 / w
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    else:
        resized = gray
    
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    enhanced = clahe.apply(resized)
    
    return [enhanced]

def enhance_license_plate_v2(plate_crop):
    """최소 전처리 (속도 우선)"""
    if len(plate_crop.shape) == 3:
        gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = plate_crop
    
    # 크기만 조정
    h, w = gray.shape[:2]
    if w < 250:
        scale = 250 / w
        new_w, new_h = int(w * scale), int(h * scale)
        gray = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    
    return [gray]

def enhance_license_plate_v3(plate_crop):
    """다중 전처리 (정확도 우선)"""
    if len(plate_crop.shape) == 3:
        gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = plate_crop
    
    enhanced_versions = []
    
    # 크기 확대
    h, w = gray.shape[:2]
    if w < 350:  # 더 크게 확대
        scale = 350 / w
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    else:
        resized = gray
    
    # CLAHE
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    enhanced1 = clahe.apply(resized)
    enhanced_versions.append(enhanced1)
    
    # 샤프닝
    kernel_sharpen = np.array([[-1,-1,-1], [-1, 9,-1], [-1,-1,-1]])
    sharpened = cv2.filter2D(enhanced1, -1, kernel_sharpen)
    enhanced_versions.append(sharpened)
    
    # 적응형 임계값 (Gaussian)
    blurred = cv2.GaussianBlur(enhanced1, (3, 3), 0)
    thresh1 = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 15, 4)
    enhanced_versions.append(thresh1)
    
    # 적응형 임계값 (Mean)
    thresh2 = cv2.adaptiveThreshold(enhanced1, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                                   cv2.THRESH_BINARY, 11, 8)
    enhanced_versions.append(thresh2)
    
    return enhanced_versions

def enhance_license_plate_v4(plate_crop):
    """단순 이진화 (가장 빠름)"""
    if len(plate_crop.shape) == 3:
        gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = plate_crop
    
    # 크기 조정
    h, w = gray.shape[:2]
    if w < 200:
        scale = 200 / w
        new_w, new_h = int(w * scale), int(h * scale)
        gray = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    
    # 간단한 임계값
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return [thresh]

def preprocess_image(image_array):
    """기본 이미지 전처리 (fallback용)"""
    gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 11, 2)
    kernel = np.ones((3, 3), np.uint8)
    processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    return processed

def correct_ocr_errors(text):
    """한국 번호판 OCR 오류 교정 (한국 번호판 규칙 기반)"""
    # 한국 번호판에서 사용되는 유효한 한글 (정확한 목록)
    valid_korean_chars = {
        '가', '나', '다', '라', '마',  # 자가용 ㅏ계열
        '거', '너', '더', '러', '머',  # 자가용 ㅓ계열
        '고', '노', '도', '로', '모',  # 자가용 ㅗ계열
        '구', '누', '두', '루', '무',  # 자가용 ㅜ계열
        '저',                         # 자가용 ㅓ계열 추가
        '바', '사', '아', '자',       # 영업용
        '배',                         # 영업용(택배)
        '하', '허', '호',            # 렌터카
        '육', '해', '공', '국', '합'  # 군용
    }
    
    # 자주 혼동되는 한글 문자 교정 매핑 (한국 번호판 규칙 기반)
    korean_corrections = {
        # 'ㅏ' 계열
        '깨': '가', '까': '가', '각': '가',
        '내': '나', '낙': '나',
        '댜': '다', '댁': '다', '닥': '다',
        '래': '라', '락': '라',
        '매': '마', '막': '마',
        
        # 'ㅓ' 계열  
        '께': '거', '걱': '거',
        '네': '너', '넥': '너',
        '데': '더', '덕': '더',
        '레': '러', '렉': '러',
        '메': '머', '멱': '머',
        '베': '버', '벡': '버',
        '세': '서', '섹': '서',
        '에': '어', '억': '어',
        '제': '저', '젝': '저',
        
        # 'ㅗ' 계열
        '꼬': '고', '곡': '고',
        '노': '노', '녹': '노',
        '도': '도', '독': '도',
        '로': '로', '록': '로',  # '루'를 '로'로 교정하지 않음
        '모': '모', '목': '모',
        '보': '보', '복': '보',
        '소': '소', '속': '소',
        '오': '오', '옥': '오',
        '조': '조', '족': '조',
        
        # 'ㅜ' 계열
        '꾸': '구', '국': '구',
        '누': '누', '눅': '누',
        '두': '두', '둑': '두',
        '듯': '루', '룻': '루', '룩': '루',  # 주요 교정: '듯' → '루'
        '무': '무', '묵': '무',
        '부': '부', '북': '부',
        '수': '수', '숙': '수',
        '우': '우', '욱': '우',
        '주': '주', '죽': '주',
        
        # 영업용
        '빠': '바', '박': '바',
        '싸': '사', '삭': '사',
        '아': '아', '악': '아',
        '짜': '자', '작': '자',
        
        # 기타
        '해': '배',  # '배'가 '해'로 인식되는 경우
        '허': '하',  # '하'가 '허'로 인식되는 경우
    }
    
    # 숫자 교정 (0과 O, 1과 I 등)
    digit_corrections = {
        'O': '0', 'o': '0', 'I': '1', 'l': '1', 'S': '5', 's': '5',
        'Z': '2', 'z': '2', 'B': '8', 'G': '6', 'g': '9'
    }
    
    corrected = text
    
    # 한글 교정 적용 (번호판 맥락에서만)
    for wrong, correct in korean_corrections.items():
        if wrong in corrected:
            # 숫자 다음에 오는 한글만 교정
            pattern = r'(\d+)' + re.escape(wrong) + r'(\d+)'
            if re.search(pattern, corrected):
                corrected = re.sub(pattern, r'\1' + correct + r'\2', corrected)
    
    # 숫자 교정 적용
    for wrong, correct in digit_corrections.items():
        corrected = corrected.replace(wrong, correct)
    
    # 유효하지 않은 한글이 포함된 경우 가장 유사한 유효 한글로 대체
    korean_in_text = re.findall(r'[가-힣]', corrected)
    for char in korean_in_text:
        if char not in valid_korean_chars:
            # 가장 유사한 유효 한글 찾기 (간단한 휴리스틱)
            similar_char = find_similar_korean_char(char, valid_korean_chars)
            if similar_char:
                corrected = corrected.replace(char, similar_char, 1)  # 첫 번째 occurrence만
    
    return corrected

def find_similar_korean_char(char, valid_chars):
    """유효하지 않은 한글에 대해 가장 유사한 유효 한글 찾기"""
    # 자음별 그룹핑
    groups = {
        'ㄱ': ['가', '거', '고', '구'],
        'ㄴ': ['나', '너', '노', '누'],
        'ㄷ': ['다', '더', '도', '두'],
        'ㄹ': ['라', '러', '로', '루'],
        'ㅁ': ['마', '머', '모', '무'],
        'ㅂ': ['바', '버', '보', '부', '배'],
        'ㅅ': ['사', '서', '소', '수'],
        'ㅇ': ['아', '어', '오', '우'],
        'ㅈ': ['자', '저', '조', '주'],
        'ㅎ': ['하', '허', '호']
    }
    
    char_code = ord(char)
    for consonant, chars in groups.items():
        for valid_char in chars:
            if valid_char in valid_chars:
                valid_code = ord(valid_char)
                # 유니코드 거리 기반 유사도
                if abs(char_code - valid_code) < 50:  # 임의의 임계값
                    return valid_char
    
    return None

def extract_license_plate_text(ocr_results):
    """OCR 결과에서 번호판 형태의 텍스트 추출 (개선된 버전)"""
    license_plates = []
    
    for (bbox, text, confidence) in ocr_results:
        # 신뢰도 기준을 낮춰서 더 많은 후보 검토
        if confidence > 0.4:
            # 공백과 특수문자 제거
            clean_text = re.sub(r'[^\w가-힣]', '', text)
            
            # OCR 오류 교정
            corrected_text = correct_ocr_errors(clean_text)
            
            # 한국 번호판 패턴 (더 유연하게)
            korean_patterns = [
                r'\d{2,3}[가-힣]\d{4}',  # 기본 패턴: 12가3456
                r'\d{2,3}[가-힣]\d{3,4}',  # 약간 유연한 패턴
                r'\d{1,3}[가-힣]\d{3,5}'   # 더 유연한 패턴
            ]
            
            # 영문 번호판 패턴
            english_pattern = r'[A-Z]{1,3}\d{2,4}[A-Z]?'
            
            # 패턴 매칭
            is_license_plate = False
            for pattern in korean_patterns:
                if re.search(pattern, corrected_text):
                    is_license_plate = True
                    break
            
            if not is_license_plate:
                is_license_plate = bool(re.search(english_pattern, corrected_text))
            
            if is_license_plate:
                # bbox 좌표를 Python int로 변환
                bbox_converted = [[int(point[0]), int(point[1])] for point in bbox]
                license_plates.append({
                    "text": corrected_text,
                    "original_text": clean_text,
                    "confidence": float(confidence),
                    "bbox": bbox_converted
                })
    
    return license_plates

@app.get("/")
async def root():
    return {"message": "License Plate OCR API"}

def resize_image_for_processing(image_array, max_dimension=1200):
    """처리 속도를 위한 이미지 크기 조정"""
    h, w = image_array.shape[:2]
    if max(h, w) > max_dimension:
        scale = max_dimension / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        return cv2.resize(image_array, (new_w, new_h), interpolation=cv2.INTER_AREA), scale
    return image_array, 1.0

@app.post("/ocr/license-plate")
async def ocr_license_plate(file: UploadFile = File(...)):
    """이미지에서 번호판 텍스트를 추출하는 엔드포인트 (향상된 파이프라인)"""
    
    # 파일 형식 검증
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="업로드된 파일이 이미지가 아닙니다.")
    
    try:
        # 이미지 읽기
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # PIL 이미지를 OpenCV 형식으로 변환
        image_array = np.array(image)
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # 처리 속도를 위한 이미지 크기 조정
        processed_image, scale_factor = resize_image_for_processing(image_array, max_dimension=1200)
        
        # 1단계: 차량 감지
        vehicles = detect_vehicles(processed_image)
        
        all_license_plates = []
        debug_info = {
            "vehicles_detected": len(vehicles),
            "processed_regions": []
        }
        
        # 2단계: 각 차량에 대해 번호판 검출 및 OCR
        for i, vehicle in enumerate(vehicles):
            x1, y1, x2, y2 = vehicle['bbox']
            
            # 차량 영역 잘라내기 (스케일된 이미지에서)
            vehicle_crop = processed_image[y1:y2, x1:x2]
            
            # 번호판 후보 영역 검출
            plate_candidates = detect_license_plate_regions(vehicle_crop)
            
            debug_info["processed_regions"].append({
                "vehicle_id": i,
                "vehicle_bbox": [x1, y1, x2, y2],
                "plate_candidates": len(plate_candidates)
            })
            
            # 각 번호판 후보에 대해 OCR 수행
            for j, candidate in enumerate(plate_candidates):
                px1, py1, px2, py2 = candidate['bbox']
                
                # 번호판 영역 잘라내기 (원본 이미지 좌표로 변환)
                global_px1 = x1 + px1
                global_py1 = y1 + py1
                global_px2 = x1 + px2
                global_py2 = y1 + py2
                
                plate_crop = processed_image[global_py1:global_py2, global_px1:global_px2]
                
                if plate_crop.size > 0:
                    # 번호판 이미지 향상 (기본 방식)
                    enhanced_versions = enhance_license_plate_v3(plate_crop)
                    
                    # 모든 버전에 대해 OCR 수행
                    all_ocr_results = []
                    
                    # 원본 이미지 OCR
                    original_results = reader.readtext(plate_crop)
                    all_ocr_results.extend(original_results)
                    
                    # 각 향상된 버전에 대해 OCR
                    for enhanced_version in enhanced_versions:
                        try:
                            enhanced_results = reader.readtext(enhanced_version)
                            all_ocr_results.extend(enhanced_results)
                        except Exception:
                            continue
                    
                    # 결과 합치기
                    combined_results = all_ocr_results
                    
                    # 번호판 텍스트 추출
                    plate_texts = extract_license_plate_text(combined_results)
                    
                    # 전역 좌표로 bbox 변환
                    for plate_text in plate_texts:
                        adjusted_bbox = []
                        for point in plate_text['bbox']:
                            adjusted_bbox.append([
                                point[0] + global_px1,
                                point[1] + global_py1
                            ])
                        plate_text['bbox'] = adjusted_bbox
                        plate_text['vehicle_id'] = i
                        plate_text['candidate_id'] = j
                        
                    all_license_plates.extend(plate_texts)
        
        # 3단계: fallback - 번호판을 찾지 못했거나 차량이 감지되지 않으면 전체 이미지에서 OCR
        if not vehicles or not all_license_plates:
            try:
                fallback_results = reader.readtext(processed_image)
                fallback_plates = extract_license_plate_text(fallback_results)
                all_license_plates.extend(fallback_plates)
                debug_info["used_fallback"] = True
                debug_info["fallback_results"] = len(fallback_results)
            except Exception as e:
                debug_info["fallback_error"] = str(e)
        
        # 결과 정렬 (신뢰도 순)
        all_license_plates.sort(key=lambda x: x["confidence"], reverse=True)
        
        # 중복 제거 (같은 텍스트의 중복 결과)
        unique_plates = []
        seen_texts = set()
        for plate in all_license_plates:
            if plate['text'] not in seen_texts:
                unique_plates.append(plate)
                seen_texts.add(plate['text'])
        
        if unique_plates:
            return JSONResponse({
                "success": True,
                "license_plates": unique_plates,
                "best_result": unique_plates[0]["text"],
                "debug": debug_info
            })
        else:
            # 모든 텍스트 반환 (디버깅용)
            all_text = []
            for vehicle in vehicles:
                x1, y1, x2, y2 = vehicle['bbox']
                vehicle_crop = image_array[y1:y2, x1:x2]
                all_results = reader.readtext(vehicle_crop)
                
                for (bbox, text, confidence) in all_results:
                    if confidence > 0.3:
                        bbox_converted = [[int(point[0]) + x1, int(point[1]) + y1] for point in bbox]
                        all_text.append({
                            "text": text.strip(),
                            "confidence": float(confidence),
                            "bbox": bbox_converted
                        })
            
            return JSONResponse({
                "success": True,
                "license_plates": [],
                "all_detected_text": all_text,
                "debug": debug_info,
                "message": "번호판을 찾을 수 없어서 모든 감지된 텍스트를 반환합니다."
            })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 처리 중 오류 발생: {str(e)}")

@app.post("/test/compare-all")
async def compare_all_methods(file: UploadFile = File(...)):
    """모든 방법 비교 테스트"""
    methods = {
        "v1_basic": enhance_license_plate_v1,
        "v2_minimal": enhance_license_plate_v2, 
        "v3_full": enhance_license_plate_v3,
        "v4_otsu": enhance_license_plate_v4
    }
    
    results = {}
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        processed_image, scale_factor = resize_image_for_processing(image_array, max_dimension=1200)
        vehicles = detect_vehicles(processed_image)
        
        for method_name, enhance_func in methods.items():
            start_time = time.time()
            all_license_plates = []
            
            for i, vehicle in enumerate(vehicles):
                x1, y1, x2, y2 = vehicle['bbox']
                vehicle_crop = processed_image[y1:y2, x1:x2]
                plate_candidates = detect_license_plate_regions(vehicle_crop)
                
                for j, candidate in enumerate(plate_candidates):
                    px1, py1, px2, py2 = candidate['bbox']
                    global_px1 = x1 + px1
                    global_py1 = y1 + py1
                    global_px2 = x1 + px2
                    global_py2 = y1 + py2
                    
                    plate_crop = processed_image[global_py1:global_py2, global_px1:global_px2]
                    
                    if plate_crop.size > 0:
                        enhanced_versions = enhance_func(plate_crop)
                        
                        all_ocr_results = []
                        original_results = reader.readtext(plate_crop)
                        all_ocr_results.extend(original_results)
                        
                        for enhanced_version in enhanced_versions:
                            try:
                                enhanced_results = reader.readtext(enhanced_version)
                                all_ocr_results.extend(enhanced_results)
                            except:
                                continue
                        
                        plate_texts = extract_license_plate_text(all_ocr_results)
                        all_license_plates.extend(plate_texts)
            
            all_license_plates.sort(key=lambda x: x["confidence"], reverse=True)
            unique_plates = []
            seen_texts = set()
            for plate in all_license_plates:
                if plate['text'] not in seen_texts:
                    unique_plates.append(plate)
                    seen_texts.add(plate['text'])
            
            processing_time = time.time() - start_time
            
            results[method_name] = {
                "processing_time": round(processing_time, 2),
                "best_result": unique_plates[0]["text"] if unique_plates else None,
                "confidence": unique_plates[0]["confidence"] if unique_plates else 0,
                "total_candidates": len(unique_plates)
            }
        
        return JSONResponse({
            "comparison_results": results,
            "vehicles_detected": len(vehicles),
            "fastest_method": min(results.items(), key=lambda x: x[1]["processing_time"])[0],
            "highest_confidence": max(results.items(), key=lambda x: x[1]["confidence"])[0]
        })
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/debug/detailed")
async def debug_detailed(file: UploadFile = File(...)):
    """상세한 디버그 정보"""
    start_time = time.time()
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        processed_image, scale_factor = resize_image_for_processing(image_array, max_dimension=1200)
        vehicles = detect_vehicles(processed_image)
        
        debug_info = {
            "original_image_size": image_array.shape,
            "processed_image_size": processed_image.shape,
            "scale_factor": scale_factor,
            "vehicles_detected": len(vehicles),
            "vehicle_details": [],
            "all_ocr_results": []
        }
        
        for i, vehicle in enumerate(vehicles):
            x1, y1, x2, y2 = vehicle['bbox']
            vehicle_crop = processed_image[y1:y2, x1:x2]
            
            vehicle_debug = {
                "vehicle_id": i,
                "bbox": [x1, y1, x2, y2],
                "crop_size": vehicle_crop.shape,
                "confidence": vehicle['confidence'],
                "class": vehicle['class']
            }
            
            # 번호판 후보 검출
            plate_candidates = detect_license_plate_regions(vehicle_crop)
            vehicle_debug["plate_candidates"] = len(plate_candidates)
            vehicle_debug["candidates_info"] = []
            
            for j, candidate in enumerate(plate_candidates):
                px1, py1, px2, py2 = candidate['bbox']
                global_px1 = x1 + px1
                global_py1 = y1 + py1
                global_px2 = x1 + px2
                global_py2 = y1 + py2
                
                plate_crop = processed_image[global_py1:global_py2, global_px1:global_px2]
                
                candidate_info = {
                    "candidate_id": j,
                    "local_bbox": [px1, py1, px2, py2],
                    "global_bbox": [global_px1, global_py1, global_px2, global_py2],
                    "crop_size": plate_crop.shape if plate_crop.size > 0 else "empty",
                    "area": candidate['area'],
                    "aspect_ratio": candidate['aspect_ratio']
                }
                
                if plate_crop.size > 0:
                    # 원본 OCR만 시도
                    try:
                        original_results = reader.readtext(plate_crop)
                        candidate_info["ocr_results"] = []
                        
                        for (bbox, text, confidence) in original_results:
                            ocr_info = {
                                "text": text,
                                "confidence": float(confidence),
                                "cleaned_text": re.sub(r'[^\w가-힣]', '', text),
                                "corrected_text": correct_ocr_errors(re.sub(r'[^\w가-힣]', '', text))
                            }
                            candidate_info["ocr_results"].append(ocr_info)
                            debug_info["all_ocr_results"].append(ocr_info)
                    except Exception as e:
                        candidate_info["ocr_error"] = str(e)
                
                vehicle_debug["candidates_info"].append(candidate_info)
            
            debug_info["vehicle_details"].append(vehicle_debug)
        
        # fallback: 전체 이미지에서 OCR
        if len(vehicles) == 0 or len(debug_info["all_ocr_results"]) == 0:
            try:
                fallback_results = reader.readtext(processed_image)
                debug_info["fallback_ocr"] = []
                for (bbox, text, confidence) in fallback_results:
                    if confidence > 0.3:
                        fallback_info = {
                            "text": text,
                            "confidence": float(confidence),
                            "bbox": [[int(point[0]), int(point[1])] for point in bbox]
                        }
                        debug_info["fallback_ocr"].append(fallback_info)
            except Exception as e:
                debug_info["fallback_error"] = str(e)
        
        processing_time = time.time() - start_time
        debug_info["processing_time"] = round(processing_time, 2)
        
        return JSONResponse(debug_info)
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)