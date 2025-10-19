import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import RootNavigator from "./src/app/navigation/RootNavigator";
import { firebase } from "@react-native-firebase/app"; // ✅ RNFirebase 방식
import './src/setup/ignoreLogs';
enableScreens();

export default function App() {
  useEffect(() => {
    try {
      console.log("🔥 APP: Starting Firebase initialization...");
      console.log("🔥 APP: Firebase apps count:", firebase.apps.length);

      if (firebase.apps.length > 0) {
        console.log("🔥 APP: ✅ Firebase already initialized!");
        console.log("🔥 APP: Default app name:", firebase.app().name);
      } else {
        // Android는 google-services.json로 자동 초기화됨
        console.log("🔥 APP: ⚠️ No app yet (will auto-init from google-services.json)");
      }

      // FCM 서비스 로딩 (지연 불필요)
      const FCMService = require("./src/services/FCMService").default;
      console.log("🔥 APP: FCMService imported successfully");
    } catch (e: any) {
      console.log("🔥 APP: ❌ Firebase initialization error:", e?.message ?? e);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
