package com.pcarchu.platepay.codefToken.service;

import com.pcarchu.platepay.codefToken.domain.entity.CodefToken;
import com.pcarchu.platepay.codefToken.domain.repository.CodefTokenRepository;
import com.pcarchu.platepay.util.CodefUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CodefTokenServiceImpl implements CodefTokenService {
    @Value("${codef.api.client-id}")
    private String clientId;
    @Value("${codef.api.client-secret}")
    private String clientSecret;

    private final CodefUtil codefUtil;
    private final CodefTokenRepository codefTokenRepository;

    @Override
    @Transactional
    public Optional<CodefToken> create() {
        // access token을 codef API를 이용해 호출
        Map<String, Object> res = codefUtil.publishToken(clientId, clientSecret);
        String token = (String) res.get("access_token");

        CodefToken codefToken = CodefToken.builder()
                .accessToken(token)
                .build();

        return codefTokenRepository.save(codefToken);
    }

    @Override
    @Transactional
    public Optional<CodefToken> getToken() {
        return codefTokenRepository.findById("global");
    }
}
