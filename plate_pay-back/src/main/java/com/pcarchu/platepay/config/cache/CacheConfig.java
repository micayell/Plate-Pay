package com.pcarchu.platepay.config.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.pcarchu.platepay.car.dto.CarRequestDto;
import com.pcarchu.platepay.car.dto.CarResponseDto;
import lombok.Builder;
import lombok.Getter;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Instant;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public Cache<Long, CacheConfig.PendingCarRegistration> pendingCarRegistrationCache() {
        return Caffeine.newBuilder()
                .maximumSize(10_000)           // 최대 엔트리 수
                .expireAfterWrite(260, TimeUnit.SECONDS) // TTL
                .recordStats()
                .build();
    }

    @Getter
    @Builder
    public static class PendingCarRegistration {
        private final CarRequestDto.RegisterCar registerCar;          // 1차 요청 본문
        private final CarResponseDto.FirstPhaseInfo firstPhaseInfo;   // 1차 응답 값
        private final Instant savedAt;                                 // 저장 시각(감사/디버깅용)
    }
}
