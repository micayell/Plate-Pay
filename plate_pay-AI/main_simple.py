from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import easyocr
import cv2
import numpy as np
from PIL import Image
import io
import re
from ultralytics import YOLO
import torch

app = FastAPI(title="License Plate OCR API", version="1.0.0")

# EasyOCR 리더 초기화 (한국어, 영어 지원)
reader = easyocr.Reader(['ko', 'en'])

# YOLO 모델과 차량 클래스 (lazy loading)
vehicle_model = None
VEHICLE_CLASSES = [2, 3, 5, 7]  # car, motorcycle, bus, truck

def get_vehicle_model():
    """YOLO 모델 lazy loading"""
    global vehicle_model
    if vehicle_model is None:
        try:
            import torch
            from ultralytics.nn.tasks import DetectionModel
            torch.serialization.add_safe_globals([DetectionModel])
            vehicle_model = YOLO('yolov8n.pt')
        except Exception:
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
    
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    plate_candidates = []
    h, w = vehicle_crop.shape[:2]
    
    for contour in contours:
        x, y, cw, ch = cv2.boundingRect(contour)
        aspect_ratio = cw / ch if ch > 0 else 0
        area = cw * ch
        
        if (2.0 < aspect_ratio < 6.0 and 
            area > (w * h * 0.01) and 
            area < (w * h * 0.3) and 
            ch > 10 and cw > 50):
            
            plate_candidates.append({
                'bbox': [x, y, x + cw, y + ch],
                'area': area,
                'aspect_ratio': aspect_ratio
            })
    
    plate_candidates.sort(key=lambda x: x['area'], reverse=True)
    return plate_candidates[:3]

def enhance_license_plate(plate_crop):
    """간단한 번호판 이미지 향상"""
    h, w = plate_crop.shape[:2]
    if w < 200:
        scale = 200 / w
        new_w, new_h = int(w * scale), int(h * scale)
        plate_crop = cv2.resize(plate_crop, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    
    if len(plate_crop.shape) == 3:
        gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = plate_crop
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 11, 2)
    
    kernel = np.ones((2, 2), np.uint8)
    processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    return processed

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
    """간단한 OCR 오류 교정"""
    valid_korean_chars = {
        '가', '나', '다', '라', '마', '거', '너', '더', '러', '머', '저',
        '고', '노', '도', '로', '모', '구', '누', '두', '루', '무',
        '바', '사', '아', '자', '배', '하', '허', '호',
        '육', '해', '공', '국', '합'
    }
    
    korean_corrections = {
        '듯': '루', '룻': '루', '룩': '루'
    }
    
    digit_corrections = {
        'O': '0', 'o': '0', 'I': '1', 'l': '1', 'S': '5', 's': '5'
    }
    
    corrected = text
    
    for wrong, correct in korean_corrections.items():
        if wrong in corrected:
            pattern = r'(\d+)' + re.escape(wrong) + r'(\d+)'
            if re.search(pattern, corrected):
                corrected = re.sub(pattern, r'\1' + correct + r'\2', corrected)
    
    for wrong, correct in digit_corrections.items():
        corrected = corrected.replace(wrong, correct)
    
    korean_in_text = re.findall(r'[가-힣]', corrected)
    for char in korean_in_text:
        if char not in valid_korean_chars:
            # 첫 번째로 찾은 유사한 문자로 교정
            if '가' <= char <= '힣':
                for valid_char in valid_korean_chars:
                    if abs(ord(char) - ord(valid_char)) < 10:
                        corrected = corrected.replace(char, valid_char, 1)
                        break
    
    return corrected

def extract_license_plate_text(ocr_results):
    """OCR 결과에서 번호판 형태의 텍스트 추출"""
    license_plates = []
    
    for (bbox, text, confidence) in ocr_results:
        if confidence > 0.5:
            clean_text = re.sub(r'[^\w가-힣]', '', text)
            corrected_text = correct_ocr_errors(clean_text)
            
            korean_pattern = r'\d{2,3}[가-힣]\d{4}'
            english_pattern = r'[A-Z]{1,3}\d{2,4}[A-Z]?'
            
            if re.search(korean_pattern, corrected_text) or re.search(english_pattern, corrected_text):
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

@app.post("/ocr/license-plate")
async def ocr_license_plate(file: UploadFile = File(...)):
    """이미지에서 번호판 텍스트를 추출하는 엔드포인트"""
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="업로드된 파일이 이미지가 아닙니다.")
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        image_array = np.array(image)
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # 1단계: 차량 감지
        vehicles = detect_vehicles(image_array)
        
        all_license_plates = []
        debug_info = {
            "vehicles_detected": len(vehicles),
            "processed_regions": []
        }
        
        # 2단계: 각 차량에 대해 번호판 검출 및 OCR
        for i, vehicle in enumerate(vehicles):
            x1, y1, x2, y2 = vehicle['bbox']
            vehicle_crop = image_array[y1:y2, x1:x2]
            
            plate_candidates = detect_license_plate_regions(vehicle_crop)
            
            debug_info["processed_regions"].append({
                "vehicle_id": i,
                "vehicle_bbox": [x1, y1, x2, y2],
                "plate_candidates": len(plate_candidates)
            })
            
            for j, candidate in enumerate(plate_candidates):
                px1, py1, px2, py2 = candidate['bbox']
                
                global_px1 = x1 + px1
                global_py1 = y1 + py1
                global_px2 = x1 + px2
                global_py2 = y1 + py2
                
                plate_crop = image_array[global_py1:global_py2, global_px1:global_px2]
                
                if plate_crop.size > 0:
                    enhanced_plate = enhance_license_plate(plate_crop)
                    
                    original_results = reader.readtext(plate_crop)
                    enhanced_results = reader.readtext(enhanced_plate)
                    
                    combined_results = original_results + enhanced_results
                    plate_texts = extract_license_plate_text(combined_results)
                    
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
        
        # 3단계: fallback
        if not vehicles:
            processed_image = preprocess_image(image_array)
            fallback_results = reader.readtext(image_array) + reader.readtext(processed_image)
            fallback_plates = extract_license_plate_text(fallback_results)
            all_license_plates.extend(fallback_plates)
            debug_info["used_fallback"] = True
        
        all_license_plates.sort(key=lambda x: x["confidence"], reverse=True)
        
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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)