package com.yolo.bringit.pcarchubank.dto.member;

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
        private String userKey;
    }
}
