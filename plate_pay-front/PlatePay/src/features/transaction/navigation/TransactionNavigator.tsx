import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TransactionScreen from '../screens/TransactionScreen';
import MonthlyTransactionScreen from '../screens/MonthlyTransactionScreen';

const Stack = createNativeStackNavigator();

export default function TransactionNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Transaction" component={TransactionScreen} />
      <Stack.Screen
        name="MonthlyTransaction"
        component={MonthlyTransactionScreen}
      />
    </Stack.Navigator>
  );
}
