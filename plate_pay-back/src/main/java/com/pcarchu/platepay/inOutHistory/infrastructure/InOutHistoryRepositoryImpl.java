package com.pcarchu.platepay.inOutHistory.infrastructure;

import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.inOutHistory.domain.repository.InOutHistoryRepository;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class InOutHistoryRepositoryImpl implements InOutHistoryRepository {
    private final InOutHistoryRepositoryJpa inOutHistoryRepositoryJpa;
    private final InOutHistoryRepositoryQueryDsl inOutHistoryRepositoryQueryDsl;

    @Override
    public Optional<InOutHistory> save(InOutHistory inOutHistory) {
        return Optional.ofNullable(inOutHistoryRepositoryJpa.save(inOutHistory));
    }

    @Override
    public Optional<InOutHistory> findByCarAndOutTimeIsNull(Car car) {
        return inOutHistoryRepositoryJpa.findByCarAndOutTimeIsNull(car);
    }

    @Override
    public Optional<InOutHistory> findFirstByCarAndParkingLotAndOutTimeIsNull(Car car, ParkingLot parkingLot) {
        return inOutHistoryRepositoryJpa.findFirstByCarAndParkingLotAndOutTimeIsNull(car, parkingLot);
    }

    public List<Car> findActiveCarsByParkingLotAndPlateNum(Long parkingLotUid, String plateNum){
        return inOutHistoryRepositoryQueryDsl.findActiveCarsByParkingLotAndPlateNum(parkingLotUid, plateNum);
    }

    public boolean existsByAccountAndOutTimeIsNull(Account account) {
        return inOutHistoryRepositoryJpa.existsByAccountAndOutTimeIsNull(account);
    }
}
