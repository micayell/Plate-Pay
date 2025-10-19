import React, { useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { AuthScreenProps } from '../navigation/AuthNavigator';
import { useAuthStore } from '../../../shared/state/authStore';
import { OAUTH_BASE_URL } from '../../../shared/api/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import CookieManager from '@react-native-cookies/cookies';
import { useFocusEffect } from '@react-navigation/native';
// import BottomTabNavigator from '../../../app/navigation/BottomTabNavigator';

const buildLoginUrl = () =>
  `${OAUTH_BASE_URL}/oauth2/authorization/kakao?random=${Math.random()}`;

const KakaoLoginScreen = ({ navigation }: AuthScreenProps<'KakaoLogin'>) => {
  const { setAuthData } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);
  // URL에 랜덤 값을 추가하여 캐시를 무효화합니다.
  const [sessionReady, setSessionReady] = useState(false);
  const [webKey, setWebKey] = useState(0);
  const [loginUrl, setLoginUrl] = useState(buildLoginUrl());

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          await CookieManager.clearAll(true); // 모든 도메인 쿠키 삭제
        } catch {}
        if (!alive) return;
        setWebKey(k => k + 1); // WebView 언마운트/마운트
        setLoginUrl(buildLoginUrl()); // 캐시무효 파라미터 포함 새 URL
        setSessionReady(true);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const handleMessage = async (event: WebViewMessageEvent) => {
    setIsLoading(true);
    try {
      console.log('KakaoLogin WebView message data:', event.nativeEvent.data);
      const response = JSON.parse(event.nativeEvent.data);
      console.log('KakaoLogin parsed response:', JSON.stringify(response, null, 2));

      if (response.success === true && response.data.accessToken) {
        // statusCode를 확인하여 분기 처리
        if (response.data.statusCode === 201) {
          // 201: 신규 사용자 -> 토큰은 저장하되, isLoggedIn은 false로 유지
          setAuthData({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            memberInfo: response.data.memberInfo,
            isLoggedIn: false,
          });
          navigation.replace('KakaoSignup', { memberInfo: response.data.memberInfo });
        } else {
          // 200 (또는 기타): 기존 사용자 -> 모든 정보 저장 및 로그인 처리
          setAuthData({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            memberInfo: response.data.memberInfo,
            isLoggedIn: true,
          });
        }
      } else {
        // 로그인 실패 또는 예외 케이스 처리
        setIsLoading(false);
        // TODO: 사용자에게 에러 알림 표시
      }
    } catch (error) {
      // JSON 파싱 실패는 최종 응답이 아니므로 무시
      setIsLoading(false);
    }
  };

  // 모든 페이지 로딩 완료 시마다 실행될 스크립트
  const scriptToInject = `
    (function() {
      try {
        const pre = document.querySelector('pre');
        const content = pre ? pre.textContent : document.body.innerText;
        // 내용이 JSON 형태인지 먼저 파싱 시도
        JSON.parse(content);

        // 파싱에 성공했다면, 이건 우리가 찾는 JSON 응답 페이지임.
        // 사용자에게 보이지 않도록 즉시 페이지 내용을 숨기고,
        // 데이터는 앱으로 전달한다.
        document.body.style.display = 'none';
        window.ReactNativeWebView.postMessage(content);
      } catch (e) {
        // 파싱에 실패했다면, 일반 웹페이지(예: 카카오 로그인창)이므로 아무것도 하지 않음.
      }
      return true;
    })();
  `;

  // 화면 비율 등을 맞추기 위한 스크립트 + 세션/스토리지 클리어
  const injectedJavaScriptBeforeContentLoaded = `
    // 모든 종류의 세션/로컬 스토리지 비우기
    localStorage.clear();
    sessionStorage.clear();

    // 뷰포트 설정
    const meta = document.createElement('meta');
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    meta.setAttribute('name', 'viewport');
    document.getElementsByTagName('head')[0].appendChild(meta);

    // JSON 응답 페이지 깜빡임 방지: DOM 로딩을 감지하여 body를 즉시 숨김
    const observer = new MutationObserver(function(mutations, me) {
      const body = document.querySelector('body');
      if (body) {
        const pre = body.querySelector('pre');
        // body 내부에 pre 태그가 있고, 그 내용이 JSON 형태일 가능성이 높으면 숨김
        if (pre && pre.innerText.trim().startsWith('{')) {
          body.style.display = 'none';
        }
        me.disconnect(); // 관찰 중지
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
      {sessionReady ? (
        <WebView
          key={webKey}
          ref={webViewRef}
          source={{ uri: loginUrl }}
          onMessage={handleMessage}
          injectedJavaScript={scriptToInject}
          onError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView 에러:', nativeEvent);
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
          // --- 아래 속성들을 추가/확인해주세요 ---
          incognito={true} // 시크릿 모드
          cacheEnabled={false} // 캐시 비활성화
          sharedCookiesEnabled={false} // 쿠키 공유 비활성화
          injectedJavaScriptBeforeContentLoaded={
            injectedJavaScriptBeforeContentLoaded
          }
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default KakaoLoginScreen;
