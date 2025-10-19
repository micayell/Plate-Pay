package com.pcarchu.platepay.car.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.car.domain.repository.CarRepository;
import com.pcarchu.platepay.car.dto.CarRequestDto;
import com.pcarchu.platepay.car.dto.CarResponseDto;

import com.pcarchu.platepay.codefToken.domain.entity.CodefToken;
import com.pcarchu.platepay.codefToken.service.CodefTokenService;
import com.pcarchu.platepay.common.error.BusinessException;
import com.pcarchu.platepay.common.error.ErrorCode;
import com.pcarchu.platepay.config.cache.CacheConfig;
import com.pcarchu.platepay.file.domain.entity.PlatePayFile;
import com.pcarchu.platepay.file.service.PlatePayFileService;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.util.CodefUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CarServiceImpl implements CarService {
	private final PlatePayFileService platePayFileService;
	private final CodefTokenService codefTokenService;
	private final CodefUtil codefUtil;
	private final Cache<Long, CacheConfig.PendingCarRegistration> pendingCarRegistrationCache;

	private final CarRepository carRepository;

	/**
	 * 특정 사용자의 모든 차량 조회
	 */
	@Override
	@Transactional
	public List<CarResponseDto.CarInfo> getAllCarsByMemberId(Long memberId) {
		return carRepository.findByMemberId(memberId)
				.stream()
				.map(car -> CarResponseDto.CarInfo.builder()
						.carUid(car.getCarUid())
						.nickName(car.getNickName())
						.plateNum(car.getPlateNum())
						.carModel(car.getCarModel())
						.imgUrl(car.getPlatePayFile().getPath())
						.build()
				).collect(Collectors.toList());
	}

	/**
	 * 차량 UID로 단일 차량 조회
	 */
	@Override
	@Transactional
	public Optional<CarResponseDto.CarInfo> getCarById(Long carUid) {
		return carRepository.findByUid(carUid)
				.map(car -> CarResponseDto.CarInfo.builder()
						.carUid(car.getCarUid())
						.nickName(car.getNickName())
						.plateNum(car.getPlateNum())
						.carModel(car.getCarModel())
						.imgUrl(car.getPlatePayFile().getPath())
						.build()
				);
	}

	/**
	 * 차량 별명 변경 (회원 내 중복 닉네임 금지)
	 */
	@Override
	@Transactional
	public CarResponseDto.CarInfo changeNickName(Long carUid, String nickname) {
		Car car = carRepository.findByUid(carUid)
				.orElseThrow(() -> new RuntimeException("차를 찾을 수 없습니다."));

		Long memberId = car.getMember().getMemberUid();

		boolean exists = carRepository.existsByMember_MemberUidAndNickName(memberId, nickname);
		if (exists && !nickname.equals(car.getNickName())) {
			throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
		}

		car.changeNickName(memberId, nickname);
		Car saved = carRepository.save(car);

		return CarResponseDto.CarInfo.builder()
				.carUid(saved.getCarUid())
				.nickName(saved.getNickName())
				.plateNum(saved.getPlateNum())
				.carModel(saved.getCarModel())
				.imgUrl(saved.getPlatePayFile().getPath())
				.build();
	}

	@Override
	@Transactional
	public void deleteCar(Long memberId, Long carUid) {
		// 1. 차량 조회
		Car car = carRepository.findByUid(carUid)
				.orElseThrow(() -> new IllegalArgumentException("차량을 찾을 수 없습니다."));

		// 2. 소유자 검증
		if (!car.getMember().getMemberUid().equals(memberId)) {
			throw new SecurityException("해당 차량의 소유자가 아닙니다.");
		}

		// 3. 삭제
		car.setStatus(false);
	}

	/**
	 * 차량 등록 1단계
	 */
	@Override
	@Transactional
	public CarResponseDto.FirstPhaseInfo registerCarFirstPhase(CarRequestDto.RegisterCar registerCar, Member member) {
		Optional<CodefToken> optionalCodefToken = codefTokenService.getToken();

		if (optionalCodefToken.isEmpty()) {
			// codefToken이 비어있으면 새로 생성
			optionalCodefToken = codefTokenService.create();
		}
		if (member.getCars().size() >= 3) {
			// 차는 3개까지 등록 가능
			throw new BusinessException(ErrorCode.MEMBER_CAR_LIMIT_EXCEEDED);
		}

		Map<String, String> map = codefUtil.registerCarIssuance(registerCar, null, member, optionalCodefToken.get(), 1);
		CarResponseDto.FirstPhaseInfo firstPhaseInfo = null;

		if (map != null) {
			firstPhaseInfo = CarResponseDto.FirstPhaseInfo.builder()
					.code(map.get("code"))
					.jobIndex(Integer.valueOf(map.get("jobIndex")))
					.threadIndex(Integer.valueOf(map.get("threadIndex")))
					.twoWayTimestamp(Long.valueOf(map.get("twoWayTimestamp")))
					.jti(map.get("jti"))
					.build();

			// 인메모리 cache에 저장 (CF-03002)
			if (firstPhaseInfo.getCode().equals("CF-03002")) {
				pendingCarRegistrationCache.put(
						member.getMemberUid(),
						CacheConfig.PendingCarRegistration.builder()
								.registerCar(registerCar)
								.firstPhaseInfo(firstPhaseInfo)
								.build()
				);
			}
		}

		return firstPhaseInfo;
	}

	/**
	 * 차량 등록 2단계
	 */
	@Override
	@Transactional
	public Map<String, String> registerCarSecondPhase(Member member) {
		Long memberId = member.getMemberUid();
		CacheConfig.PendingCarRegistration pending = pendingCarRegistrationCache.getIfPresent(memberId);
        if (pending == null) {
			throw new IllegalStateException("1차 검증 데이터가 없습니다. 다시 진행해주세요.");
		}

		// 성공 시 캐시 정리
		pendingCarRegistrationCache.invalidate(memberId);

		Optional<CodefToken> optionalCodefToken = codefTokenService.getToken();
		if (optionalCodefToken.isEmpty()) {
			// codefToken이 비어있으면 새로 생성
			optionalCodefToken = codefTokenService.create();
		}

		Map<String, String> map = codefUtil.registerCarIssuance(pending.getRegisterCar(), pending.getFirstPhaseInfo(), member, optionalCodefToken.get(), 2);

		if (map != null && map.get("code").equals("CF-00000")) {
			Optional<Car> optionalCar = carRepository.findByPlateNum(pending.getRegisterCar().getPlateNum());

			if (optionalCar.isEmpty()) {
				// 자동차 이미지 크롤링
				String year = map.get("resCarYearModel");
				String commCarName = map.get("commCarName");
				String carName = commCarName.split("\\(")[0].trim();

				String query = year + " " + carName;

				String result = "";
				try {
					result = searchNaverCarImage(query);

					if (result.equals("https://velog.velcdn.com/images/brylimo/post/0afd5ffd-cb39-4800-94db-f2136757e4bb/image.png")) {
						log.info("year + carName 검색 결과 없음. carName으로 재검색");

						query = carName;
						result = searchNaverCarImage(query);
					}
				} catch (Exception e) {
					log.error("차량 이미지 검색 중 에러 발생");
				}

				Optional<PlatePayFile> optionalPlatePayFile = platePayFileService.getFileByNameAndType(query, "naver car type");

				// 크롤링 이미지 저장
				if (optionalPlatePayFile.isEmpty() &&
						StringUtils.hasText(result)) {
					optionalPlatePayFile = platePayFileService.createFile(PlatePayFile.builder()
							.ext("png")
							.name(query)
							.type("naver car type")
							.path(result)
							.build());
				}

				// 차량 정보 저장
				Optional<Car> optionalDeletedCar = carRepository.findDeletedCarByPlateNum(pending.getRegisterCar().getPlateNum());

				if (optionalDeletedCar.isEmpty()) {
					carRepository.save(Car.builder()
							.nickName(pending.getRegisterCar().getNickname())
							.plateNum(pending.getRegisterCar().getPlateNum())
							.carModel(map.get("commCarName"))
							.carYearModel(map.get("resCarYearModel"))
							.platePayFile(optionalPlatePayFile.get())
							.member(member)
							.status(true)
							.build());
				} else {
					optionalDeletedCar.get().setStatus(true);
				}
			}

		}

		return map;
	}

	/**
	 * 자동차 번호판으로 자동차 검색
	 */
	@Override
	@Transactional
	public Optional<Car> getCarByPlateNum(String plateNum) {
		return carRepository.findByPlateNum(plateNum);
	}

	/**
	 * 네이버에서 차량 이미지 크롤링
	 */
	private String searchNaverCarImage(String searchKeyword) {
		try {
			String query = URLEncoder.encode(searchKeyword, "UTF-8");
			String url = "https://search.naver.com/search.naver?query=" + query;

			Document doc = Jsoup.connect(url)
					.userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
					.timeout(5000)
					.get();

			Elements imgElements = doc.select(".cm_img img, .img_area img");

			for (Element img : imgElements) {
				String alt = img.attr("alt");
				String src = img.attr("src");

				if ((alt.contains(searchKeyword) && alt.contains("이미지")) || alt.contains("360도 이미지 5")) {
					return src;
				}
			}

			String defaultSrc = "https://velog.velcdn.com/images/brylimo/post/0afd5ffd-cb39-4800-94db-f2136757e4bb/image.png";
			return defaultSrc;

		} catch (Exception e) {
			e.printStackTrace();
			return null;
		}
	}

}
