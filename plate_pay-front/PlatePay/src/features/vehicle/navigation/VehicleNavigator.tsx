import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VehicleScreen from '../screens/VehicleScreen';
import VehicleRegistrationScreen from '../screens/VehicleRegistrationScreen';

const Stack = createNativeStackNavigator();

const VehicleNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VehicleMain" component={VehicleScreen} />
      <Stack.Screen name="VehicleRegistration" component={VehicleRegistrationScreen} />
    </Stack.Navigator>
  );
};

export default VehicleNavigator;
