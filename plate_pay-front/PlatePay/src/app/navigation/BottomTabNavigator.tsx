import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../../features/home/screens/HomeScreen';
import WalletScreen from '../../features/wallet/screens/WalletScreen';
import VehicleNavigator from '../../features/vehicle/navigation/VehicleNavigator'; // VehicleScreen 대신 VehicleNavigator를 가져옵니다.
import CustomTabBar from './CustomTabBar';
import PartnershipScreen from '../../features/partnership/screens/PartnershipScreen';
import TransactionNavigator from '../../features/transaction/navigation/TransactionNavigator';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="제휴" component={PartnershipScreen} />
      <Tab.Screen name="거래내역" component={TransactionNavigator} />
      {/* '차량' 탭의 컴포넌트를 VehicleNavigator로 변경합니다. */}
      <Tab.Screen name="차량" component={VehicleNavigator} />
      <Tab.Screen name="지갑" component={WalletScreen} />
    </Tab.Navigator>
  );
}
