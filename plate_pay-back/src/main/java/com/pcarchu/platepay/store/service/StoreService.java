package com.pcarchu.platepay.store.service;

import com.pcarchu.platepay.parkingLot.dto.ParkingLotResponseDto;
import com.pcarchu.platepay.parkingLot.infrastructure.ParkingLotRepositoryEs;
import com.pcarchu.platepay.store.domain.entity.Store;
import com.pcarchu.platepay.store.domain.enums.StoreType;
import com.pcarchu.platepay.store.domain.repository.StoreRepository;

import com.pcarchu.platepay.store.dto.StoreResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreService {

	private final StoreRepository storeRepository;
	private final ParkingLotRepositoryEs parkingLotRepositoryEs;


	/**
	 * 단일 매장 조회 (DB 기반)
	 */
	public StoreResponseDto.StoreInfo getById(Long storeUid) {
		Store s = storeRepository.findById(storeUid)
			.orElseThrow(() -> new IllegalArgumentException("존재하지 않는 매장입니다. uid=" + storeUid));
		return toInfo(s);
	}

	/**
	 * 근접 매장 검색 (ES 기반, 거리순 + 페이징 + 필터링)
	 */
	/**
	 * 근접 매장 + 주차장 검색 (ES 기반)
	 */
	public StoreSearchResults searchStores(
		double lat,
		double lon,
		StoreType type,
		String keyword,
		Pageable pageable
	) {
		Page<StoreResponseDto.SearchHit> stores = storeRepository.search(lat, lon, type, keyword, pageable);


		return new StoreSearchResults(stores);
	}

	public ParkingLotSearchResults searchParkingLots(
		double lat,
		double lon,
		String keyword,
		Pageable pageable
	) {
		Page<ParkingLotResponseDto.SearchHit> parkingLots = parkingLotRepositoryEs.search(lat, lon, keyword, pageable);

		return new ParkingLotSearchResults(parkingLots);
	}

	// === DTO 변환 ===
	private StoreResponseDto.StoreInfo toInfo(Store s) {
		return StoreResponseDto.StoreInfo.builder()
			.storeUid(s.getStoreUid())
			.storeName(s.getStoreName())
			.longitude(s.getLongitude())
			.latitude(s.getLatitude())
			.address(s.getAddress())
			.roadAddress(s.getRoadAddress())
			.storePhoneNum(s.getStorePhoneNum())
			.storeType(s.getStoreType())
			.storeUrl(s.getStoreUrl())
			.build();
	}

	/**
	 * 매장 + 주차장 통합 검색 응답 DTO
	 */
	public record StoreSearchResults(
		Page<StoreResponseDto.SearchHit> stores
	) {}

	public record ParkingLotSearchResults(
		Page<ParkingLotResponseDto.SearchHit> parkingLots
	) {}


}
