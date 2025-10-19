package com.pcarchu.platepay.token.infrastructure;

import com.pcarchu.platepay.token.domain.entity.RefreshToken;
import com.pcarchu.platepay.token.domain.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepositoryImpl implements RefreshTokenRepository {

    private final RefreshTokenRepositoryJpa refreshTokenRepositoryJpa;

    @Override
    public Optional<RefreshToken> save(RefreshToken refreshToken) {
        return Optional.ofNullable(refreshTokenRepositoryJpa.save(refreshToken));
    }

    @Override
    public Optional<RefreshToken> findByRefreshToken(String accessToken) {
        return refreshTokenRepositoryJpa.findByRefreshToken(accessToken);
    }

    @Override
    public void delete(RefreshToken entity) {
        refreshTokenRepositoryJpa.delete(entity);
    }

    @Override
    public Optional<RefreshToken> findByAccessToken(String accessToken) {
        return refreshTokenRepositoryJpa.findByAccessToken(accessToken);
    }

    @Override
    public Optional<RefreshToken> findByEmail(String email) {
        return refreshTokenRepositoryJpa.findByEmail(email);
    }
}
