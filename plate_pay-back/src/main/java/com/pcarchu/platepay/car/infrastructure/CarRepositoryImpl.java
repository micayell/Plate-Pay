package com.pcarchu.platepay.car.infrastructure;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.car.domain.repository.CarRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CarRepositoryImpl implements CarRepository {

	private final CarRepositoryJpa carRepositoryJpa;

	@Override
	public List<Car> findByMemberId(Long memberId) {
		return carRepositoryJpa.findByMember_MemberUidAndStatusIsTrue(memberId);
	}

	@Override
	public Optional<Car> findByUid(Long uid) {
		return carRepositoryJpa.findByCarUidAndStatusIsTrue(uid);
	}

	@Override
	public Optional<Car> findByPlateNum(String plateNum) {
		return carRepositoryJpa.findByPlateNumAndStatusIsTrue(plateNum);
	}

	@Override
	public Optional<Car> findDeletedCarByPlateNum(String plateNum) {
		return carRepositoryJpa.findByPlateNumAndStatusIsFalse(plateNum);
	}

	@Override
	public boolean existsByMember_MemberUidAndNickName(Long memberUid, String nickName) {
		return carRepositoryJpa.existsByMember_MemberUidAndNickNameAndStatusIsTrue(memberUid, nickName);
	}

	@Override
	public Car save(Car car) {
		return carRepositoryJpa.save(car);
	}

	@Override
	public void delete(Car car) {
		carRepositoryJpa.deleteCarByCarUidAndStatusIsTrue(car.getCarUid());
	}
}
