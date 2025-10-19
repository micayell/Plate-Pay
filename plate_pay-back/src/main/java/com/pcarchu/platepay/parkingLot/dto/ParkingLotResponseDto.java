package com.pcarchu.platepay.parkingLot.dto;

import lombok.*;

public class ParkingLotResponseDto {

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class SearchHit {
		private Long parkingLotUid;
		private String parkingLotName;
		private String address;
		private String roadAddress;
		private Double latitude;
		private Double longitude;
		private Double distanceKm;
		private Integer primaryFee;
		private Integer additionalFee;
	}
}
