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

# 기존 함수들 import (실제로는 main.py에서 가져와야 함)
from main import (
    get_vehicle_model, detect_vehicles, detect_license_plate_regions,
    enhance_license_plate_v1, enhance_license_plate_v2, 
    enhance_license_plate_v3, enhance_license_plate_v4,
    correct_ocr_errors, extract_license_plate_text,
    resize_image_for_processing, reader
)

app = FastAPI(title="License Plate OCR Test API", version="1.0.0")

@app.post("/test/v1-basic")
async def test_v1_basic(file: UploadFile = File(...)):
    """V1: 기본 CLAHE만 (빠름, 정확도 중간)"""
    start_time = time.time()
    
    try:
        # 이미지 읽기
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        processed_image, scale_factor = resize_image_for_processing(image_array, max_dimension=1200)
        vehicles = detect_vehicles(processed_image)
        
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
                    # V1 전처리
                    enhanced_versions = enhance_license_plate_v1(plate_crop)
                    
                    # OCR
                    all_ocr_results = []
                    original_results = reader.readtext(plate_crop)
                    all_ocr_results.extend(original_results)
                    
                    for enhanced_version in enhanced_versions:
                        enhanced_results = reader.readtext(enhanced_version)
                        all_ocr_results.extend(enhanced_results)
                    
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
        
        return JSONResponse({
            "method": "V1-Basic (CLAHE만)",
            "processing_time": round(processing_time, 2),
            "license_plates": unique_plates,
            "best_result": unique_plates[0]["text"] if unique_plates else None,
            "vehicles_detected": len(vehicles)
        })
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/test/v2-minimal")
async def test_v2_minimal(file: UploadFile = File(...)):
    """V2: 최소 전처리 (가장 빠름)"""
    start_time = time.time()
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        processed_image, scale_factor = resize_image_for_processing(image_array, max_dimension=1000)  # 더 작게
        vehicles = detect_vehicles(processed_image)
        
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
                    # V2 전처리 (최소)
                    enhanced_versions = enhance_license_plate_v2(plate_crop)
                    
                    # OCR (원본만)
                    all_ocr_results = reader.readtext(plate_crop)
                    
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
        
        return JSONResponse({
            "method": "V2-Minimal (최소 전처리)",
            "processing_time": round(processing_time, 2),
            "license_plates": unique_plates,
            "best_result": unique_plates[0]["text"] if unique_plates else None,
            "vehicles_detected": len(vehicles)
        })
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/test/v3-full")
async def test_v3_full(file: UploadFile = File(...)):
    """V3: 전체 전처리 (가장 정확함, 느림)"""
    start_time = time.time()
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        processed_image, scale_factor = resize_image_for_processing(image_array, max_dimension=1400)  # 더 크게
        vehicles = detect_vehicles(processed_image)
        
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
                    # V3 전처리 (다중)
                    enhanced_versions = enhance_license_plate_v3(plate_crop)
                    
                    # 모든 버전 OCR
                    all_ocr_results = []
                    original_results = reader.readtext(plate_crop)
                    all_ocr_results.extend(original_results)
                    
                    for enhanced_version in enhanced_versions:
                        enhanced_results = reader.readtext(enhanced_version)
                        all_ocr_results.extend(enhanced_results)
                    
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
        
        return JSONResponse({
            "method": "V3-Full (다중 전처리)",
            "processing_time": round(processing_time, 2),
            "license_plates": unique_plates,
            "best_result": unique_plates[0]["text"] if unique_plates else None,
            "vehicles_detected": len(vehicles)
        })
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/test/v4-otsu")
async def test_v4_otsu(file: UploadFile = File(...)):
    """V4: OTSU 임계값 (단순, 빠름)"""
    start_time = time.time()
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        processed_image, scale_factor = resize_image_for_processing(image_array, max_dimension=1200)
        vehicles = detect_vehicles(processed_image)
        
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
                    # V4 전처리 (OTSU)
                    enhanced_versions = enhance_license_plate_v4(plate_crop)
                    
                    # OCR
                    all_ocr_results = []
                    original_results = reader.readtext(plate_crop)
                    all_ocr_results.extend(original_results)
                    
                    for enhanced_version in enhanced_versions:
                        enhanced_results = reader.readtext(enhanced_version)
                        all_ocr_results.extend(enhanced_results)
                    
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
        
        return JSONResponse({
            "method": "V4-OTSU (OTSU 임계값)",
            "processing_time": round(processing_time, 2),
            "license_plates": unique_plates,
            "best_result": unique_plates[0]["text"] if unique_plates else None,
            "vehicles_detected": len(vehicles)
        })
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/")
async def root():
    return {"message": "License Plate OCR Test API - 4가지 최적화 방법 테스트"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)