package com.pcarchu.platepay.store.controller;

import java.util.HashMap;
import java.util.Map;

import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.store.domain.enums.StoreType;
import com.pcarchu.platepay.store.dto.StoreResponseDto;
import com.pcarchu.platepay.store.service.StoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/stores")
public class StoreController {

	private final StoreService storeService;
	private final ResponseDto responseDto;

	@Operation(summary = "매장 상세 조회", description = "storeId(UID)로 단일 매장을 조회합니다.")
	public ResponseEntity<?> getStoreById(
		@Parameter(description = "매장 UID", example = "1")
		@PathVariable("storeId") Long storeUid
	) {
		try {
			StoreResponseDto.StoreInfo store = storeService.getById(storeUid);
			return responseDto.success(store);
		} catch (IllegalArgumentException e) {
			return responseDto.fail(e.getMessage(), HttpStatus.NOT_FOUND);
		} catch (Exception e) {
			log.error("매장 상세 조회 중 오류", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@Operation(summary = "매장 검색", description = "위도/경도, 매장유형, 키워드로 매장을 검색합니다.")
	@GetMapping("/search/stores")
	public ResponseEntity<?> searchStores(
		@Parameter(description = "사용자 현재 위도", example = "35.1796")
		@RequestParam double lat,

		@Parameter(description = "사용자 현재 경도", example = "129.0756")
		@RequestParam double lon,

		@Parameter(description = "매장 유형", schema = @Schema(implementation = StoreType.class))
		@RequestParam(required = false) StoreType type,

		@Parameter(description = "검색 키워드", example = "삼겹살")
		@RequestParam(required = false) String keyword,

		@Parameter(description = "페이지네이션 (size, page, sort 지원)", hidden = true)
		Pageable pageable
	) {
		try {
			StoreService.StoreSearchResults result =
				storeService.searchStores(lat, lon, type, keyword, pageable);

			Map<String, Object> response = new HashMap<>();
			response.put("stores", result.stores());

			return responseDto.success(response);
		} catch (Exception e) {
			log.error("근접 매장 검색 오류", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@Operation(summary = "주차장 검색", description = "위도/경도, 매장유형, 키워드로 주차장을 검색합니다.")
	@GetMapping("/search/parkingLots")
	public ResponseEntity<?> searchParkingLots(
		@Parameter(description = "사용자 현재 위도", example = "35.1796")
		@RequestParam double lat,

		@Parameter(description = "사용자 현재 경도", example = "129.0756")
		@RequestParam double lon,


		@Parameter(description = "검색 키워드", example = "삼겹살")
		@RequestParam(required = false) String keyword,

		@Parameter(description = "페이지네이션 (size, page, sort 지원)", hidden = true)
		Pageable pageable
	) {
		try {
			StoreService.ParkingLotSearchResults result =
				storeService.searchParkingLots(lat, lon, keyword, pageable);

			Map<String, Object> response = new HashMap<>();
			response.put("parkingLots", result.parkingLots());

			return responseDto.success(response);
		} catch (Exception e) {
			log.error("근접 주차장 검색 오류", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
}
