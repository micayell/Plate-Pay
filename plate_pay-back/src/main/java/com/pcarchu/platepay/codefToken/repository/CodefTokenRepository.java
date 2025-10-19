package com.pcarchu.platepay.codefToken.repository;

import com.pcarchu.platepay.codefToken.domain.CodefToken;

import java.util.Optional;

public interface CodefTokenRepository {
    Optional<CodefToken> save(CodefToken token);
    Optional<CodefToken> findById(String id);
}