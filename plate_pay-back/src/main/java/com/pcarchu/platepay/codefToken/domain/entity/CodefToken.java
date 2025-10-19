package com.pcarchu.platepay.codefToken.domain.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@RedisHash(value="cftk", timeToLive = 60*60*24*7) // 7일 TTL
@ToString
public class CodefToken {
    @Id
    private String id;

    private String accessToken;

    @Builder
    public CodefToken(String accessToken) {
        this.id = "global";
        this.accessToken = accessToken;
    }
}
