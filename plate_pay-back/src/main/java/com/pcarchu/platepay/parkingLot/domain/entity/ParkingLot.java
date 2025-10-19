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
@Table(name="parking_lot")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "parkingLotUid", callSuper=false)
public class ParkingLot extends BaseTimeEntity {

    @Id
    @Column(name = "parking_lot_uid")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long parkingLotUid;

    @Comment("주차장이름")
    @Column(name = "parking_lot_name", length = 50, nullable = false)
    private String parkingLotName;

    @Comment("위도")
    @Column(name = "latitude", nullable = false)
    private String latitude;

    @Comment("경도")
    @Column(name = "longitude", nullable = false)
    private String longitude;

    @Comment("일반주소")
    @Column(name = "address", length = 50, nullable = false)
    private String address;

    @Comment("도로명주소")
    @Column(name = "road_address", length = 50, nullable = true)
    private String roadAddress;

    @OneToOne
    @JoinColumn(name="parkingLotFeeId", nullable = false)
    private ParkingLotFee parkingLotFee;

    @Builder
    public ParkingLot(Long parkingLotUid, String parkingLotName, String latitude, String longitude, String address,
        String roadAddress, ParkingLotFee parkingLotFee) {
        this.parkingLotUid = parkingLotUid;
        this.parkingLotName = parkingLotName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.roadAddress = roadAddress;
        this.parkingLotFee = parkingLotFee;
    }
}
