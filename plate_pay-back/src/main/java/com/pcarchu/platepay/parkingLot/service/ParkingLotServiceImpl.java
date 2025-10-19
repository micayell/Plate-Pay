package com.pcarchu.platepay.parkingLot.service;

import java.util.List;
import java.util.Optional;

import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import org.springframework.stereotype.Service;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.parkingLot.domain.repository.ParkingLotRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ParkingLotServiceImpl implements ParkingLotService{

	private final ParkingLotRepository parkingLotRepository;

	/**
	 * 특정 주차장 안에 현재 '입차 상태'인 차량들을 조회한다.
	 *
	 * 조건:
	 *  - 주차장 UID(parkingLotUid)가 일치해야 함
	 *  - 출차 시간(outTime)이 NULL → 아직 출차하지 않은 차량
	 *  - 번호판 문자열이 부분 일치해야 함 (예: "1837" 입력 시 "227루1837" 매칭)
	 *
	 * @param parkingLotUid 주차장 UID
	 * @param plateNum 번호판 검색어 (부분검색)
	 * @return 조건에 맞는 Car 리스트
	 */
	public List<Car> getActiveCars(Long parkingLotUid, String plateNum) {
		return parkingLotRepository.findActiveCarsByParkingLotAndPlateNum(parkingLotUid, plateNum);
	}

	public Optional<ParkingLot> getParkingLotById(Long id) {
		return parkingLotRepository.findById(id);
	}
}
