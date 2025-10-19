import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Product } from '../../types';
import styles from './MainMenu.module.css'; // CSS 모듈 import

const mockProducts: Product[] = [
  { id: '1', name: '빨계떡', price: 4500, image: 'teumsae1.png' },
  { id: '2', name: '빨해떡', price: 5500, image: 'teumsae2.png' },
  { id: '3', name: '빨부대', price: 5500, image: 'teumsae3.png' },
  { id: '4', name: '치즈빨계떡', price: 5000, image: 'teumsae4.png' },
  { id: '5', name: '만두빨계떡', price: 5500, image: 'teumsae5.png' },
  { id: '6', name: '순두부 빨계떡', price: 5500, image: 'teumsae6.png' },
];

export default function MainMenu() {
  const navigate = useNavigate();
  const { state, addToCart, removeFromCart, clearCart, updateQuantity } = useApp();
  const totalAmount = state.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const getItemQuantity = (productId: string) => {
    const item = state.cart.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className={styles.mainMenu}>
      <div className={styles.productsGrid}>
        {mockProducts.map((product) => (
          <div key={product.id} className={styles.productCard} onClick={() => addToCart(product)}>
            <div className={styles.productImage}>
              <img
                src={`/images/${product.image}`}
                alt={product.name}
                className={styles.productImageImg}
              />
            </div>
            <div className={styles.productInfo}>
              <h3 className={styles.productName}>{product.name}</h3>
              <p className={styles.productPrice}>{product.price.toLocaleString()}원</p>
            </div>
            {getItemQuantity(product.id) > 0 && (
              <div className={styles.quantityBadge}>
                {getItemQuantity(product.id)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.cartContainer}>
        {/* Cart Header */}
        <div className={styles.cartHeader}>
          <div className={styles.cartColProduct}>상품명</div>
          <div className={styles.cartColQuantity}>수량</div>
          <div className={styles.cartColPrice}>가격(원)</div>
          <div className={styles.cartColDelete}></div>
        </div>
        {/* Cart Body */}
        <div className={styles.cartBody}>
          {state.cart.length === 0 ? (
            <div className={styles.emptyCartMessage}>장바구니가 비어있습니다.</div>
          ) : (
            state.cart.map((item) => (
              <div key={item.product.id} className={styles.cartRow}>
                <div className={styles.cartColProduct}>{item.product.name}</div>
                <div className={styles.cartColQuantity}>
                  <div className={styles.quantityControl}>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <div className={styles.cartColPrice}>{(item.product.price * item.quantity).toLocaleString()}</div>
                <div className={styles.cartColDelete}>
                  <button className={styles.removeButtonIcon} onClick={() => removeFromCart(item.product.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Total Amount Summary */}
      {state.cart.length > 0 && (
        <div className={styles.totalSummary}>
          <span>총 주문 금액</span>
          <span className={styles.totalAmountValue}>{totalAmount.toLocaleString()}원</span>
        </div>
      )}

      <div className={styles.bottomControls}>
        <div className={styles.controlButtons}>
          <button className="control-button home-button">홈</button>
          <button className="control-button reset-button" onClick={clearCart}>
            초기화
          </button>
          <button
            className="control-button checkout-button"
            onClick={() => navigate('/order-confirm')}
            disabled={state.cart.length === 0}
          >
            결제하기 →
          </button>
        </div>
      </div>
    </div>
  );
}