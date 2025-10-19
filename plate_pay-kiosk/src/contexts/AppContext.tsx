import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, Product, PaymentMethod, Step, CarInfo } from '../types';

interface AppContextType {
  state: AppState;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCurrentStep: (step: Step) => void;
  setCarNumber: (carNumber: string) => void;
  setAvailableCars: (cars: CarInfo[]) => void;
  setLoadingCars: (loading: boolean) => void;
  showPaymentError: () => void;
  hidePaymentError: () => void;
}

type Action =
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_PAYMENT_METHOD'; payload: PaymentMethod }
  | { type: 'SET_CURRENT_STEP'; payload: Step }
  | { type: 'SET_CAR_NUMBER'; payload: string }
  | { type: 'SET_AVAILABLE_CARS'; payload: CarInfo[] }
  | { type: 'SET_LOADING_CARS'; payload: boolean }
  | { type: 'SHOW_PAYMENT_ERROR' }
  | { type: 'HIDE_PAYMENT_ERROR' };

const initialState: AppState = {
  currentStep: 'order-confirm',
  cart: [],
  order: null,
  paymentMethod: null,
  carNumber: '',
  availableCars: [],
  isLoadingCars: false,
  isPaymentErrorVisible: false,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItem = state.cart.find(item => item.product.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.product.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, { product: action.payload, quantity: 1 }],
      };
    }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.product.id !== action.payload),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
      };
    case 'SET_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethod: action.payload,
      };
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };
    case 'SET_CAR_NUMBER':
      return {
        ...state,
        carNumber: action.payload,
      };
    case 'SHOW_PAYMENT_ERROR':
      return {
        ...state,
        isPaymentErrorVisible: true,
      };
    case 'SET_AVAILABLE_CARS':
      return {
        ...state,
        availableCars: action.payload,
      };
    case 'SET_LOADING_CARS':
      return {
        ...state,
        isLoadingCars: action.payload,
      };
    case 'HIDE_PAYMENT_ERROR':
      return {
        ...state,
        isPaymentErrorVisible: false,
      };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addToCart = (product: Product) => {
    dispatch({ type: 'ADD_TO_CART', payload: product });
  };

  const removeFromCart = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const setPaymentMethod = (method: PaymentMethod) => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method });
  };

  const setCurrentStep = (step: Step) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  };

  const setCarNumber = (carNumber: string) => {
    dispatch({ type: 'SET_CAR_NUMBER', payload: carNumber });
  };

  const showPaymentError = () => {
    dispatch({ type: 'SHOW_PAYMENT_ERROR' });
  };

  const setAvailableCars = (cars: CarInfo[]) => {
    dispatch({ type: 'SET_AVAILABLE_CARS', payload: cars });
  };

  const setLoadingCars = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING_CARS', payload: loading });
  };

  const hidePaymentError = () => {
    dispatch({ type: 'HIDE_PAYMENT_ERROR' });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setPaymentMethod,
        setCurrentStep,
        setCarNumber,
        setAvailableCars,
        setLoadingCars,
        showPaymentError,
        hidePaymentError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}