package com.pcarchu.platepay.store.dto;

import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import com.pcarchu.platepay.store.domain.enums.StoreType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

public class StoreRequestDto {

	@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
	public static class Create {
		@NotBlank private String storeName;
		@NotNull private Double longitude;
		@NotNull private Double latitude;
		@NotBlank private String address;
		@NotBlank private String roadAddress;
		private String storePhoneNum;
		private StoreType storeType;
		private String storeUrl;
		private String openTime;
		private String closeTime;
		private ParkingLot parkingLot;
	}

	@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
	public static class Update {
		@NotBlank private String storeName;
		@NotNull private Double longitude;
		@NotNull private Double latitude;
		@NotBlank private String address;
		@NotBlank private String roadAddress;
		private String storePhoneNum;
		private StoreType storeType;
		private String storeUrl;
		private String openTime;
		private String closeTime;
		private ParkingLot parkingLot;
	}
}
