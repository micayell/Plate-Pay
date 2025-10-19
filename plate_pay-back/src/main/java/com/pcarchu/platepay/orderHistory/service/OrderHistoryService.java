package com.pcarchu.platepay.orderHistory.service;

import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryRequestDto;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryResponseDto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface OrderHistoryService {
    void addOrderHistory(OrderHistoryRequestDto.AddOrderHistoryRequestDto requestDto);
    List<OrderHistoryResponseDto.PaymentHistoryInfo> getRecentPaymentHistories(Member loginMember);
    Map<LocalDate, List<OrderHistoryResponseDto.PaymentHistoryInfo>> getMonthlyPaymentHistories(Member loginMember, int year, int month);
    OrderHistoryResponseDto.PaymentHistoryInfo getActiveUnpaidHistory(Member member);
}
