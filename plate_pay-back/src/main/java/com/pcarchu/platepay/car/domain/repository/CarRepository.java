package com.pcarchu.platepay.car.domain.repository;

import java.util.List;
import java.util.Optional;

import com.pcarchu.platepay.car.domain.entity.Car;

public interface CarRepository {

	List<Car> findByMemberId(Long memberId);

	Optional<Car> findByUid(Long uid);

	Optional<Car> findByPlateNum(String plateNum);

	Optional<Car> findDeletedCarByPlateNum(String plateNum);

	boolean existsByMember_MemberUidAndNickName(Long memberUid, String nickName);

	Car save(Car car);

	void delete(Car car);
}
