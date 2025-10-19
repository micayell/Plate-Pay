package com.pcarchu.platepay.common.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // 도메인/비즈니스
    MEMBER_CAR_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "C001", "등록 가능한 차량 수(3대)를 초과했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
