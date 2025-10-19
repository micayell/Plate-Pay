import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './PaymentFailure.module.css';

const PaymentFailure = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 이전 페이지에서 전달된 state에서 에러 메시지를 가져옵니다.
  // 메시지가 없으면 기본 메시지를 사용합니다.
  const errorMessage = location.state?.message || '비밀번호 인증에 실패하였습니다.';

  const handleConfirm = () => {
    // 실패 원인에 따라 적절한 페이지로 이동 (예시 로직)
    // 실제로는 더 복잡한 로직이 필요할 수 있습니다.
    if (errorMessage.includes('비밀번호')) {
      navigate('/payment-password');
    } else {
      navigate('/payment-method');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <h2 className={styles.title}>결제 실패</h2>

        <p className={styles.message}>
          {errorMessage}
        </p>

        <div className={styles.actions}>
          <button onClick={handleConfirm} className={styles.confirmBtn}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;