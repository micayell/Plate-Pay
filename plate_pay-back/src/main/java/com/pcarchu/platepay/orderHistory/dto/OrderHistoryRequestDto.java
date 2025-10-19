package com.pcarchu.platepay.orderHistory.dto;

import lombok.Builder;
import lombok.Data;

public class OrderHistoryRequestDto {

    @Builder
    @Data
    public static class AddOrderHistoryRequestDto {
        private Long storeId;
        private String plateNum;
        private Integer cost;
    }
}
