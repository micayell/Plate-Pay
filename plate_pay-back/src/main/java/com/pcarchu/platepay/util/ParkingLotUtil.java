package com.pcarchu.platepay.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLotFee;
import com.pcarchu.platepay.parkingLot.domain.repository.ParkingLotRepository;
import com.pcarchu.platepay.parkingLot.domain.repository.ParkingLotFeeRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Random;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParkingLotUtil {

	private final ParkingLotRepository parkingLotRepository;
	private final ParkingLotFeeRepository parkingLotFeeRepository;

	@Value("${kakao.api.key}")
	private String kakaoApiKey;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final Random random = new Random();

	private final List<int[]> feeCandidates = List.of(
		new int[]{2000, 500},
		new int[]{3000, 800},
		new int[]{1500, 300},
		new int[]{2500, 600},
		new int[]{1800, 400}
	);

	@PostConstruct
	public void initParkingLots() {

		if (parkingLotRepository.count() > 100) {
			log.info("주차장 데이터가 이미 존재합니다. 초기화 로직을 실행하지 않습니다.");
			return;
		}
		try {
			saveParkingLotByKeyword("광주 충장로 주차장");
			saveParkingLotByKeyword("광주 수완지구 주차장");
			saveParkingLotByKeyword("광주 첨단지구 주차장");
			saveParkingLotByKeyword("광주역 주차장");
			saveParkingLotByKeyword("광주 상무지구 주차장");
		} catch (Exception e) {
			log.error("주차장 초기화 실패", e);
		}
	}

	private void saveParkingLotByKeyword(String keyword) throws Exception {
		RestTemplate restTemplate = new RestTemplate();
		HttpHeaders headers = new HttpHeaders();
		headers.set("Authorization", "KakaoAK " + kakaoApiKey);
		HttpEntity<String> entity = new HttpEntity<>(headers);


		for (int page = 1; page <= 3; page++) {
			String url = String.format(
				"https://dapi.kakao.com/v2/local/search/keyword.json?query=%s&size=15&page=%d",
				keyword, page
			);

			var response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
			JsonNode root = objectMapper.readTree(response.getBody());
			JsonNode docs = root.get("documents");

			if (docs.isArray() && docs.size() > 0) {
				for (JsonNode doc : docs) {
					String name = doc.get("place_name").asText();
					String address = doc.get("address_name").asText();
					String roadAddress = doc.get("road_address_name").asText();
					String longitude = doc.get("x").asText();
					String latitude = doc.get("y").asText();

					boolean exists = parkingLotRepository.existsByParkingLotNameAndAddress(name, address);
					if (exists) {
						log.info("이미 존재하는 주차장: {} ({}). 저장 생략", name, address);
						continue;
					}

					int[] feeCandidate = feeCandidates.get(random.nextInt(feeCandidates.size()));

					ParkingLotFee fee = parkingLotFeeRepository.save(
						ParkingLotFee.builder()
							.primaryFee(feeCandidate[0])
							.additionalFee(feeCandidate[1])
							.build()
					);

					ParkingLot lot = parkingLotRepository.save(
						ParkingLot.builder()
							.parkingLotName(name)
							.latitude(latitude)
							.longitude(longitude)
							.address(address)
							.roadAddress(roadAddress)
							.parkingLotFee(fee)
							.build()
					);

					log.info("주차장 저장 완료: {} (기본요금 {}원, 추가요금 {}원)",
						lot.getParkingLotName(),
						fee.getPrimaryFee(),
						fee.getAdditionalFee());
				}
			} else {
				break;
			}
		}
	}


}
