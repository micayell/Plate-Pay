import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import MainMenu from './MainMenu/MainMenu';
import OrderConfirm from './OrderConfirm/OrderConfirm';
import PaymentMethod from './PaymentMethod/PaymentMethod';
import CarNumberInput from './CarNumberInput/CarNumberInput';
import CarSelection from './CarSelection/CarSelection';
import PaymentPassword from './PaymentPassword/PaymentPassword';
import PaymentError from './PaymentError/PaymentError';

type Screen = 'main-menu' | 'order-confirm' | 'payment-method' | 'car-number-input' | 'car-selection' | 'payment-password';

export default function KioskMain() {
  const { state } = useApp();
  const [currentScreen, setCurrentScreen] = useState<Screen>('main-menu');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'main-menu':
        return <MainMenu />;
      case 'order-confirm':
        return <OrderConfirm />;
      case 'payment-method':
        return <PaymentMethod />;
      case 'car-number-input':
        return <CarNumberInput />;
      case 'car-selection':
        return <CarSelection />;
      case 'payment-password':
        return <PaymentPassword />;
      default:
        return <MainMenu />;
    }
  };

  return (
    <div className="kiosk-main">
      <header className="kiosk-header">
        <h1>틈새라면 장덕점</h1>
      </header>
      <main className="kiosk-content">
        {renderScreen()}
      </main>
      {state.isPaymentErrorVisible && <PaymentError />}
    </div>
  );
}