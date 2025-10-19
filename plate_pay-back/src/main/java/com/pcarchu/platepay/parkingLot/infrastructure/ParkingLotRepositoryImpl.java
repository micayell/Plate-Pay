package com.pcarchu.platepay.parkingLot.infrastructure;

import java.util.List;
import java.util.Optional;

import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import org.springframework.stereotype.Repository;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.parkingLot.domain.repository.ParkingLotRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ParkingLotRepositoryImpl implements ParkingLotRepository {

	private final ParkingLotRepositoryQueryDsl parkingLotRepositoryQueryDsl;
	private final ParkingLotRepositoryJpa parkingLotRepositoryJpa;

	@Override
	public List<Car> findActiveCarsByParkingLotAndPlateNum(Long parkingLotUid, String plateNum) {
		return parkingLotRepositoryQueryDsl.findActiveCarsByParkingLotAndPlateNum(parkingLotUid, plateNum);
	}

	@Override
	public Optional<ParkingLot> findById(Long id) {
		return parkingLotRepositoryJpa.findById(id);
	}

	@Override
	public ParkingLot save(ParkingLot parkingLot) {
		return parkingLotRepositoryJpa.save(parkingLot);
	}

	@Override
	public boolean existsByParkingLotNameAndAddress(String parkingLotName, String address) {
		return parkingLotRepositoryJpa.existsByParkingLotNameAndAddress(parkingLotName, address);
	}

	@Override
	public List<ParkingLot> findAll() {
		return parkingLotRepositoryJpa.findAll();
	}

	@Override
	public int count() {
		return (int)parkingLotRepositoryJpa.count();
	}
}
