import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import ProgressBar from '../common/ProgressBar';
import styles from './CarSelection.module.css'; // CSS 모듈 import

// const carPaySteps = ['결제수단', '차량번호', '차량선택', '인증', '완료']; // 이 줄은 더 이상 필요 없습니다.

const CarSelection = () => {
  const navigate = useNavigate();
  const { state, setCarNumber } = useApp();
  const [selectedPlate, setSelectedPlate] = useState<string>('');

  const totalAmount = state.cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handleCarSelect = (plateNumber: string) => {
    setSelectedPlate(plateNumber);
  };

  const handleSubmit = () => {
    if (selectedPlate) {
      setCarNumber(selectedPlate); // AppContext에 선택된 차량 번호 저장
      navigate('/auth-method');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* 
          ProgressBar가 'payment-method' 단계에 해당한다고 가정하고 수정합니다.
          이 부분은 현재 ProgressBar의 한계로 인한 임시방편입니다.
        */}
        <ProgressBar currentStep={'payment-method'} />

        <h2 className={styles.title}>본인 차량을 선택해주세요</h2>

        <div className={styles.carList}>
          {state.availableCars.length > 0 ? (
            state.availableCars.map((car) => (
              <button
                key={car.id}
                className={`${styles.carItem} ${selectedPlate === car.plateNumber ? styles.selected : ''}`}
                onClick={() => handleCarSelect(car.plateNumber)}
              >
                {car.plateNumber}
              </button>
            ))
          ) : (
            <div className={styles.noCarsMessage}>
              등록된 차량이 없습니다.
            </div>
          )}
        </div>

        <div className={styles.summary}>
          <span className={styles.summaryLabel}>총 결제금액</span>
          <span className={styles.summaryValue}>{totalAmount.toLocaleString()}원</span>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.actionButton} ${styles.backBtn}`}
            onClick={() => navigate('/car-number-input')}
          >
            이전
          </button>
          <button
            className={`${styles.actionButton} ${styles.submitBtn}`}
            onClick={handleSubmit}
            disabled={!selectedPlate}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
};

export default CarSelection;