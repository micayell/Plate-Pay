package com.pcarchu.platepay.codefToken.domain.repository;

import com.pcarchu.platepay.codefToken.domain.entity.CodefToken;

import java.util.Optional;

public interface CodefTokenRepository {
    Optional<CodefToken> save(CodefToken token);
    Optional<CodefToken> findById(String id);
}