package com.pcarchu.platepay.inOutHistory.infrastructure;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.car.domain.entity.QCar;
import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.inOutHistory.domain.entity.QInOutHistory;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class InOutHistoryRepositoryQueryDsl {

	private final JPAQueryFactory queryFactory;

	/**
	 * 특정 주차장(parkingLotUid)에 현재 '입차 상태'인 차량들(InOutHistory)을 조회한다.
	 *
	 * 조건:
	 *  - 해당 주차장의 UID(parkingLotUid)와 일치하는 주차장에 속한 차량
	 *  - 아직 출차하지 않은 차량 (outTime이 NULL)
	 *  - 차량 번호판이 부분적으로 일치하는 경우 (예: "1837" → "227루1837"도 매칭)
	 *
	 * @param parkingLotUid 조회할 주차장 UID
	 * @param plateNum 검색할 차량 번호판 문자열 (부분검색 지원)
	 * @return 조건에 해당하는 InOutHistory 목록 (Car 엔티티도 fetch join)
	 */
	public List<Car> findActiveCarsByParkingLotAndPlateNum(Long parkingLotUid, String plateNum) {
		QInOutHistory inOutHistory = QInOutHistory.inOutHistory;
		QCar car = QCar.car;

		return queryFactory
			.select(car) // ✅ Car만 select
			.from(inOutHistory)
			.join(inOutHistory.car, car).fetchJoin()
			.where(
				inOutHistory.parkingLot.parkingLotUid.eq(parkingLotUid),
				inOutHistory.outTime.isNull(),
				car.plateNum.contains(plateNum)
			)
			.fetch();
	}

}
