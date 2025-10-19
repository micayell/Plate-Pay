import messaging from "@react-native-firebase/messaging";
import { firebase } from "@react-native-firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { axiosInstance } from "../shared/api/axiosInstance";

class FCMService {
  private initialized = false;

  constructor() {
    this.initializeNotifee();
    this.initWhenReady();
  }

  private async initializeNotifee() {
    try {
      console.log("🔔 Initializing Notifee...");
      const channelId = await notifee.createChannel({
        id: "fcm-channel",
        name: "FCM Notifications",
        description: "Channel for FCM notifications",
        importance: AndroidImportance.HIGH,
        sound: "default",
        vibration: true,
      });
      console.log(`🔔 Notifee channel created: ${channelId}`);
    } catch (error) {
      console.error("🔔 Error initializing Notifee:", error);
    }
  }

  private async initWhenReady() {
    console.log("🔥 FCM: Starting FCM initialization process...");

    // Firebase 자동 초기화 대기 (짧게)
    for (let i = 0; i < 30; i++) {
      try {
        if (firebase.apps.length > 0) {
          console.log("🔥 FCM: Firebase app detected!", firebase.app().name);
          await this.init();
          console.log("🔥 FCM: ✅ FCM initialization completed successfully!");
          return;
        }
      } catch (e: any) {
        console.log("🔥 FCM: Error during Firebase check:", e?.message ?? e);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    console.error("🔥 FCM: Firebase initialization timeout");
  }

  private async init() {
    if (this.initialized) {
      console.log("🔥 FCM: Already initialized, skipping");
      return;
    }

    try {
      console.log("🔥 FCM: Step 1 - Requesting permission...");
      await this.requestPermission();

      console.log("🔥 FCM: Step 2 - Getting FCM token...");
      await this.getToken();

      console.log("🔥 FCM: Step 3 - Setting up message handlers...");
      this.setupMessageHandlers();

      console.log("🔥 FCM: Step 4 - Setting up token refresh handler...");
      this.setupTokenRefreshHandler();

      this.initialized = true;
      console.log("🔥 FCM: ✅ All initialization steps completed successfully!");
    } catch (error: any) {
      console.error("🔥 FCM: ❌ Initialization failed:", error);
      console.error("🔥 FCM: Error details:", error?.message ?? error);
    }
  }

  private async requestPermission() {
    try {
      console.log("🔥 FCM: Requesting notification permission...");
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log("🔥 FCM: ✅ Notification permission granted!", authStatus);
      } else {
        console.log("🔥 FCM: ❌ Notification permission denied.", authStatus);
      }
      return enabled;
    } catch (error: any) {
      console.error("🔥 FCM: ❌ Permission request error:", error?.message ?? error);
      return false;
    }
  }

  private async getToken() {
    try {
      console.log("🔥 FCM: Attempting to get FCM token...");
      const token = await messaging().getToken();

      if (token) {
        console.log("🔥 FCM: ✅ FCM Token obtained successfully!");
        console.log("🔥 FCM: Token length:", token.length);
        console.log("🔥 FCM: Token preview:", token);
        await AsyncStorage.setItem("fcm_token", token);
        console.log("🔥 FCM: Token saved to AsyncStorage");
        return token;
      } else {
        console.log("🔥 FCM: ⚠️ FCM Token is empty or null");
        return null;
      }
    } catch (error: any) {
      console.error("🔥 FCM: ❌ Get token error:", error?.message ?? error);
      return null;
    }
  }

  // 로그인 후 호출용
  async getCurrentToken() {
    try {
      if (firebase.apps.length === 0) {
        console.log("🔥 FCM: No Firebase app found, cannot get token");
        return null;
      }
      const token = await messaging().getToken();
      console.log("🔥 FCM: Token retrieved successfully");
      return token;
    } catch (error) {
      console.log("🔥 FCM: Get current token error:", error);
      return null;
    }
  }

  private setupMessageHandlers() {
    // Foreground
    messaging().onMessage(async (remoteMessage) => {
      console.log("🔔 Foreground message received:", remoteMessage);
      await this.showLocalNotification(remoteMessage);
    });

    // Background (헤드리스 태스크)
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("Background message received:", remoteMessage);
    });

    // 앱이 백그라운드에서 알림 클릭으로 열릴 때
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log("Notification opened app:", remoteMessage);
    });

    // 앱이 종료 상태에서 알림 클릭으로 열렸는지 확인
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log("App opened from notification:", remoteMessage);
        }
      });
  }

  private setupTokenRefreshHandler() {
    messaging().onTokenRefresh(async (token) => {
      console.log("FCM Token refreshed:", token);
      await AsyncStorage.setItem("fcm_token", token);
      await this.sendTokenToServer(token);
    });
  }

  private async showLocalNotification(remoteMessage: any) {
    try {
      const { notification, data } = remoteMessage;

      const title = notification?.title ?? "알림";
      const body = notification?.body ?? "새 메시지가 도착했습니다";

      await notifee.displayNotification({
        title,
        body,
        data: {
          ...data,
          messageId: remoteMessage.messageId,
          sentTime: remoteMessage.sentTime,
        },
        android: {
          channelId: "fcm-channel",
          importance: AndroidImportance.HIGH,
          sound: "default",
          vibrationPattern: [300, 500],
          smallIcon: "ic_launcher",
          pressAction: {
            id: "default",
            launchActivity: "default",
          },
        },
      });

      console.log("🔔 System notification displayed successfully");
    } catch (error) {
      console.error("🔔 Error showing system notification:", error);
    }
  }

  async sendTokenToServer(token: string) {
    try {
      const url = "https://j13c108.p.ssafy.io/api/v1/fcms";
      const payload = { token };

      const response = await axiosInstance.post(url, payload);

      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error?.response?.data || error?.message };
    }
  }
}

export default new FCMService();
