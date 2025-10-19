package com.pcarchu.platepay.inOutHistory.domain.repository;

import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;

import java.util.List;
import java.util.Optional;

public interface InOutHistoryRepository {
    Optional<InOutHistory> findByCarAndOutTimeIsNull(Car car);
    Optional<InOutHistory> save(InOutHistory inOutHistory);
    Optional<InOutHistory> findFirstByCarAndParkingLotAndOutTimeIsNull(Car car, ParkingLot parkingLot);
    boolean existsByAccountAndOutTimeIsNull(Account account);
}
