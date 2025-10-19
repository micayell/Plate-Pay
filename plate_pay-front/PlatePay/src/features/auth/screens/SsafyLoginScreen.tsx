// SsafyLoginScreen.tsx
import React, { useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { AuthScreenProps } from '../navigation/AuthNavigator';
import { useAuthStore } from '../../../shared/state/authStore';
import { OAUTH_BASE_URL } from '../../../shared/api/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import CookieManager from '@react-native-cookies/cookies';
import { useFocusEffect } from '@react-navigation/native';

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const buildLoginUrl = () =>
  `${OAUTH_BASE_URL}/oauth2/authorization/ssafy?random=${Math.random()}`;

const SsafyLoginScreen = ({ navigation }: AuthScreenProps<'SsafyLogin'>) => {
  const { setAuthData } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // 세션 정리/리마운트를 위한 상태들
  const [sessionReady, setSessionReady] = useState(false);
  const [webKey, setWebKey] = useState(0);
  const [loginUrl, setLoginUrl] = useState(buildLoginUrl());

  const webViewRef = useRef<WebView | null>(null);

  // 화면 진입 시: 모든 쿠키 제거 + WebView 리마운트 + URL 재생성
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          await CookieManager.clearAll(true); // 모든 도메인 쿠키 삭제
        } catch {}
        if (!alive) return;
        setWebKey(k => k + 1);        // WebView 언마운트/마운트
        setLoginUrl(buildLoginUrl()); // 캐시무효 파라미터 포함 새 URL
        setSessionReady(true);
      })();
      return () => { alive = false; };
    }, []),
  );

  // 서버가 JSON을 페이지로 내려보낼 때 잡아서 처리
  const handleMessage = async (event: WebViewMessageEvent) => {
    setIsLoading(true);
    try {
      const response = JSON.parse(event.nativeEvent.data);
      if (response.success === true && response.data?.accessToken) {
        if (response.data.statusCode === 201) {
          setAuthData({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            memberInfo: response.data.memberInfo,
            isLoggedIn: false,
          });
          navigation.replace('SsafySignup', { memberInfo: response.data.memberInfo });
        } else {
          setAuthData({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            memberInfo: response.data.memberInfo,
            isLoggedIn: true,
          });
        }
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  };

  // 모든 페이지 로딩 완료 시마다 실행될 스크립트
  const scriptToInject = `
    (function() {
      try {
        // 모든 종류의 세션/로컬 스토리지 비우기
        localStorage.clear();
        sessionStorage.clear();

        // 뷰포트 설정
        const meta = document.createElement('meta');
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        document.head.appendChild(meta);

        // ★★★ JSON 응답 페이지 깜빡임 방지 로직 추가 ★★★
        const observer = new MutationObserver(function(mutations, me) {
          const body = document.querySelector('body');
          if (body) {
            const pre = body.querySelector('pre');
            if (pre && pre.innerText.trim().startsWith('{')) {
              body.style.display = 'none';
            }
            me.disconnect();
          }
        });
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true
        });

        // ★ 반응형 CSS 주입 (두 번째 코드의 CSS)
        var style = document.createElement('style');
        style.innerHTML = \`
          html, body { width:100% !important; max-width:100% !important; overflow-x:hidden !important; }
          * { box-sizing:border-box; }
          img, canvas, iframe, video { max-width:100% !important; height:auto !important; }
          table { width:100% !important; max-width:100% !important; border-collapse:collapse; display:block; overflow-x:auto; }
          pre, code { white-space:pre-wrap !important; word-break:break-word !important; }
          input, select, textarea, button { max-width:100% !important; }
          /* 양옆 여백/폰트 크기 살짝 손봄 */
          body { padding: 8px !important; font-size: 16px; line-height: 1.4; }
          /* 로그인 폼류 추정 요소들을 세로 정렬 */
          form, .form, .login, .content, .container, .wrap, .layout {
            width:100% !important; max-width: 640px !important; margin: 0 auto !important;
          }
          label { display:block; margin: 10px 0 6px; }
          input[type="text"], input[type="email"], input[type="password"], .input, textarea, select {
            width:100% !important; padding: 12px; border: 1px solid #ddd; border-radius: 8px;
          }
          button, .btn {
            width:100% !important; padding: 14px; border-radius: 10px;
          }
          /* 로고 이미지가 너무 크면 줄임 */
          header img, .logo img, img[alt*="SAMSUNG"], img[alt*="SSAFY"] { max-width: 220px !important; height:auto !important; }
        \`;
        document.head.appendChild(style);
      } catch(e) {}
      true;
    })();
  `;

  // (로드 후) 스토리지 정리 + 레이아웃 보정 + JSON 응답 감지 (두 번째 코드의 보정 로직 합침)
  const injectedAfterLoad = `
    (function() {
      try {
        // --- 해당 origin의 스토리지/캐시/서비스워커 정리 ---
        try { localStorage.clear(); } catch(e) {}
        try { sessionStorage.clear(); } catch(e) {}
        try {
          if (indexedDB && indexedDB.databases) {
            indexedDB.databases().then(function(dbs){
              try { (dbs || []).forEach(function(db){
                if (db && db.name) { try { indexedDB.deleteDatabase(db.name); } catch(e) {} }
              }); } catch(e){}
            });
          }
        } catch(e){}
        try {
          if (caches && caches.keys) {
            caches.keys().then(function(keys){
              keys.forEach(function(k){ caches.delete(k); });
            });
          }
        } catch(e){}
        try {
          if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            navigator.serviceWorker.getRegistrations().then(function(regs){
              regs.forEach(function(r){ r.unregister(); });
            });
          }
        } catch(e){}

        // --- 레이아웃 보정(두 번째 코드) ---
        try {
          var deviceWidth = Math.max(360, Math.min(window.innerWidth || 360, 1080));

          function normalizeWidths() {
            var all = document.querySelectorAll('body *');
            for (var i = 0; i < all.length; i++) {
              var el = all[i];
              if (el.tagName === 'HTML' || el.tagName === 'BODY') continue;
              var rect = el.getBoundingClientRect();
              if (rect.width > deviceWidth) {
                el.style.maxWidth = '100%';
                el.style.width = '100%';
                el.style.overflowX = 'auto';
              }
            }
          }

          function wrapWideBlocks() {
            var blocks = document.querySelectorAll('table, pre, code');
            blocks.forEach(function(el){
              var rect = el.getBoundingClientRect();
              if (rect.width > deviceWidth) {
                el.style.display = 'block';
                el.style.overflowX = 'auto';
                el.style.width = '100%';
                el.style.maxWidth = '100%';
              }
            });
          }

          normalizeWidths();
          wrapWideBlocks();

          var ro = new (window.ResizeObserver || function(){ return { observe: function(){}, disconnect:function(){} }; })(function(){
            normalizeWidths(); wrapWideBlocks();
          });
          ro.observe(document.documentElement);

          var mo = new MutationObserver(function() {
            normalizeWidths(); wrapWideBlocks();
          });
          mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true });

          setTimeout(function(){
            var contentWidth = Math.max(
              document.documentElement.scrollWidth,
              document.body ? document.body.scrollWidth : 0
            );
            if (contentWidth > deviceWidth * 1.02) {
              var scale = deviceWidth / contentWidth;
              var meta = document.querySelector('meta[name="viewport"]');
              if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', 'viewport');
                document.head.appendChild(meta);
              }
              meta.setAttribute('content',
                'width=' + contentWidth +
                ', initial-scale=' + scale +
                ', minimum-scale=' + scale +
                ', maximum-scale=' + Math.max(1, scale) +
                ', viewport-fit=cover'
              );
            }
          }, 150);
        } catch(e) {}

        // --- 서버가 JSON을 페이지로 내려주면 잡아 RN으로 전달 ---
        try {
          var raw = '';
          var pre = document.querySelector('pre');
          if (pre && pre.textContent) raw = pre.textContent.trim();
          else if (document.body && document.body.innerText) raw = document.body.innerText.trim();
          if (/^[\\[{]/.test(raw) && raw.length < 200000) {
            var obj = JSON.parse(raw);
            if (obj && (obj.success === true || obj.accessToken || (obj.data && obj.data.accessToken))) {
              document.body.style.display = 'none';
              window.ReactNativeWebView.postMessage(JSON.stringify(obj));
            }
          }
        } catch (_) {}
      } catch (e) {}
      true;
    })();
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
          userAgent={MOBILE_UA}

          // ✅ 세션/쿠키/캐시 관련
          incognito
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          cacheEnabled={false}
          cacheMode="LOAD_NO_CACHE"

          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          originWhitelist={['*']}

          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}

          injectedJavaScriptBeforeContentLoaded={scriptToInject}
          injectedJavaScript={injectedAfterLoad}

          onMessage={handleMessage}
          onError={(e) => console.error('WebView onError:', e.nativeEvent)}
          onHttpError={(e) => console.error('WebView onHttpError:', e.nativeEvent)}
          onNavigationStateChange={(nav) => {
            if (__DEV__) console.log('[WV NAV]', nav.url);
          }}
          textZoom={100}
          overScrollMode="never"
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
  container: { flex: 1 },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});

export default SsafyLoginScreen;
