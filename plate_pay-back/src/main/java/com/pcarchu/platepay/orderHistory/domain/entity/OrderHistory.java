package com.pcarchu.platepay.orderHistory.domain.entity;

import com.pcarchu.platepay.common.domain.BaseTimeEntity;
import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.store.domain.entity.Store;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;


@Getter
@Entity
@Table(name="order_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "orderHistoryUid", callSuper=false)
public class OrderHistory extends BaseTimeEntity {

    @Id
    @Column(name = "order_history_uid")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderHistoryUid;

    @ManyToOne
    @JoinColumn(name="storeId", nullable = true)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="inOutHistoryId", nullable = false)
    private InOutHistory inOutHistory;

    @Comment("금액")
    @Column(name = "cost", nullable = false)
    private Integer cost;

    @Comment("결제여부")
    @Column(name = "is_paid", nullable = false)
    private Boolean isPaid;

    public void changeIsPaid(boolean isPaid) {
        this.isPaid = isPaid;
    }

    @Builder
    public OrderHistory(Store store, InOutHistory inOutHistory, Integer cost, Boolean isPaid) {
        this.store = store;
        this.inOutHistory = inOutHistory;
        this.cost = cost;
        this.isPaid = isPaid;
    }
}
