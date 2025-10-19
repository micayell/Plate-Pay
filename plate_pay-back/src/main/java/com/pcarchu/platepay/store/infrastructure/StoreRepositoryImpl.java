package com.pcarchu.platepay.store.infrastructure;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import com.pcarchu.platepay.store.domain.entity.Store;
import com.pcarchu.platepay.store.domain.enums.StoreType;
import com.pcarchu.platepay.store.domain.repository.StoreRepository;
import com.pcarchu.platepay.store.dto.StoreResponseDto;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class StoreRepositoryImpl implements StoreRepository {

	private final StoreRepositoryJpa storeRepositoryJpa;
	private final StoreRepositoryEs storeRepositoryEs;

	@Override
	public Optional<Store> findById(Long storeUid) {
		return  storeRepositoryJpa.findById(storeUid);
	}

	@Override
	public Page<StoreResponseDto.SearchHit> search(double lat, double lon, StoreType type,
		String keyword, Pageable pageable) {
		return storeRepositoryEs.search(lat, lon, type, keyword, pageable);
	}

	@Override
	public boolean existsByStoreNameAndAddress(String storeName, String address) {
		return storeRepositoryJpa.existsByStoreNameAndAddress(storeName,address);
	}

	@Override
	public Store save(Store store) {
		return storeRepositoryJpa.save(store);
	}

	@Override
	public int count() {
		return (int)(storeRepositoryJpa.count());
	}

}
