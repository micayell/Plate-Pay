package com.pcarchu.platepay.parkingLot.domain.entity;

import com.pcarchu.platepay.common.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="parking_lot_fee")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "parkingLotFeeUid", callSuper=false)
public class ParkingLotFee extends BaseTimeEntity {
    @Id
    @Column(name = "parking_lot_fee_uid")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long parkingLotFeeUid;

    @Comment("기본요금")
    @Column(name = "primary_fee", nullable = false)
    private int primaryFee;

    @Comment("추가요금")
    @Column(name = "addtional_fee", nullable = false)
    private int additionalFee;

    @Builder
    public ParkingLotFee(Long parkingLotFeeUid, int primaryFee, int additionalFee) {
        this.parkingLotFeeUid = parkingLotFeeUid;
        this.primaryFee = primaryFee;
        this.additionalFee = additionalFee;
    }
}
