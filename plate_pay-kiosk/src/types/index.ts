export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  items: CartItem[];
  totalAmount: number;
}

export type PaymentMethod = 'card' | 'carpay';

export type Step = 'order-confirm' | 'payment-method' | 'completion';

export interface CarInfo {
  id: string;
  plateNumber: string;
  model?: string;
  color?: string;
}

export interface AppState {
  currentStep: Step;
  cart: CartItem[];
  order: Order | null;
  paymentMethod: PaymentMethod | null;
  carNumber: string;
  availableCars: CarInfo[];
  isLoadingCars: boolean;
  isPaymentErrorVisible: boolean;
}