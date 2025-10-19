package com.pcarchu.platepay.parkingLot.domain.repository;

import java.util.List;
import java.util.Optional;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;

public interface ParkingLotRepository {

	List<Car> findActiveCarsByParkingLotAndPlateNum(Long parkingLotUid, String plateNum);

    Optional<ParkingLot> findById(Long id);

	ParkingLot save(ParkingLot parkingLot);

	boolean existsByParkingLotNameAndAddress(String parkingLotName, String address);

	List<ParkingLot> findAll();

	int count();
}
