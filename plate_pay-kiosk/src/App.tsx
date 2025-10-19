import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import MainMenu from './components/MainMenu/MainMenu';
import OrderConfirm from './components/OrderConfirm/OrderConfirm';
import PaymentMethod from './components/PaymentMethod/PaymentMethod';
import CarNumberInput from './components/CarNumberInput/CarNumberInput';
import CarSelection from './components/CarSelection/CarSelection';
import AuthMethod from './components/AuthMethod/AuthMethod';
import FaceRecognition from './components/FaceRecognition/FaceRecognition';
import PaymentPassword from './components/PaymentPassword/PaymentPassword';
import PaymentSuccess from './components/PaymentSuccess/PaymentSuccess';
import PaymentFailure from './components/PaymentFailure/PaymentFailure';
import PaymentError from './components/PaymentError/PaymentError';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}

function AppContent() {
  const { state } = useApp();

  return (
    <div className="App">
      <div className="kiosk-main">
        <header className="kiosk-header">
          <h1>틈새라면 장덕점</h1>
        </header>
        <main className="kiosk-content">
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/order-confirm" element={<OrderConfirm />} />
            <Route path="/payment-method" element={<PaymentMethod />} />
            <Route path="/car-number-input" element={<CarNumberInput />} />
            <Route path="/car-selection" element={<CarSelection />} />
            <Route path="/auth-method" element={<AuthMethod />} />
            <Route path="/face-recognition" element={<FaceRecognition />} />
            <Route path="/payment-password" element={<PaymentPassword />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-failure" element={<PaymentFailure />} />
          </Routes>
        </main>
        {state.isPaymentErrorVisible && <PaymentError />}
      </div>
    </div>
  );
}

export default App;
