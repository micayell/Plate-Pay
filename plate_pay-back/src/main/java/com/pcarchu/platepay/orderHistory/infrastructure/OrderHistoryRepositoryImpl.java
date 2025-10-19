package com.pcarchu.platepay.orderHistory.infrastructure;

import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.orderHistory.domain.entity.OrderHistory;
import com.pcarchu.platepay.orderHistory.domain.repository.OrderHistoryRepository;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryResponseDto;

import lombok.RequiredArgsConstructor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class OrderHistoryRepositoryImpl implements OrderHistoryRepository {

    private final OrderHistoryRepositoryJpa orderHistoryRepositoryJpa;

    @Override
    public void save(OrderHistory orderHistory) { orderHistoryRepositoryJpa.save(orderHistory); }

    @Override
    public Optional<Long> sumCostByInOutHistory_InOutHistoryUidAndIsPaidFalse(Long inOutHistoryId) { return orderHistoryRepositoryJpa.sumCostByInOutHistory_InOutHistoryUidAndIsPaidFalse(inOutHistoryId); }

    @Override
    public List<InOutHistory> findRecentInOutHistories(Long memberId, LocalDateTime startDate) { return orderHistoryRepositoryJpa.findRecentInOutHistories(memberId, startDate); }

    @Override
    public List<InOutHistory> findMonthlyInOutHistories(Long memberId, LocalDateTime startDate, LocalDateTime endDate) {
        return orderHistoryRepositoryJpa.findMonthlyInOutHistories(memberId, startDate, endDate);
    }

    @Override
    public Optional<InOutHistory> findActiveInOutHistoryWithUnpaidOrders(String plateNum) {
        return orderHistoryRepositoryJpa.findActiveInOutHistoryWithUnpaidOrders(plateNum);
    }

}
