package com.pcarchu.platepay.account.dto;

import lombok.Builder;
import lombok.Data;
import lombok.Getter;

public class AccountRequestDto {

    @Builder
    @Getter
    public static class AccountNameRequestDto {
        private String newName;
    }

    @Builder
    @Getter
    @Data
    public static class AccountRegisterRequest {
        private String accountNo;
    }

    @Builder
    @Data
    public static class AccountVerifyRequest {
        private String accountNo;
        private String authCode;
        private String accountName;
    }
}
