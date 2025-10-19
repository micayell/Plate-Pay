package com.pcarchu.platepay.token.domain.repository;

import com.pcarchu.platepay.token.domain.entity.StaleToken;

import java.util.Optional;

public interface StaleTokenRepository {
    Optional<StaleToken> save(StaleToken staleToken);
    Optional<StaleToken> findByAccessToken(String accessToken);
}
