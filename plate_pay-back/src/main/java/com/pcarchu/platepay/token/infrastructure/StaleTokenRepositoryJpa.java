package com.pcarchu.platepay.token.infrastructure;

import com.pcarchu.platepay.token.domain.entity.StaleToken;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface StaleTokenRepositoryJpa extends CrudRepository<StaleToken, String> {
    Optional<StaleToken> findByAccessToken(String accessToken);
}
