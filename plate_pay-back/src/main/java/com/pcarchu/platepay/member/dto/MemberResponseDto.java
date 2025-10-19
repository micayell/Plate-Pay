package com.pcarchu.platepay.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

public class MemberResponseDto {
    @Builder
    @Getter
    @AllArgsConstructor
    public static class MemberInfo {
        private Long memberUid;
        private String name;
        private String nickname;
        private String email;
        private String phoneNum;
        private String loginType;
        private Boolean isActive;
    }

    @Builder
    @Getter
    @AllArgsConstructor
    public static class MemberInfoWithUserKey {
        private Long memberUid;
        private String name;
        private String nickname;
        private String email;
        private String phoneNum;
        private String userKey;
    }

    @Builder
    @Getter
    @AllArgsConstructor
    public static class IsActiveInfo {
        private Boolean isActive;
    }

    @Builder
    @Getter
    @AllArgsConstructor
    public static class PWDValidationInfo {
        private Boolean result;
    }
}
