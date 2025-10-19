package com.pcarchu.platepay.store.domain.entity;

import com.pcarchu.platepay.common.domain.BaseTimeEntity;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import com.pcarchu.platepay.store.domain.enums.StoreType;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="store")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "storeUid", callSuper=false)
public class Store extends BaseTimeEntity {

	@Id
	@Column(name = "store_uid")
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long storeUid;

	@Comment("매장명")
	@Column(name = "store_name", nullable = false)
	private String storeName;

	@Comment("경도")
	@Column(name = "longitude", nullable = false)
	private String longitude;

	@Comment("위도")
	@Column(name = "latitude", nullable = false)
	private String latitude;

	@Comment("일반주소")
	@Column(name = "address", nullable = false)
	private String address;

	@Comment("도로명주소")
	@Column(name = "road_address", nullable = false)
	private String roadAddress;

	@Comment("매장 전화번호")
	@Column(name = "store_phone_num", length = 20)
	private String storePhoneNum;

	@Comment("매장 타입")
	@Enumerated(value = EnumType.STRING)
	@Column(name = "store_type")
	private StoreType storeType;

	@Comment("대표 사진 URL")
	@Column(name = "store_url")
	private String storeUrl;

	@Comment("개점 시간")
	@Column(name = "open_time")
	private String openTime;

	@Comment("폐점 시간")
	@Column(name = "close_time")
	private String closeTime;


	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "parkingLotId", nullable = false)
	private ParkingLot parkingLot;

	@Builder
	public Store(Long storeUid, String storeName,String longitude, String latitude, String address, String roadAddress,
		String storePhoneNum,
		StoreType storeType, String storeUrl, String openTime, String closeTime, ParkingLot parkingLot) {
		this.storeUid = storeUid;
		this.storeName = storeName;
		this.longitude = longitude;
		this.latitude = latitude;
		this.address = address;
		this.roadAddress = roadAddress;
		this.storePhoneNum = storePhoneNum;
		this.storeType = storeType;
		this.storeUrl = storeUrl;
		this.openTime = openTime;
		this.closeTime = closeTime;
		this.parkingLot = parkingLot;
	}

}
