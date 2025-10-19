package com.pcarchu.platepay.parkingLot.service;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;

import java.util.List;
import java.util.Optional;

public interface ParkingLotService {
    List<Car> getActiveCars(Long parkingLotUid, String plateNum);
    Optional<ParkingLot> getParkingLotById(Long id);
}
