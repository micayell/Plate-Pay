package com.pcarchu.platepay.store.domain.repository;

import com.pcarchu.platepay.store.domain.entity.Store;
import com.pcarchu.platepay.store.domain.enums.StoreType;
import com.pcarchu.platepay.store.dto.StoreResponseDto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface StoreRepository {

	Optional<Store> findById(Long storeUid);

	Page<StoreResponseDto.SearchHit> search(double lat, double lon, StoreType type, String keyword, Pageable pageable);

	boolean existsByStoreNameAndAddress(String storeName, String address);

	Store save(Store store);

	int count();
}
