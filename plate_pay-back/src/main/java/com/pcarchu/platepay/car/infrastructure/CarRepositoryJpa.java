package com.pcarchu.platepay.car.infrastructure;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.pcarchu.platepay.car.domain.entity.Car;


public interface CarRepositoryJpa extends JpaRepository<Car, Long> {
	List<Car> findByMember_MemberUidAndStatusIsTrue(Long memberId);

	Optional<Car> findByCarUidAndStatusIsTrue(Long memberId);

	@EntityGraph(attributePaths = "member")
	Optional<Car> findByPlateNumAndStatusIsTrue(String plateNum);

	@EntityGraph(attributePaths = "member")
	Optional<Car> findByPlateNumAndStatusIsFalse(String plateNum);

	boolean existsByMember_MemberUidAndNickNameAndStatusIsTrue(Long memberUid, String nickName);

	void deleteCarByCarUidAndStatusIsTrue(Long carUid);
}
