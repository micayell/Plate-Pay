import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

export type MapMarker = { id: string; lat: number; lng: number; name?: string };

type ClustererOptions =
  | boolean
  | {
      minLevel?: number;         // 줌 레벨이 이 값보다 클 때 클러스터링 (기본 8)
      averageCenter?: boolean;   // 평균 중심 사용 (기본 true)
      gridSize?: number;         // 클러스터 격자 크기(px) (기본 60)
      disableClickZoom?: boolean;// 클러스터 클릭시 줌 방지 (기본 false)
    };

type Props = {
  jsKey: string;
  markers?: MapMarker[] | { markers: MapMarker[] };
  style?: ViewStyle;
  onReady?: () => void;
  onMarkerClick?: (id: string) => void;
  onLocateOk?: (coords: { latitude: number; longitude: number }) => void;
  onLocateError?: (reason: string | number) => void;
  autoLocateOnReady?: 'if-granted' | 'always' | false;
  hasNativeLocationPermission?: boolean;
  /** Kakao 콘솔 '웹' 플랫폼에 등록한 도메인(예: 'http://localhost', 'http://10.0.2.2:8081') */
  baseUrl?: string;

  /** ✅ 마커 클러스터링 옵션 (true면 기본값 사용) */
  clustering?: ClustererOptions;
};

export type MapViewKakaoHandle = {
  locateMe: () => void;
  setCenter: (lat: number, lng: number, level?: number) => void;
  highlightMarker?: (id: string) => void;
  clearMarkers?: () => void;
  setMarkersDirect?: (markers: MapMarker[]) => void;
};

function normalizeMarkers(input?: MapMarker[] | { markers: MapMarker[] }): MapMarker[] {
  if (Array.isArray(input)) return input;
  if (input && Array.isArray((input as any).markers)) return (input as any).markers;
  return [];
}

const makeHtml = (
  JS_KEY: string,
  CLUSTER_CFG: {
    enabled: boolean;
    minLevel: number;
    averageCenter: boolean;
    gridSize: number;
    disableClickZoom: boolean;
  }
) => `
<!doctype html><html lang="ko"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style>
  html,body,#map{height:100%;margin:0;padding:0}
  /* ===== 말풍선 스타일 ===== */
  .pp-bubble{position:relative;background:#0064FF;color:#fff;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:700;box-shadow:0 6px 16px rgba(0,100,255,.22);opacity:0;transform:translateY(6px) scale(.98);transition:all .18s ease;white-space:nowrap;max-width:220px}
  .pp-bubble.show{opacity:1;transform:translateY(0) scale(1)}
  .pp-bubble-inner{overflow:hidden;text-overflow:ellipsis}
  .pp-bubble-tail{position:absolute;left:50%;transform:translateX(-50%);bottom:-6px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #0064FF}
</style>
</head><body><div id="map"></div>
<script>
  // ====== 상태 ======
  var map, myMarker, clusterer = null;
  var markerList = [];     // kakao.maps.Marker[]
  var markerIndex = {};    // id -> kakao.maps.Marker
  var posIndex = {};       // id -> kakao.maps.LatLng
  var nameIndex = {};      // id -> name string
  var overlayIndex = {};   // id -> kakao.maps.CustomOverlay
  var activeOverlay = null;

  var _sdkReady = false;

  // 디바운스/청크 관련
  var _queuedMarkers = null;
  var _raf = 0;
  var _creating = false;
  var _pendingAfterCreate = false;
  var _clearing = false;

  // 화면 맞춤 계획
  var _fitPlan = null;
  var _fitRaf = 0;

  // 동일 데이터 디듀프용
  var _lastJson = '';

  // 튜닝
  var CHUNK_CREATE = 12;
  var CHUNK_CLEAR  = 12;

  // ✅ 클러스터 설정 주입
  var CLUSTER_CFG = ${JSON.stringify(CLUSTER_CFG)};

  function postMsg(p){
    try {
      var s = JSON.stringify(p);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(s);
      }
    } catch(e){}
  }
  window.onerror = function(msg, src, line, col){
    try { postMsg({ type:'jsError', msg: String(msg), src: String(src||''), line: line||0, col: col||0 }); } catch(e){}
  };

  function closeActiveOverlay(){
    try {
      if (activeOverlay) {
        var el = activeOverlay.getContent();
        if (el && el.classList) el.classList.remove('show');
        activeOverlay.setMap(null);
        activeOverlay = null;
      }
    } catch(e){}
  }

  function clearOverlays(){
    closeActiveOverlay();
    try {
      for (var k in overlayIndex) {
        if (overlayIndex[k]) {
          try { overlayIndex[k].setMap(null); } catch(e){}
        }
      }
    } finally {
      overlayIndex = {};
    }
  }

  // ----- 말풍선 DOM 생성 -----
  function createBubbleDom(text){
    var wrap = document.createElement('div');
    wrap.className = 'pp-bubble';
    var inner = document.createElement('div');
    inner.className = 'pp-bubble-inner';
    inner.textContent = String(text || '');
    var tail = document.createElement('div');
    tail.className = 'pp-bubble-tail';
    wrap.appendChild(inner);
    wrap.appendChild(tail);
    return wrap;
  }

  // ----- 마커 삭제 -----
  function clearMarkersChunked(done){
    if (_clearing) {
      return requestAnimationFrame(function(){ clearMarkersChunked(done); });
    }
    _clearing = true;
    try {
      // 오버레이도 함께 정리
      clearOverlays();

      // ✅ 클러스터러 사용 시 한방 정리
      if (clusterer) {
        try { clusterer.clear(); } catch(e){}
        markerList.length = 0;
        markerIndex = {};
        posIndex = {};
        nameIndex = {};
        _clearing = false;
        if (typeof done === 'function') done();
        return;
      }

      var i = 0;
      var total = markerList.length;

      function step(){
        try {
          var end = Math.min(i + CHUNK_CLEAR, total);
          for (; i < end; i++){
            var m = markerList[i];
            if (!m) continue;
            try { m.setMap(null); } catch(e){}
          }
          if (i < total) {
            return setTimeout(step, 0);
          }
          markerList.length = 0;
          markerIndex = {};
          posIndex = {};
          nameIndex = {};
          _clearing = false;
          if (typeof done === 'function') done();
        } catch(e){
          _clearing = false;
          throw e;
        }
      }
      step();
    } catch(e){
      _clearing = false;
      throw e;
    }
  }

  // ----- 화면 맞춤 -----
  function planFit(valid){
    if (valid.length === 1) {
      _fitPlan = { type: 'single', p: valid[0] };
    } else if (valid.length > 1) {
      var pts = [];
      for (var i=0;i<valid.length;i++) {
        pts.push(new kakao.maps.LatLng(valid[i].lat, valid[i].lng));
      }
      _fitPlan = { type: 'bounds', pts: pts };
    } else {
      _fitPlan = null;
    }

    if (_fitRaf) cancelAnimationFrame(_fitRaf);
    _fitRaf = requestAnimationFrame(function(){
      _fitRaf = 0;
      if (!_fitPlan) return;
      try {
        if (_fitPlan.type === 'single') {
          var p = _fitPlan.p;
          map.setCenter(new kakao.maps.LatLng(p.lat, p.lng));
          map.setLevel(3, { animate: { duration: 200 } });
        } else if (_fitPlan.type === 'bounds') {
          var b = new kakao.maps.LatLngBounds();
          for (var j=0;j<_fitPlan.pts.length;j++) b.extend(_fitPlan.pts[j]);
          map.setBounds(b);
        }
      } catch(e){
        postMsg({ type:'jsError', msg:String(e), where:'fit' });
      } finally {
        _fitPlan = null;
      }
    });
  }

  // ----- 마커 생성(청크) -----
  function createMarkersChunked(list){
    if (_creating) return;
    _creating = true;
    _pendingAfterCreate = false;

    try {
      clearMarkersChunked(function(){
        var arr = Array.isArray(list) ? list : [];
        var valid = [];
        var i = 0;

        // ✅ 클러스터 추가를 배치로
        var batch = [];

        function flushBatch(){
          if (clusterer && batch.length) {
            try { clusterer.addMarkers(batch); } catch(e){}
            batch = [];
          }
        }

        function step(){
          try {
            var end = Math.min(i + CHUNK_CREATE, arr.length);
            for (; i < end; i++){
              var p = arr[i] || {};
              var id = String(p.id || '');
              var lat = Number(p.lat);
              var lng = Number(p.lng);
              var nm = String(p.name || p.id || '');
              if (!id || !isFinite(lat) || !isFinite(lng)) continue;

              var pos = new kakao.maps.LatLng(lat, lng);
              posIndex[id] = pos;
              nameIndex[id] = nm;
              valid.push({ id:id, lat:lat, lng:lng });

              var m = new kakao.maps.Marker({ position: pos, clickable: true });
              if (!clusterer) {
                m.setMap(map);
              } else {
                batch.push(m);
              }

              // ✔ 말풍선 오버레이 미리 만들어두기(감춰둠)
              (function(_id, _pos, _name){
                var content = createBubbleDom(_name);
                var ov = new kakao.maps.CustomOverlay({
                  position: _pos,
                  content: content,
                  yAnchor: 1.25,
                  xAnchor: 0.5,
                  zIndex: 5
                });
                // 아직 setMap(null) 상태 (표시 안 함)
                overlayIndex[_id] = ov;

                kakao.maps.event.addListener(m, 'click', function(){
                  // RN에 클릭 전달
                  postMsg({ type:'markerClick', id:_id });

                  // 기존 열려있던 오버레이 닫기
                  closeActiveOverlay();

                  // 이 마커 오버레이 열기 + 페이드 인 클래스
                  try {
                    var el = ov.getContent();
                    if (el && el.classList) el.classList.remove('show');
                    ov.setPosition(_pos); // 혹시 변경됐을 수 있으니 갱신
                    ov.setMap(map);
                    activeOverlay = ov;
                    setTimeout(function(){
                      try {
                        var el2 = ov.getContent();
                        if (el2 && el2.classList) el2.classList.add('show');
                      } catch(e){}
                    }, 0);
                  } catch(e){}
                });
              })(id, pos, nm);

              markerList.push(m);
              markerIndex[id] = m;
            }

            flushBatch();

            if (i < arr.length) {
              return setTimeout(step, 0);
            }

            planFit(valid);
            postMsg({ type:'markersSet', count: valid.length });
            _creating = false;

            if (_pendingAfterCreate && _queuedMarkers) {
              scheduleApply();
            }
          } catch(e) {
            _creating = false;
            postMsg({ type:'jsError', msg:String(e), where:'createMarkersChunked.step' });
          }
        }
        step();
      });
    } catch(e){
      _creating = false;
      postMsg({ type:'jsError', msg: String(e), where:'createMarkersOuter' });
    }
  }

  // 지도 클릭 시 열려있는 말풍선 닫기
  function bindMapClickClose(){
    if (!map) return;
    kakao.maps.event.addListener(map, 'click', function(){ closeActiveOverlay(); });
  }

  // ----- 적용 스케줄 -----
  function scheduleApply(){
    if (!_sdkReady || !map || !_queuedMarkers) return;
    if (_creating || _clearing) { _pendingAfterCreate = true; return; }
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(function(){
      _raf = 0;
      var data = _queuedMarkers;
      _queuedMarkers = null;
      createMarkersChunked(data);
    });
  }

  // ----- RN -> WV API -----
  window.setMarkers = function(list){
    try {
      if (typeof list === 'string') {
        try { list = JSON.parse(list); } catch(e){ list = []; }
      }
      var arr = Array.isArray(list) ? list
              : (list && Array.isArray(list.markers) ? list.markers : []);
      var json = '';
      try { json = JSON.stringify(arr); } catch(e){ json = ''; }
      if (json && json === _lastJson) return;
      _lastJson = json;

      _queuedMarkers = arr;
      scheduleApply();
    } catch(e){
      postMsg({ type:'jsError', msg:String(e), where:'setMarkers' });
    }
  };

  window.highlightMarker = function(id){
    var pos = posIndex[id];
    if (!pos) { postMsg({ type:'highlightMiss', id:id }); return; }
    map.setCenter(pos);
    map.setLevel(3, { animate: { duration: 200 } });

    // 말풍선도 함께 보여주기
    try {
      closeActiveOverlay();
      var ov = overlayIndex[id];
      if (ov) {
        var el = ov.getContent();
        if (el && el.classList) el.classList.remove('show');
        ov.setPosition(pos);
        ov.setMap(map);
        activeOverlay = ov;
        setTimeout(function(){
          try {
            var el2 = ov.getContent();
            if (el2 && el2.classList) el2.classList.add('show');
          } catch(e){}
        }, 0);
      }
    } catch(e){}
  };

  window.setCenter = function(lat, lng, level){
    var ll = new kakao.maps.LatLng(Number(lat), Number(lng));
    map.setCenter(ll); map.setLevel(level || 3, { animate: { duration: 200 } });
  };

  window.clearMarkers = function(){
    _lastJson = '';
    _queuedMarkers = null;
    if (_creating) { _pendingAfterCreate = false; }
    clearMarkersChunked(function(){
      postMsg({ type:'markersSet', count: 0 });
    });
  };

  window.locateMe = function(){
    if (!navigator.geolocation) { postMsg({ type:'locError', reason:'no_geolocation' }); return; }
    navigator.geolocation.getCurrentPosition(
      function(pos){
        var latitude = pos.coords.latitude, longitude = pos.coords.longitude;
        var ll = new kakao.maps.LatLng(latitude, longitude);
        if (!myMarker) { myMarker = new kakao.maps.Marker({ position: ll }); myMarker.setMap(map); }
        else { myMarker.setPosition(ll); }
        map.setCenter(ll); map.setLevel(3,{ animate:{ duration:200 }});
        postMsg({ type:'locOk', coords:{ latitude: latitude, longitude: longitude } });
      },
      function(err){ postMsg({ type:'locError', reason: err && (err.code || err.message) || 'denied' }); },
      { enableHighAccuracy:true, timeout:8000, maximumAge:0 }
    );
  };

  // ====== Kakao SDK 동적 로딩 ======
  (function injectKakao(){
    var url = "https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${JS_KEY}" + (CLUSTER_CFG.enabled ? "&libraries=clusterer" : "");
    var s = document.createElement('script');
    s.src = url;
    s.onload = function(){
      postMsg({ type:'sdk', ok:true });
      if (typeof kakao === 'undefined' || !kakao.maps) {
        postMsg({ type:'jsError', msg:'kakao object missing after load', src: location.href });
        return;
      }
      kakao.maps.load(init);
    };
    s.onerror = function(){
      postMsg({ type:'sdk', ok:false, reason:'load_failed', url: url });
    };
    document.head.appendChild(s);
  })();

  function init(){
    try {
      map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(37.4979, 127.0276),
        level: 6
      });

      // ✅ 클러스터러 초기화
      if (CLUSTER_CFG.enabled && kakao.maps.MarkerClusterer) {
        clusterer = new kakao.maps.MarkerClusterer({
          map: map,
          minLevel: CLUSTER_CFG.minLevel,
          averageCenter: !!CLUSTER_CFG.averageCenter,
          gridSize: CLUSTER_CFG.gridSize || 60,
          disableClickZoom: !!CLUSTER_CFG.disableClickZoom
        });
      }

      _sdkReady = true;
      bindMapClickClose();           // 지도 클릭 시 말풍선 닫기
      postMsg({ type:'ready' });
      scheduleApply();
    } catch(e){
      postMsg({ type:'jsError', msg: String(e), where:'init' });
    }
  }
</script></body></html>
`;

const MapViewKakao = React.forwardRef<MapViewKakaoHandle, Props>(({
  jsKey,
  markers,
  style,
  onReady,
  onMarkerClick,
  onLocateOk,
  onLocateError,
  autoLocateOnReady = 'if-granted',
  hasNativeLocationPermission,
  baseUrl,
  clustering = false,   // ✅ 기본 off
}, ref) => {
  const webRef = useRef<WebView>(null);

  const clusterCfg = useMemo(() => {
    const def = { enabled: false, minLevel: 8, averageCenter: true, gridSize: 60, disableClickZoom: false };
    if (typeof clustering === 'boolean') return { ...def, enabled: clustering };
    return { ...def, enabled: true, ...clustering };
  }, [clustering]);

  const html = useMemo(() => makeHtml(jsKey, clusterCfg), [jsKey, clusterCfg]);

  // RN 측에서도 동일 데이터면 inject 생략
  const lastMarkersJsonRef = useRef<string>('');
  const didAutoLocateRef = useRef(false);

  useImperativeHandle(ref, () => ({
    locateMe: () => webRef.current?.injectJavaScript('window.locateMe && window.locateMe(); true;'),
    setCenter: (lat, lng, level) =>
      webRef.current?.injectJavaScript(`window.setCenter && window.setCenter(${lat}, ${lng}, ${level ?? 3}); true;`),
    highlightMarker: (id) =>
      webRef.current?.injectJavaScript(`window.highlightMarker && window.highlightMarker(${JSON.stringify(id)}); true;`),
    clearMarkers: () =>
      webRef.current?.injectJavaScript('window.clearMarkers && window.clearMarkers(); true;'),
    setMarkersDirect: (mks) => {
      const json = JSON.stringify(Array.isArray(mks) ? mks : []);
      if (json === lastMarkersJsonRef.current) return;
      lastMarkersJsonRef.current = json;
      webRef.current?.injectJavaScript(`window.setMarkers && window.setMarkers(${json}); true;`);
    },
  }), []);

  // markers 변경 시 한 번만 주입 (동일 데이터면 생략)
  useEffect(() => {
    const arr = normalizeMarkers(markers);
    const json = JSON.stringify(arr);
    if (json === lastMarkersJsonRef.current) return;
    lastMarkersJsonRef.current = json;
    webRef.current?.injectJavaScript(`window.setMarkers && window.setMarkers(${json}); true;`);
  }, [markers]);

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      source={{ html, baseUrl: baseUrl || 'https://localhost' }}
      javaScriptEnabled
      geolocationEnabled
      domStorageEnabled
      mixedContentMode="always"
      androidLayerType="hardware"
      onMessage={(evt) => {
        try {
          const data = JSON.parse(evt.nativeEvent.data || '{}');
          if (__DEV__) console.log('[WV]', data);
          console.log('[KakaoMap]', data);
          if (data?.type === 'ready') {
            onReady?.();
            // ready 시점에 마지막 markers 보장 주입
            const json = lastMarkersJsonRef.current || JSON.stringify(normalizeMarkers(markers));
            webRef.current?.injectJavaScript(`window.setMarkers && window.setMarkers(${json}); true;`);

            if (!didAutoLocateRef.current) {
              const should = autoLocateOnReady === 'always' ||
                (autoLocateOnReady === 'if-granted' && hasNativeLocationPermission);
              if (should) {
                didAutoLocateRef.current = true;
                setTimeout(() => {
                  webRef.current?.injectJavaScript('window.locateMe && window.locateMe(); true;');
                }, 0);
              }
            }
          }

          if (data?.type === 'markerClick') onMarkerClick?.(data.id);
          if (data?.type === 'locOk') onLocateOk?.(data.coords);
          if (data?.type === 'locError') onLocateError?.(String(data.reason));
        } catch {}
      }}
      style={style}
    />
  );
});

export default MapViewKakao;
const s = StyleSheet.create({});
