package com.pcarchu.platepay.store.infrastructure;

import com.pcarchu.platepay.store.domain.entity.Store;

import org.springframework.data.jpa.repository.JpaRepository;


public interface StoreRepositoryJpa extends JpaRepository<Store, Long> {
	boolean existsByStoreNameAndAddress(String storeName, String address);
}
