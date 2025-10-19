import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import ProgressBar from '../common/ProgressBar';
import styles from './OrderConfirm.module.css'; // CSS 모듈 import

export default function OrderConfirm() {
  const navigate = useNavigate();
  const { state } = useApp();

  const totalAmount = state.cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const totalQuantity = state.cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <ProgressBar currentStep="order-confirm" />

        <div className={styles.orderList}>
          <div className={styles.orderHeader}>
            <div className={styles.colName}>상품명</div>
            <div className={styles.colQty}>수량</div>
            <div className={styles.colPrice}>가격(원)</div>
          </div>
          {/* 👇 이 부분을 수정합니다 */}
          <div className={styles.orderBody}>
            {state.cart.length > 0 ? (
              state.cart.map((item) => (
                <div key={item.product.id} className={styles.orderRow}>
                  <div className={styles.colName}>{item.product.name}</div>
                  <div className={styles.colQty}>{item.quantity}</div>
                  <div className={styles.colPrice}>{(item.product.price * item.quantity).toLocaleString()}</div>
                </div>
              ))
            ) : (
              <div className={styles.emptyOrder}>주문 내역이 없습니다.</div>
            )}
          </div>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>총 수량</span>
            <span>{totalQuantity}개</span>
          </div>
           <div className={styles.summaryRow}>
            <span>주문금액</span>
            <span>{totalAmount.toLocaleString()}원</span>
          </div>
          <div className={styles.summaryRow}>
            <span>할인금액</span>
            <span className={styles.discountValue}>0 원</span>
          </div>
        </div>

        <div className={styles.total}>
          <span>총액</span>
          <span className={styles.totalValue}>{totalAmount.toLocaleString()} 원</span>
        </div>

        <div className={styles.actions}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            이전
          </button>
          <button className={styles.submitBtn} onClick={() => navigate('/payment-method')}>
            결제
          </button>
        </div>
      </div>
    </div>
  );
}