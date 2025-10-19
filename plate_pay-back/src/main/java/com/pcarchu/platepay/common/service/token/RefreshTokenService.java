package com.pcarchu.platepay.common.service.token;

import com.pcarchu.platepay.token.domain.entity.RefreshToken;

import java.util.Optional;

public interface RefreshTokenService {
    void writeTokenInfo(String email, String accessToken, String refreshToken);
    void removeRefreshToken(String refreshToken);
    Optional<RefreshToken> getRefreshToken(String refreshToken);
    String reissue(String refreshToken);
}
