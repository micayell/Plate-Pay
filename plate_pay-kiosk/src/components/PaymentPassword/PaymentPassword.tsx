import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import ProgressBar from '../common/ProgressBar';
import NumberKeypad from '../common/NumberKeypad';
import { orderMenu } from '../../services/api';

export default function PaymentPassword() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const getTotalAmount = () => {
    return state.cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleNumberClick = (number: string) => {
    if (password.length < 6) {
      setPassword(prev => prev + number);
    }
  };

  const handleBackspace = () => {
    setPassword(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (password.length === 6 && !isProcessing) {
      setIsProcessing(true);

      try {
        const totalAmount = getTotalAmount();

        // 차량번호는 state.carNumber에서 가져온다고 가정
        const plateNum = state.carNumber;
        const response = await orderMenu(plateNum, password, totalAmount, 1);

        if (response.success) {
          navigate('/payment-success');
        } else {
          navigate('/payment-failure', {
            state: { errorMessage: response.message || '결제 실패' },
          });
        }
      } catch (error) {
        console.error('결제 처리 중 오류:', error);
        navigate('/payment-failure', {
          state: { errorMessage: '결제 처리 중 오류가 발생했습니다.' },
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const renderPasswordDisplay = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      boxes.push(
        <div
          key={i}
          className={`password-box ${password.length > i ? 'filled' : ''} ${password.length === i ? 'active' : ''}`}
        >
          {password[i] ? '●' : ''}
        </div>
      );
    }
    return boxes;
  };

  return (
    <div className="payment-password">
      <div className="payment-password-modal">
        <ProgressBar currentStep="payment-method" />

        <h2 className="password-title">결제 비밀번호</h2>

        <div className="password-display">
          {renderPasswordDisplay()}
        </div>

        <NumberKeypad
          onNumberClick={handleNumberClick}
          onBackspace={handleBackspace}
          onSubmit={handleSubmit}
          submitLabel={isProcessing ? "결제 중..." : "입력"}
          isSubmitDisabled={password.length !== 6 || isProcessing}
          randomize={true}
        />

        <div className="payment-password-summary">
          <div className="summary-row">
            <span>총 결제금액</span>
            <span className="total-amount">{getTotalAmount().toLocaleString()}원</span>
          </div>
        </div>

        <div className="payment-password-actions">
          <button
            className="action-button back-button"
            onClick={() => navigate('/auth-method')}
          >
            이전
          </button>
        </div>
      </div>
    </div>
  );
}