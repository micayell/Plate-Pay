package com.pcarchu.platepay.parkingLot.infrastructure;

import org.springframework.stereotype.Repository;

import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLotFee;
import com.pcarchu.platepay.parkingLot.domain.repository.ParkingLotFeeRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ParkingLotFeeRepositoryImpl implements ParkingLotFeeRepository {

	private final ParkingLotFeeRepositoryJpa parkingLotFeeRepositoryJpa;

	@Override
	public ParkingLotFee save(ParkingLotFee parkingLotFee) {
		return parkingLotFeeRepositoryJpa.save(parkingLotFee);
	}
}
