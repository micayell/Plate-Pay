package com.pcarchu.platepay.store.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StoreType {

	MART("MT1", "대형마트"),
	CONVENIENCE_STORE("CS2", "편의점"),
	RESTAURANT("FD6", "음식점"),
	CAFE("CE7", "카페"),
	HOSPITAL("HP8", "병원"),
	PHARMACY("PM9", "약국");

	private final String kakaoCode;     // 카카오 category_group_code
	private final String description;   // 한글 설명

	/** Kakao code → StoreType 변환 */
	public static StoreType fromKakaoCode(String code) {
		for (StoreType type : values()) {
			if (type.kakaoCode.equals(code)) {
				return type;
			}
		}
		return null;
	}
}
