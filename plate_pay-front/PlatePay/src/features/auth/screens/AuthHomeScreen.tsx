import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { AuthScreenProps } from '../navigation/AuthNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

const KakaoIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 38 38">
    <Path
      fill="#000000"
      d="M19 3c-8.837 0-16 5.894-16 13.125 0 4.963 3.58 9.281 8.531 11.547l-1.422 5.172c-.125.438.313.828.719.594l6.172-3.469c.656.078 1.328.125 2 .125 8.837 0 16-5.894 16-13.125S27.837 3 19 3z"
    />
  </Svg>
);

const ssafyLogo = require('../../../assets/images/ssafy_logo.png');

// SSAFY 로고 이미지를 사용하도록 수정
const SsafyIcon = () => <Image source={ssafyLogo} style={styles.ssafyIcon} />;

const platePayLogo = require('../../../assets/images/platepay-image-removebg-AuthHomeScreen.png');

export default function AuthHomeScreen({ navigation }: AuthScreenProps<'AuthHome'>) {
  const handleKakaoLogin = () => {
    console.log('--- Kakao Login Button Pressed ---');
    navigation.navigate('KakaoLogin'); // KakaoLoginScreen으로 이동
  };

  const handleSsafyLogin = () => {
    console.log('--- Ssafy Login Button Pressed ---');
    navigation.navigate('SsafyLogin'); // SsafyLoginScreen으로 이동
  };

  return (
    <LinearGradient colors={['#7AC8FF', '#B2EBF2']} style={{ flex: 1 }}>
      <Svg height="100%" width="100%" style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient
            id="grad1"
            cx="-5%"
            cy="15%"
            r="80%"
            fx="-5%"
            fy="15%"
          >
            <Stop offset="0%" stopColor="#007BFF" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#007BFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id="grad2"
            cx="110%"
            cy="80%"
            r="80%"
            fx="110%"
            fy="80%"
          >
            <Stop offset="0%" stopColor="#1994FA" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#1994FA" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="50%" rx="150%" ry="100%" fill="url(#grad1)" />
        <Ellipse cx="50%" cy="50%" rx="100%" ry="150%" fill="url(#grad2)" />
      </Svg>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.logoContainer}>
          <Image source={platePayLogo} style={styles.logo} />
        </View>
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.kakaoButton]}
            onPress={handleKakaoLogin}
          >
            <KakaoIcon />
            <Text style={[styles.buttonText, styles.kakaoButtonText]}>
              카카오 로그인
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.ssafyButton]}
            onPress={handleSsafyLogin}
          >
            <SsafyIcon />
            <Text style={[styles.buttonText, styles.ssafyButtonText]}>
              SSAFY 로그인
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Gradient의 밝은 부분으로 우선 적용
    alignItems: 'center',
  },
  logoContainer: {
    flex: 2,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  logo: {
    width: 292,
    height: 292,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
  },
  buttonContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  ssafyButton: {
    backgroundColor: '#009DFF',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  kakaoButtonText: {
    color: '#000000',
  },
  ssafyButtonText: {
    color: '#FFFFFF',
    marginLeft: 8, // SSAFY 버튼만 간격을 약간 좁게 조정
  },
  ssafyIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    borderRadius: 3,
  },
});