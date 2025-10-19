import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

export function useAndroidLocationPermission() {
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
      }
    })();
  }, []);
}
