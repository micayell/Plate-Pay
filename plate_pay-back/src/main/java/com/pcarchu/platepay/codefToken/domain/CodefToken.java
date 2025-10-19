package com.pcarchu.platepay.codefToken.domain;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;
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

    public CodefToken(String accessToken) {
        this.id = "global";
        this.accessToken = accessToken;
    }
}
