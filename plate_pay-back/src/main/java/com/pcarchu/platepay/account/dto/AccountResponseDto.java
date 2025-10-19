package com.pcarchu.platepay.account.dto;

import com.pcarchu.platepay.store.domain.enums.StoreType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

public class AccountResponseDto {

    @Builder
    @Getter
    @AllArgsConstructor
    public static class AccountInfo {
        private Long accountId;
        private String bankName;
        private String accountName;
        private String accountNo;
        private boolean isMain;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @Builder
    public static class StoreTypeUsage {
        private StoreType storeType;   // 매장 타입
        private Integer totalCost;        // 총 결제 금액
        private Long count;            // 거래 횟수
    }
}
