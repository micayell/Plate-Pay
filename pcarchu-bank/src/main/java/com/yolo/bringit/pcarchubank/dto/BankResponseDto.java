package com.yolo.bringit.pcarchubank.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

public class BankResponseDto {

    @Builder
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class createAccountResponse {
        private String accountNo;
    }

    @Builder
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class getAccountSResponse {
        private String bankName;
        private String accountNo;
        private String accountBalance;
    }

    @Builder
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class getHistoriesResponse {
        private String transactionDate;
        private String transactionTime;
        private String transactionBalance;
        private String transactionAfterBalance;
        private String transactionSummary;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlatepayResponse<T> {
        private int state;
        private String result;
        private String message;
        private T data;
        private List<String> error;
    }

}
