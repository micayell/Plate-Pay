import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import ProgressBar from '../common/ProgressBar';
import styles from './PaymentSuccess.module.css';

const PaymentSuccess = () => {
  const { clearCart } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isCarPay = location.state?.isCarPay || false;

  useEffect(() => {
    const timer = setTimeout(() => {
      clearCart();
      navigate('/');
    }, 5000); // 5초 후 메인으로 이동

    return () => clearTimeout(timer);
  }, [navigate, clearCart]);

  const handleComplete = () => {
    clearCart();
    navigate('/');
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* 결제 방식과 상관없이 항상 ProgressBar를 표시합니다. */}
        <ProgressBar currentStep={'payment-complete'} />

        <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <h2 className={styles.title}>주문 완료!!</h2>

        {isCarPay && (
          <p className={styles.message}>
            출차 시 주차비와 함께 결제됩니다.
          </p>
        )}

        <div className={styles.actions}>
          <button onClick={handleComplete} className={styles.confirmBtn}>
            완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;