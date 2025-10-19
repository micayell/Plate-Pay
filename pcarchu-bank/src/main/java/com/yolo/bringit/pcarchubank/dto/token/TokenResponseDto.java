package com.yolo.bringit.pcarchubank.dto.token;

import com.yolo.bringit.pcarchubank.dto.member.MemberResponseDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

public class TokenResponseDto {

    @Builder
    @Getter
    @AllArgsConstructor
    public static class TokenInfo {
        private String accessToken;
        private String refreshToken;
        private Long accessTokenExpirationTime;
        private Long refreshTokenExpirationTime;
        private MemberResponseDto.MemberInfo memberInfo;
        private Integer statusCode;

        public void setStatusCode(Integer statusCode) {
            this.statusCode = statusCode;
        }

        public void setMemberInfo(MemberResponseDto.MemberInfo memberInfo) {
            this.memberInfo = memberInfo;
        }
    }
}
