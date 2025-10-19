package com.pcarchu.kiosk.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class KioskRequestDto {
    @Builder
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class orderMenuRequest {
        private String password;
        private Integer cost;
        private Long storeId;
    }

    @Builder
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class orderMenuRequestWithFace {
        private Integer cost;
        private Long storeId;
    }

    @Builder
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidateFace {
        private String plateNum;
        private Long storeId;
    }

}
