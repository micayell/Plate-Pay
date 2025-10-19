package com.pcarchu.platepay.store.infrastructure;

import java.util.ArrayList;
import java.util.List;

import com.pcarchu.platepay.store.domain.enums.StoreType;
import com.pcarchu.platepay.store.dto.StoreResponseDto;
import com.pcarchu.platepay.store.dto.searchdoc.StoreDoc;

import co.elastic.clients.elasticsearch._types.DistanceUnit;
import co.elastic.clients.elasticsearch._types.SortOptions;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.QueryBuilders;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class StoreRepositoryEs {

	private final ElasticsearchOperations operations;

	public Page<StoreResponseDto.SearchHit> search(
		double lat,
		double lon,
		StoreType type,
		String keyword,
		Pageable pageable
	) {
		// 1) bool 쿼리 구성
		List<Query> filters = new ArrayList<>();

		// 타입 필터
		if (type != null) {
			filters.add(QueryBuilders.term(t -> t.field("store_type").value(type.name())));
		}

		// 키워드 (매장명)
		Query mustKeyword;
		if (keyword != null && !keyword.isBlank()) {
			mustKeyword = QueryBuilders.match(m -> m.field("store_name").query(keyword));
		} else {
			mustKeyword = null;
		}

		Query finalQuery = QueryBuilders.bool(b -> {
			if (mustKeyword != null) b.must(mustKeyword);
			if (!filters.isEmpty()) b.filter(filters);
			return b;
		});

		// 2) 거리순 정렬 (DistanceUnit 사용!)
		SortOptions sortByDistance = SortOptions.of(s -> s
			.geoDistance(g -> g
				.field("location")
				.location(l -> l.latlon(ll -> ll.lat(lat).lon(lon)))
				.order(SortOrder.Asc)
				.unit(DistanceUnit.Kilometers))
		);

		// 3) NativeQuery (쿼리 + 정렬 + 페이징)
		org.springframework.data.elasticsearch.core.query.Query query = NativeQuery.builder()
			.withQuery(finalQuery)
			.withSort(sortByDistance)
			.withPageable(pageable)
			.build();

		// 4) 실행
		var searchHits = operations.search(query, StoreDoc.class);

		// 5) 매핑 + Page 리턴
		List<StoreResponseDto.SearchHit> content = new ArrayList<>(searchHits.getSearchHits().size());
		for (SearchHit<StoreDoc> hit : searchHits) {
			content.add(toDto(hit));
		}
		return new PageImpl<>(content, pageable, searchHits.getTotalHits());
	}

	private StoreResponseDto.SearchHit toDto(SearchHit<StoreDoc> hit) {
		StoreDoc doc = hit.getContent();
		Double distance = hit.getSortValues().isEmpty() ? null
			: ((Number) hit.getSortValues().get(0)).doubleValue();

		return StoreResponseDto.SearchHit.builder()
			.storeUid(doc.getStoreUid())
			.storeName(doc.getStoreName())
			.storeType(doc.getStoreType() != null
				? StoreType.valueOf(doc.getStoreType())
				: null)
			.address(doc.getAddress())
			.roadAddress(doc.getRoadAddress())
			.storePhoneNum(doc.getStorePhoneNum())
			.storeUrl(doc.getStoreUrl())
			.latitude(doc.getLocation() != null ? doc.getLocation().getLat() : null)
			.longitude(doc.getLocation() != null ? doc.getLocation().getLon() : null)
			.distanceKm(distance) // ES 정렬 결과에서 가져온 거리 값
			.openTime(doc.getOpenTime())
			.closeTime(doc.getCloseTime())
			.parkingId(doc.getParkingLot() != null ? doc.getParkingLot().getParkingLotUid() : null)
			.parkingName(doc.getParkingLot() != null ? doc.getParkingLot().getParkingLotName() : null)
			.build();
	}
}
