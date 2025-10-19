package com.pcarchu.platepay.token.infrastructure;

import com.pcarchu.platepay.token.domain.entity.RefreshToken;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface RefreshTokenRepositoryJpa extends CrudRepository<RefreshToken, String>  {
    Optional<RefreshToken> findByRefreshToken(String accessToken);
    Optional<RefreshToken> findByAccessToken(String accessToken);
    Optional<RefreshToken> findByEmail(String email);
}
