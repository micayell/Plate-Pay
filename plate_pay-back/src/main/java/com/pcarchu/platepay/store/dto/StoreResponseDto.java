package com.pcarchu.platepay.store.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import com.pcarchu.platepay.store.domain.enums.StoreType;
import lombok.*;


public class StoreResponseDto {

	@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
	public static class StoreInfo {
		private Long storeUid;
		private String storeName;
		private String longitude;
		private String latitude;
		private String address;
		private String roadAddress;
		private String storePhoneNum;
		private StoreType storeType;
		private String storeUrl;
		private String openTime;
		private String closeTime;
		private ParkingLot parkingLot;
	}

	// ES 근접검색 결과(거리 포함)
	@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
	public static class SearchHit {
		private Long storeUid;
		private String storeName;
		private StoreType storeType;
		private String storeTypeDesc;
		private String address;
		private String roadAddress;
		private String storePhoneNum;
		private String storeUrl;
		private double latitude;
		private double longitude;
		private Double distanceKm;
		private String openTime;
		private String closeTime;

		@JsonProperty("parking_lot_uid")
		private Long parkingId;

		@JsonProperty("parking_lot_name")
		private String parkingName;
	}
}
