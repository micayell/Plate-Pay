import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { searchCarsByLastDigits } from '../../services/api';
import ProgressBar from '../common/ProgressBar';
import NumberKeypad from '../common/NumberKeypad';

export default function CarNumberInput() {
  const navigate = useNavigate();
  const { state, setAvailableCars, setLoadingCars } = useApp();
  const [carNumber, setCarNumber] = useState('');

  const getTotalAmount = () => {
    return state.cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleNumberClick = (number: string) => {
    if (carNumber.length < 4) {
      setCarNumber(prev => prev + number);
    }
  };

  const handleBackspace = () => {
    setCarNumber(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (carNumber.length === 4) {
      setLoadingCars(true);

      try {
        const response = await searchCarsByLastDigits(carNumber);

        if (response.success && response.data.length > 0) {
          setAvailableCars(response.data);
          navigate('/car-selection');
        } else {
          alert('해당 번호로 등록된 차량을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('차량 검색 중 오류 발생:', error);
        alert('차량 검색 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setLoadingCars(false);
      }
    }
  };

  const renderCarNumberDisplay = () => {
    const boxes = [];
    for (let i = 0; i < 4; i++) {
      boxes.push(
        <div
          key={i}
          className={`car-number-box ${carNumber.length > i ? 'filled' : ''} ${carNumber.length === i ? 'active' : ''}`}
        >
          {carNumber[i] || ''}
        </div>
      );
    }
    return boxes;
  };

  return (
    <div className="car-number-input">
      <div className="car-number-input-modal">
        <ProgressBar currentStep="payment-method" />

        <h2 className="input-title">차량 뒷자리를 입력해주세요</h2>

        <div className="car-number-display">
          {renderCarNumberDisplay()}
        </div>

        <NumberKeypad
          onNumberClick={handleNumberClick}
          onBackspace={handleBackspace}
          onSubmit={handleSubmit}
          submitLabel={state.isLoadingCars ? "검색중..." : "입력"}
          isSubmitDisabled={carNumber.length !== 4 || state.isLoadingCars}
          randomize={false}
        />

        <div className="car-number-summary">
          <div className="summary-row">
            <span>총 결제금액</span>
            <span className="total-amount">{getTotalAmount().toLocaleString()}원</span>
          </div>
        </div>
        
        <div className="car-number-actions">
          <button
            className="action-button back-button"
            onClick={() => navigate('/payment-method')}
          >
            이전
          </button>
        </div>
      </div>
    </div>
  );
}