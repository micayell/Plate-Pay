package com.pcarchu.platepay.parkingLot.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLotFee;

public interface  ParkingLotFeeRepositoryJpa extends JpaRepository<ParkingLotFee, Long> {
}
