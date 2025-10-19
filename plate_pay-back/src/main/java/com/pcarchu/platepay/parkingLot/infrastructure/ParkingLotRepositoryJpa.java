package com.pcarchu.platepay.parkingLot.infrastructure;

import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingLotRepositoryJpa extends JpaRepository<ParkingLot, Long> {
	boolean existsByParkingLotNameAndAddress(String parkingLotName, String address);
}
