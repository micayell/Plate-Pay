package com.pcarchu.platepay.inOutHistory.domain.entity;

import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.common.domain.BaseTimeEntity;
import com.pcarchu.platepay.orderHistory.domain.entity.OrderHistory;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(name="inout_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "inOutHistoryUid", callSuper=false)
public class InOutHistory extends BaseTimeEntity {

    @Id
    @Column(name = "inout_history_uid")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long inOutHistoryUid;

    @ManyToOne
    @JoinColumn(name="parkingLotId", nullable = false)
    private ParkingLot parkingLot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="carId", nullable = false)
    private Car car;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="accountId", nullable = false)
    private Account account;

    @Comment("입차시간")
    @Column(name = "in_time", length = 50, nullable = false)
    private LocalDateTime inTime;

    @Comment("출차시간")
    @Column(name = "out_time", length = 50, nullable = true)
    private LocalDateTime outTime;

    @OneToMany(mappedBy = "inOutHistory", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderHistory> orderHistories = new ArrayList<>();

    public void changeOutTime(LocalDateTime outTime) {
        this.outTime = outTime;
    }

    @Builder
    public InOutHistory(ParkingLot parkingLot, Car car, Account account, LocalDateTime inTime, LocalDateTime outTime) {
        this.parkingLot = parkingLot;
        this.car = car;
        this.account = account;
        this.inTime = inTime;
        this.outTime = outTime;
    }
}
