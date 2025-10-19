import React, { useState } from 'react';
import './App.css';
import CameraScreen from './components/CameraScreen';
import FaceRecognitionTest from './components/FaceRecognitionTest';
import YoloCarDetection from './components/YoloCarDetection';

function App() {
  const [currentPage, setCurrentPage] = useState<'camera' | 'face' | 'yolo'>('camera');

  return (
    <div className="App">
      {/* 네비게이션 */}
      <nav className="app-nav">
        <button 
          className={`nav-btn ${currentPage === 'camera' ? 'active' : ''}`}
          onClick={() => setCurrentPage('camera')}
        >
          🚗 번호판 인식
        </button>
        <button
          className={`nav-btn ${currentPage === 'face' ? 'active' : ''}`}
          onClick={() => setCurrentPage('face')}
        >
          🔐 얼굴 인식 테스트
        </button>
        <button
          className={`nav-btn ${currentPage === 'yolo' ? 'active' : ''}`}
          onClick={() => setCurrentPage('yolo')}
        >
          🚙 YOLO 차량 감지
        </button>
      </nav>

      {/* 페이지 렌더링 */}
      {currentPage === 'camera' && <CameraScreen />}
      {currentPage === 'face' && <FaceRecognitionTest />}
      {currentPage === 'yolo' && <YoloCarDetection />}
    </div>
  );
}

export default App;