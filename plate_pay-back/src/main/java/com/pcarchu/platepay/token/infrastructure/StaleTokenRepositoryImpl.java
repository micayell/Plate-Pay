package com.pcarchu.platepay.token.infrastructure;

import com.pcarchu.platepay.token.domain.entity.StaleToken;
import com.pcarchu.platepay.token.domain.repository.StaleTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class StaleTokenRepositoryImpl implements StaleTokenRepository {

    private final StaleTokenRepositoryJpa staleTokenRepositoryJpa;

    @Override
    public Optional<StaleToken> save(StaleToken staleToken) {
        return Optional.ofNullable(staleTokenRepositoryJpa.save(staleToken));
    }

    @Override
    public Optional<StaleToken> findByAccessToken(String accessToken) {
        return staleTokenRepositoryJpa.findByAccessToken(accessToken);
    }
}
