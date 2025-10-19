package com.pcarchu.platepay.car.service;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.car.dto.CarRequestDto;
import com.pcarchu.platepay.car.dto.CarResponseDto;
import com.pcarchu.platepay.member.domain.entity.Member;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface CarService {
    List<CarResponseDto.CarInfo> getAllCarsByMemberId(Long memberId);
    Optional<CarResponseDto.CarInfo> getCarById(Long carUid);
    Optional<Car> getCarByPlateNum(String plateNum);
    CarResponseDto.CarInfo changeNickName(Long carUid, String nickname);
    void deleteCar(Long memberId, Long carUid);
    CarResponseDto.FirstPhaseInfo registerCarFirstPhase(CarRequestDto.RegisterCar registerCar, Member member);
    Map<String, String> registerCarSecondPhase(Member member);
}
