package com.pcarchu.platepay.car.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

public class CarRequestDto {

    @Builder
    @Getter
    @Setter
    @AllArgsConstructor
    public static class RegisterCar {
        private String name;
        private String nickname;
        private String plateNum;
        private String ssn;
    }
}
