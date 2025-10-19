package com.pcarchu.platepay.orderHistory.infrastructure;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.orderHistory.domain.entity.OrderHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderHistoryRepositoryJpa extends JpaRepository<OrderHistory, Long> {
    @Query("SELECT COALESCE(SUM(o.cost), 0) FROM OrderHistory o " +
            "WHERE o.inOutHistory.inOutHistoryUid = :inOutHistoryId " +
            "AND o.isPaid = false")
    Optional<Long> sumCostByInOutHistory_InOutHistoryUidAndIsPaidFalse(Long inOutHistoryId);

    @Query("SELECT i FROM InOutHistory i " +
            "WHERE i.car.member.memberUid = :memberId " +
            "AND i.outTime IS NOT NULL " +
            "AND i.outTime >= :startDate")
    List<InOutHistory> findRecentInOutHistories(Long memberId, LocalDateTime startDate);

    @Query("SELECT i FROM InOutHistory i " +
            "WHERE i.car.member.memberUid = :memberId " +
            "AND i.outTime IS NOT NULL " +
            "AND i.outTime BETWEEN :startDate AND :endDate")
    List<InOutHistory> findMonthlyInOutHistories(Long memberId, LocalDateTime startDate, LocalDateTime endDate);

    @Query("SELECT DISTINCT i FROM InOutHistory i " +
            "LEFT JOIN FETCH i.orderHistories o " +
            "WHERE i.car.plateNum = :plateNum " +
            "AND i.outTime IS NULL " +
            "AND (o IS NULL OR o.isPaid = false)")
    Optional<InOutHistory> findActiveInOutHistoryWithUnpaidOrders(String plateNum);



}
