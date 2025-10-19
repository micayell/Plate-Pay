package com.pcarchu.platepay.orderHistory.controller;

import com.pcarchu.platepay.account.dto.AccountResponseDto;
import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.orderHistory.domain.entity.OrderHistory;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryRequestDto;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryResponseDto;
import com.pcarchu.platepay.orderHistory.service.OrderHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "api/v1/order-histories")
public class OrderHistoryController {
    private final OrderHistoryService orderHistoryService;
    private final ResponseDto responseDto;

    @Operation(summary = "주문 생성", description = "새로운 주문을 생성합니다.")
    @PostMapping
    public ResponseEntity<?> addOrderHistory(@RequestBody OrderHistoryRequestDto.AddOrderHistoryRequestDto requestDto) {
        try {
            orderHistoryService.addOrderHistory(requestDto);
            return responseDto.success("주문 성공");
        } catch (Exception e) {
            log.debug("getAccounts error occurred!");
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "최근 결제 내역 조회", description = "최근 일주일 결제 내역을 조회합니다.")
    @GetMapping("/last-week")
    public ResponseEntity<?> getRecentPaymentHistories(@AuthenticationPrincipal Member loginMember) {
        List<OrderHistoryResponseDto.PaymentHistoryInfo> histories = orderHistoryService.getRecentPaymentHistories(loginMember);
        return ResponseEntity.ok(histories);
    }

    @Operation(summary = "월별 내역 조회", description = "월 별 결제 내역을 조회합니다.")
    @GetMapping
    public ResponseEntity<?> getMonthlyPaymentHistories(@AuthenticationPrincipal Member loginMember,
                                                        @RequestParam int year,
                                                        @RequestParam int month) {
        var result = orderHistoryService.getMonthlyPaymentHistories(loginMember, year, month);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "결제 예정 내역 조회", description = "결제 예정 내역을 조회합니다.")
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingOrderHistories(@AuthenticationPrincipal Member loginMember) {
        var result = orderHistoryService.getActiveUnpaidHistory(loginMember);
        return ResponseEntity.ok(result);
    }
}
