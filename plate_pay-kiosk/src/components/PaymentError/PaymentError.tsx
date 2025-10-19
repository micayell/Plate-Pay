import React from 'react';
import { useApp } from '../../contexts/AppContext';

export default function PaymentError() {
  const { hidePaymentError } = useApp();

  const handleConfirm = () => {
    hidePaymentError();
  };

  return (
    <div className="payment-error-overlay">
      <div className="payment-error-modal">
        <div className="error-content">
          <h2 className="error-title">결제 오류</h2>
          <p className="error-message">잔액 부족</p>
          <button className="error-confirm-button" onClick={handleConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}