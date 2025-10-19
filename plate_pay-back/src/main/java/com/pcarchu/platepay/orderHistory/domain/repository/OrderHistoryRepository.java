package com.pcarchu.platepay.orderHistory.domain.repository;


import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.orderHistory.domain.entity.OrderHistory;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryResponseDto;

import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderHistoryRepository {

    void save(OrderHistory orderHistory);
    Optional<Long> sumCostByInOutHistory_InOutHistoryUidAndIsPaidFalse(Long inOutHistoryId);
    List<InOutHistory> findRecentInOutHistories(Long memberId, LocalDateTime startDate);
    List<InOutHistory> findMonthlyInOutHistories(Long memberId, LocalDateTime startDate, LocalDateTime endDate);
    Optional<InOutHistory> findActiveInOutHistoryWithUnpaidOrders(String plateNum);
}
