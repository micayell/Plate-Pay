package com.pcarchu.platepay.token.service;

import com.pcarchu.platepay.token.domain.entity.RefreshToken;

import java.util.Optional;

public interface RefreshTokenService {
    void writeTokenInfo(String email, String loginType, String accessToken, String refreshToken);
    void removeRefreshToken(String refreshToken);
    Optional<RefreshToken> getRefreshToken(String refreshToken);
    String reissue(String refreshToken);
    void storeFcmToken(String accessToken, String fcmToken);
}
