package com.pcarchu.platepay.token.domain.repository;

import com.pcarchu.platepay.token.domain.entity.RefreshToken;

import java.util.Optional;

public interface RefreshTokenRepository {
    Optional<RefreshToken> save(RefreshToken refreshToken);
    Optional<RefreshToken> findByRefreshToken(String refreshToken);
    Optional<RefreshToken> findByAccessToken(String accessToken);
    Optional<RefreshToken> findByEmail(String email);
    void delete(RefreshToken entity);
}
