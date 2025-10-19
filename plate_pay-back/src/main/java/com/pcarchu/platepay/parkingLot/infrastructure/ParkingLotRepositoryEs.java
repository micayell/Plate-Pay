package com.pcarchu.platepay.parkingLot.infrastructure;

import java.util.ArrayList;
import java.util.List;

import com.pcarchu.platepay.parkingLot.dto.ParkingLotResponseDto;
import com.pcarchu.platepay.parkingLot.dto.searchdoc.ParkingLotDoc;

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
public class ParkingLotRepositoryEs {

	private final ElasticsearchOperations operations;

	public Page<ParkingLotResponseDto.SearchHit> search(
		double lat,
		double lon,
		String keyword,
		Pageable pageable
	) {
		List<Query> filters = new ArrayList<>();

		// 키워드 검색 (주차장 이름 기준)
		Query mustKeyword;
		if (keyword != null && !keyword.isBlank()) {
			mustKeyword = QueryBuilders.match(m -> m.field("parking_lot_name").query(keyword));
		} else {
			mustKeyword = null;
		}

		Query finalQuery = QueryBuilders.bool(b -> {
			if (mustKeyword != null) b.must(mustKeyword);
			if (!filters.isEmpty()) b.filter(filters);
			return b;
		});

		// 거리순 정렬
		SortOptions sortByDistance = SortOptions.of(s -> s
			.geoDistance(g -> g
				.field("location")
				.location(l -> l.latlon(ll -> ll.lat(lat).lon(lon)))
				.order(SortOrder.Asc)
				.unit(DistanceUnit.Kilometers))
		);

		// NativeQuery
		org.springframework.data.elasticsearch.core.query.Query query = NativeQuery.builder()
			.withQuery(finalQuery)
			.withSort(sortByDistance)
			.withPageable(pageable)
			.build();

		// 실행
		var searchHits = operations.search(query, ParkingLotDoc.class);

		List<ParkingLotResponseDto.SearchHit> content = new ArrayList<>();
		for (SearchHit<ParkingLotDoc> hit : searchHits) {
			content.add(toDto(hit));
		}

		return new PageImpl<>(content, pageable, searchHits.getTotalHits());
	}

	private ParkingLotResponseDto.SearchHit toDto(SearchHit<ParkingLotDoc> hit) {
		ParkingLotDoc doc = hit.getContent();
		Double distance = hit.getSortValues().isEmpty() ? null
			: ((Number) hit.getSortValues().get(0)).doubleValue();

		return ParkingLotResponseDto.SearchHit.builder()
			.parkingLotUid(doc.getParkingLotUid())
			.parkingLotName(doc.getParkingLotName())
			.address(doc.getAddress())
			.roadAddress(doc.getRoadAddress())
			.latitude(doc.getLocation() != null ? doc.getLocation().getLat() : null)
			.longitude(doc.getLocation() != null ? doc.getLocation().getLon() : null)
			.distanceKm(distance)
			.primaryFee(doc.getParkingLotFee() != null ? doc.getParkingLotFee().getPrimaryFee() : null)
			.additionalFee(doc.getParkingLotFee() != null ? doc.getParkingLotFee().getAdditionalFee() : null)
			.build();
	}
}
