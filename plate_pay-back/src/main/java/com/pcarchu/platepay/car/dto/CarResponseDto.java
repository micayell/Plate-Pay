package com.pcarchu.platepay.car.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class CarResponseDto {

	@Builder
	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class CarInfo {
		private Long carUid;
		private String nickName;
		private String plateNum;
		private String carModel;
		private String imgUrl;
	}

	@Builder
	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class FirstPhaseInfo {
		private String code;
		private Integer jobIndex;
		private Integer threadIndex;
		private String jti;
		private Long twoWayTimestamp;
	}
}
