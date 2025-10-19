package com.pcarchu.platepay.token.domain.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.index.Indexed;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@RedisHash(value="rtk", timeToLive = 60*60*24*7)
@ToString
public class RefreshToken {
    @Id
    private String email;

    @Indexed
    private String accessToken;
    @Indexed
    private String refreshToken;

    private String loginType;
    private String fcmToken;

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public void setFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
    }

    @Builder
    public RefreshToken(String email, String accessToken, String refreshToken, String loginType, String fcmToken) {
        this.email = email;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.loginType = loginType;
        this.fcmToken = fcmToken;
    }
}
