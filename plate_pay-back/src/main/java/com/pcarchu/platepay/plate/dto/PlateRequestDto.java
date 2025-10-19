package com.pcarchu.platepay.plate.dto;

import com.drew.lang.annotations.NotNull;
import com.pcarchu.platepay.plate.enums.GateEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

public class PlateRequestDto {

    @Builder
    @Getter
    @Setter
    @AllArgsConstructor
    public static class ScanPlate {
        @NotNull
        private GateEventType eventType;

        @NotNull
        private Long parkingLotId;
    }
}
