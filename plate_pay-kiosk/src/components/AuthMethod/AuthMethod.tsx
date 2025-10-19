import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import ProgressBar from '../common/ProgressBar';
import styles from './AuthMethod.module.css';

const carPaySteps = ['결제수단', '차량번호', '차량선택', '인증', '완료'];

const AuthMethod = () => {
  const navigate = useNavigate();
  const { state } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<'password' | 'face' | null>(null);

  const totalAmount = state.cart.reduce((total, item) => total + item.product.price * item.quantity, 0);

  const handleSelect = (method: 'password' | 'face') => {
    setSelectedMethod(method);
    // 선택 후 바로 다음 페이지로 이동
    if (method === 'password') {
      navigate('/payment-password');
    } else if (method === 'face') {
      navigate('/face-recognition');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <ProgressBar currentStep={'payment-method'} />
        
        <h2 className={styles.title}>인증 방법을 선택하세요</h2>

        <div className={styles.options}>
          <button
            className={`${styles.optionButton} ${selectedMethod === 'password' ? styles.selected : ''}`}
            onClick={() => handleSelect('password')}
          >
            <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className={styles.optionTitle}>결제 비밀번호</span>
            <span className={styles.optionDescription}>6자리 비밀번호로 인증</span>
          </button>

          <button
            className={`${styles.optionButton} ${selectedMethod === 'face' ? styles.selected : ''}`}
            onClick={() => handleSelect('face')}
          >
            <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={styles.optionTitle}>얼굴 인식</span>
            <span className={styles.optionDescription}>얼굴로 간편 인증</span>
          </button>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>선택된 차량</span>
            <span className={styles.summaryValue}>{state.carNumber}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>총 결제금액</span>
            <span className={styles.summaryValue}>{totalAmount.toLocaleString()}원</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.backBtn}
            onClick={() => navigate('/car-selection')}
          >
            이전
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthMethod;