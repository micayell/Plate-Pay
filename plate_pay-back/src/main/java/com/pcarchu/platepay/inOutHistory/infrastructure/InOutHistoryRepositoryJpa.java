package com.pcarchu.platepay.inOutHistory.infrastructure;

import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InOutHistoryRepositoryJpa extends JpaRepository<InOutHistory, Long> {
    Optional<InOutHistory> findByCarAndOutTimeIsNull(Car car);
    Optional<InOutHistory> findFirstByCarAndParkingLotAndOutTimeIsNull(Car car, ParkingLot parkingLot);
    boolean existsByAccountAndOutTimeIsNull(Account account);
}
