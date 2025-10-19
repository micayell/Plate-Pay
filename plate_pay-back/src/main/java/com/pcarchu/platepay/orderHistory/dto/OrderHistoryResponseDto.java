package com.pcarchu.platepay.orderHistory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

import com.pcarchu.platepay.store.domain.enums.StoreType;

public class OrderHistoryResponseDto {

    @Getter
    @Builder
    public static class PaymentHistoryInfo {
        private Long inOutHistoryId;
        private Long parkingLotUid;
        private String parkingLotName;
        private String address;
        private String plateNum;
        private String bankName;
        private String accountNo;
        private LocalDateTime outTime;
        private List<OrderHistoryInfo> orders;
        private Integer totalCost;
        private String carModel;
    }


    @Getter
    @Builder
    public static class OrderHistoryInfo {
        private Long orderHistoryId;
        private String storeName;
        private Integer cost;
        private Boolean isPaid;
    }
}
