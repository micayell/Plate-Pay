package com.pcarchu.platepay.codefToken.infrastructure;

import com.pcarchu.platepay.codefToken.domain.entity.CodefToken;
import com.pcarchu.platepay.codefToken.domain.repository.CodefTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class CodefTokenRepositoryImpl implements CodefTokenRepository {

    private final CodefTokenRepositoryJpa codefTokenRepositoryJpa;

    public Optional<CodefToken> save(CodefToken token) {
        return Optional.ofNullable(codefTokenRepositoryJpa.save(token));
    }

    public Optional<CodefToken> findById(String id) {
        return codefTokenRepositoryJpa.findById(id);
    }
}
