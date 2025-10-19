package com.pcarchu.platepay.codefToken.infrastructure;

import com.pcarchu.platepay.codefToken.domain.entity.CodefToken;
import org.springframework.data.repository.CrudRepository;

public interface CodefTokenRepositoryJpa extends CrudRepository<CodefToken, String> {
}
