import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import ProgressBar from '../common/ProgressBar';
import { PaymentMethod as PaymentMethodType } from '../../types';
import styles from './PaymentMethod.module.css';

export default function PaymentMethod() {
  const navigate = useNavigate();
  const { state, setPaymentMethod } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);

  const totalAmount = state.cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handleSelectMethod = (method: PaymentMethodType) => {
    setSelectedMethod(method);
  };

  const handleNext = () => {
    if (!selectedMethod) return;
    setPaymentMethod(selectedMethod);

    if (selectedMethod === 'carpay') {
      navigate('/car-number-input');
    } else {
      alert('카드/페이 결제는 현재 준비 중입니다.');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <ProgressBar currentStep="payment-method" />

        <h2 className={styles.title}>결제 수단을 선택하세요</h2>

        <div className={styles.options}>
          <button
            className={`${styles.optionButton} ${selectedMethod === 'card' ? styles.selected : ''}`}
            onClick={() => handleSelectMethod('card')}
          >
            <svg width="45" height="35" viewBox="0 0 45 35" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg"><path d="M42.1875 0H2.8125C1.2625 0 0 1.2625 0 2.8125V29.6875C0 31.2375 1.2625 32.5 2.8125 32.5H42.1875C43.7375 32.5 45 31.2375 45 29.6875V2.8125C45 1.2625 43.7375 0 42.1875 0ZM40 5H5C4.45312 5 4 4.54688 4 4C4 3.45312 4.45312 3 5 3H40C40.5469 3 41 3.45312 41 4C41 4.54688 40.5469 5 40 5Z"/></svg>
            <span>카드/페이</span>
          </button>

          <button
            className={`${styles.optionButton} ${selectedMethod === 'carpay' ? styles.selected : ''}`}
            onClick={() => handleSelectMethod('carpay')}
          >
            <div className={styles.iconWrapper}>
              <img
                src="/images/plate-pay-icon.png"
                alt="플페이"
                className={styles.iconImage}
              />
            </div>
            <span className={styles.carpayText}>플페이</span>
          </button>
        </div>

        <div className={styles.summary}>
          <span>총 결제금액</span>
          <span className={styles.totalValue}>{totalAmount.toLocaleString()}원</span>
        </div>

        <div className={styles.actions}>
          <button className={styles.backBtn} onClick={() => navigate('/order-confirm')}>이전</button>
          <button className={styles.nextBtn} onClick={handleNext} disabled={!selectedMethod}>다음</button>
        </div>
      </div>
    </div>
  );
}