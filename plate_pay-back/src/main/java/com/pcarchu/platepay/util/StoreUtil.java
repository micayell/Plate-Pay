package com.pcarchu.platepay.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import com.pcarchu.platepay.parkingLot.domain.repository.ParkingLotRepository;
import com.pcarchu.platepay.store.domain.entity.Store;
import com.pcarchu.platepay.store.domain.enums.StoreType;
import com.pcarchu.platepay.store.domain.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class StoreUtil {

	private final StoreRepository storeRepository;
	private final ParkingLotRepository parkingLotRepository;

	@Value("${kakao.api.key}")
	private String kakaoApiKey;

	private final ObjectMapper objectMapper = new ObjectMapper();

	private final List<String> targetCategories = Arrays.stream(StoreType.values())
		.map(StoreType::getKakaoCode)
		.toList();

	private final List<String> regionKeywords = List.of("광주 충장로", "광주 상무지구", "광주 수완지구", "광주 첨단지구", "광주역");
	private final List<String> storeKeywords = List.of("카페", "식당", "편의점", "약국", "병원", "대형마트");

	@EventListener(ApplicationReadyEvent.class)
	public void initStores() {
		try {

			//DB에 이미 한 500개 이상 있으면 존재하는 것으로 치부.
			if (storeRepository.count() > 500) {
				log.info("매장 데이터가 이미 존재합니다. 초기화 로직을 실행하지 않습니다.");
				return;
			}

			for (String region : regionKeywords) {
				for (String category : storeKeywords) {
					String keyword = region + " " + category;
					saveStoresByKeyword(keyword);
				}
			}
		} catch (Exception e) {
			log.error("매장 초기화 실패", e);
		}
	}

	private void saveStoresByKeyword(String keyword) throws Exception {
		RestTemplate restTemplate = new RestTemplate();
		HttpHeaders headers = new HttpHeaders();
		headers.set("Authorization", "KakaoAK " + kakaoApiKey);
		HttpEntity<String> entity = new HttpEntity<>(headers);

		for (int page = 1; page <= 5; page++) {
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
					String roadAddress = doc.get("road_address_name").asText("");
					String longitude = doc.get("x").asText();
					String latitude = doc.get("y").asText();
					String phone = doc.has("phone") ? doc.get("phone").asText() : null;
					String categoryCode = doc.get("category_group_code").asText();

					// 카테고리 필터링
					if (!targetCategories.contains(categoryCode)) {
						continue;
					}

					// StoreType 매핑
					StoreType storeType = StoreType.fromKakaoCode(categoryCode);
					if (storeType == null) continue;

					// 중복 방지
					boolean exists = storeRepository.existsByStoreNameAndAddress(name, address);
					if (exists) {
						log.info("이미 존재하는 매장: {} ({}). 저장 생략", name, address);
						continue;
					}

					// 가까운 주차장 찾기
					ParkingLot nearestLot = findNearestParkingLot(latitude, longitude);
					if (nearestLot == null) {
						log.warn("가까운 주차장 없음 → 매장 저장 스킵: {}", name);
						continue;
					}

					Store store = storeRepository.save(
						Store.builder()
							.storeName(name)
							.latitude(latitude)
							.longitude(longitude)
							.address(address)
							.roadAddress(roadAddress)
							.storePhoneNum(phone)
							.storeType(storeType)
							.storeUrl(null)
							.openTime("09:00")
							.closeTime("22:00")
							.parkingLot(nearestLot) // 한 매장은 하나의 주차장만
							.build()
					);

					log.info("매장 저장 완료: {} → 주차장 [{}], 카테고리 [{}]",
						store.getStoreName(), nearestLot.getParkingLotName(), storeType.getDescription());
				}
			} else {
				break;
			}
		}
	}

	/** 위경도로 가장 가까운 주차장 찾기 */
	private ParkingLot findNearestParkingLot(String latStr, String lonStr) {
		double lat = Double.parseDouble(latStr);
		double lon = Double.parseDouble(lonStr);

		return parkingLotRepository.findAll().stream()
			.min((p1, p2) -> {
				double d1 = haversine(lat, lon,
					Double.parseDouble(p1.getLatitude()), Double.parseDouble(p1.getLongitude()));
				double d2 = haversine(lat, lon,
					Double.parseDouble(p2.getLatitude()), Double.parseDouble(p2.getLongitude()));
				return Double.compare(d1, d2);
			})
			.orElse(null);
	}

	/** Haversine 공식 (단위: km) */
	private double haversine(double lat1, double lon1, double lat2, double lon2) {
		double R = 6371;
		double dLat = Math.toRadians(lat2 - lat1);
		double dLon = Math.toRadians(lon2 - lon1);
		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
				Math.sin(dLon / 2) * Math.sin(dLon / 2);
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}
}
