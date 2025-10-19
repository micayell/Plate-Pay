package com.pcarchu.platepay.parkingLot.controller;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.car.dto.CarResponseDto;
import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.parkingLot.service.ParkingLotServiceImpl;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/parking")
public class ParkingLotController {

	private final ParkingLotServiceImpl parkingLotService;
	private final ResponseDto responseDto;

	/**
	 * 특정 주차장 안의 입차중인 차량을 번호판으로 검색한다
	 *
	 * @param parkingLotId 주차장 UID
	 * @param plateNum 번호판 숫자(예: "1837")
	 * @return CarResponseDto.CarInfo 리스트
	 */
	@Operation(summary = "주차장 내 차량 조회", description = "특정 주차장 안에 현재 입차 상태인 차량들을 번호판으로 검색합니다.")
	@GetMapping("/{parkingLotId}/{plateNum}")
	public ResponseEntity<?> getActiveCarsByParkingLot(
			@PathVariable Long parkingLotId,
			@PathVariable String plateNum
	) {
		try {
			log.info("[getActiveCarsByParkingLot]= {}, {}", parkingLotId, plateNum);
			List<Car> cars = parkingLotService.getActiveCars(parkingLotId, plateNum);

			// Car → DTO 변환
			List<CarResponseDto.CarInfo> result = cars.stream()
					.map(car -> CarResponseDto.CarInfo.builder()
							.carUid(car.getCarUid())
							.nickName(car.getNickName())
							.plateNum(car.getPlateNum())
							.carModel(car.getCarModel())
							.imgUrl(car.getPlatePayFile().getPath())
							.build())
					.collect(Collectors.toList());

			return responseDto.success(result);
		} catch (Exception e) {
			log.error("주차장 차량 조회 실패", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
}
