package com.pcarchu.platepay.codefToken.service;

import com.pcarchu.platepay.codefToken.domain.entity.CodefToken;

import java.util.Optional;

public interface CodefTokenService {
    Optional<CodefToken> create();
    Optional<CodefToken> getToken();
}
