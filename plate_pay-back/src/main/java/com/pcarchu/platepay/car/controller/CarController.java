package com.pcarchu.platepay.car.controller;

import java.util.List;
import java.util.Map;

import com.pcarchu.platepay.car.dto.CarRequestDto;
import com.pcarchu.platepay.car.dto.CarResponseDto;
import com.pcarchu.platepay.car.service.CarService;
import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.common.error.BusinessException;
import com.pcarchu.platepay.member.domain.entity.Member;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/cars")
public class CarController {

	private final CarService carService;
	private final ResponseDto responseDto;

	@Operation(summary = "차량 등록 1차 검증", description = "사용자 차량 등록 1차 검증 과정을 수행합니다.")
	@PostMapping("/car-registration-a/issuance/initial")
	public ResponseEntity<?> registerCarFirstPhase(@RequestBody CarRequestDto.RegisterCar registerCar,
												   @AuthenticationPrincipal Member member) {
		try {
			CarResponseDto.FirstPhaseInfo firstPhaseInfo = carService.registerCarFirstPhase(registerCar, member);

			if (firstPhaseInfo == null) {
				return responseDto.fail("외부 API 호출 오류", HttpStatus.BAD_GATEWAY);
			}

			return responseDto.success(firstPhaseInfo);
		} catch (BusinessException e) {
			// 커스텀 예외 처리
			log.warn("비즈니스 예외 발생: code={}, msg={}", e.getErrorCode().getCode(), e.getMessage());
			return responseDto.fail(
					e.getErrorCode().getMessage(),
					e.getErrorCode().getStatus()
			);

		} catch (Exception e) {
			log.error("차량 검증을 수행할 수 없습니다.", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@Operation(summary = "차량 등록 2차 검증", description = "사용자 차량 등록 2차 검증 과정을 수행합니다.")
	@PostMapping("/car-registration-a/issuance/secondary")
	public ResponseEntity<?> registerCarSecondPhase(@AuthenticationPrincipal Member member) {
		try {
			Map<String, String> resMap = carService.registerCarSecondPhase(member);

			if (resMap.get("code").equals("CF-00000")) {
				return responseDto.success();
			} else {
				return responseDto.fail("bad gateway", HttpStatus.BAD_GATEWAY);
			}
		} catch (Exception e) {
			log.error("차량 검증을 수행할 수 없습니다.", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@Operation(summary = "소유 차량 조회", description = "사용자가 소유한 모든 차량을 조회합니다.")
	@GetMapping
	public ResponseEntity<?> getAllCarsByUser(
			@AuthenticationPrincipal Member member
	) {
		try {
			if (member.getMemberUid() == null) {
				return responseDto.fail("권한이 없습니다.", HttpStatus.UNAUTHORIZED);
			}
			List<CarResponseDto.CarInfo> cars = carService.getAllCarsByMemberId(member.getMemberUid());

			return responseDto.success(cars);
		} catch (Exception e) {
			log.error("소유 차량을 조회할 수 없습니다.", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@Operation(summary = "특정 차량 조회", description = "사용자가 소유한 차량 중 특정 차량을 조회합니다.")
	@GetMapping("/{carId}")
	public ResponseEntity<?> getCarById(
			@AuthenticationPrincipal Member member,
			@PathVariable Long carId
	) {
		try {
			if (member.getMemberUid() == null) {
				return responseDto.fail("권한이 없습니다.", HttpStatus.UNAUTHORIZED);
			}

			CarResponseDto.CarInfo car = carService.getCarById(carId)
					.orElseThrow(() -> new IllegalArgumentException("차량을 찾을 수 없습니다."));

			return responseDto.success(car);
		} catch (Exception e) {
			log.error("특정 차량을 조회할 수 없습니다.", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@Operation(summary = "차량 별명 바꾸기", description = "사용자가 소유한 차량의 별명을 바꿉니다.")
	@PatchMapping("/{carId}")
	public ResponseEntity<?> changeCarNickName(
			@AuthenticationPrincipal Member member,
			@PathVariable Long carId,
			@RequestBody String nickname
	) {
		try {
			if (member.getMemberUid() == null) {
				return responseDto.fail("권한이 없습니다.", HttpStatus.UNAUTHORIZED);
			}

			CarResponseDto.CarInfo car = carService.changeNickName(carId,nickname);
			return responseDto.success(car);
		} catch (Exception e) {
			log.error("차량 별명을 변경할 수 없습니다.", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@Operation(summary = "차량 삭제", description = "사용자가 소유한 차량을 삭제합니다.")
	@DeleteMapping("/{carId}")
	public ResponseEntity<?> deleteCar(
			@AuthenticationPrincipal Member member,
			@PathVariable("carId") Long carUid
	) {
		try {
			if (member.getMemberUid() == null) {
				return responseDto.fail("권한이 없습니다.", HttpStatus.UNAUTHORIZED);
			}

			carService.deleteCar(member.getMemberUid(), carUid);

			return responseDto.success("삭제되었습니다.");
		} catch (IllegalArgumentException e) { // 존재하지 않는 차량 등
			return responseDto.fail(e.getMessage(), HttpStatus.NOT_FOUND);
		} catch (SecurityException e) { // 소유자 아님 등
			return responseDto.fail("권한이 없습니다.", HttpStatus.FORBIDDEN);
		} catch (Exception e) {
			log.error("차량을 삭제할 수 없습니다.", e);
			return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
}
