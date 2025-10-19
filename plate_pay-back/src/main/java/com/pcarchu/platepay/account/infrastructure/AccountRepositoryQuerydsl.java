package com.pcarchu.platepay.account.infrastructure;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.pcarchu.platepay.account.domain.entity.QAccount;
import com.pcarchu.platepay.account.dto.AccountResponseDto;
import com.pcarchu.platepay.inOutHistory.domain.entity.QInOutHistory;
import com.pcarchu.platepay.orderHistory.domain.entity.QOrderHistory;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryResponseDto;
import com.pcarchu.platepay.store.domain.entity.QStore;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;


@RequiredArgsConstructor
@Repository
public class AccountRepositoryQuerydsl  {

	private final JPAQueryFactory queryFactory;

	public List<AccountResponseDto.StoreTypeUsage> getTotalCostByStoreType(Long accountId, int year, int month) {
		QOrderHistory orderHistory = QOrderHistory.orderHistory;
		QInOutHistory inOutHistory = QInOutHistory.inOutHistory;
		QAccount account = QAccount.account;
		QStore store = QStore.store;

		return queryFactory
			.select(Projections.constructor(
				AccountResponseDto.StoreTypeUsage.class,
				store.storeType,
				orderHistory.cost.sum(),   // 총 가격
				orderHistory.count()       // 총 거래 횟수
			))
			.from(orderHistory)
			.join(orderHistory.inOutHistory, inOutHistory)
			.join(inOutHistory.account, account)
			.join(orderHistory.store, store)
			.where(account.accountUid.eq(accountId)
				.and(orderHistory.regDt.year().eq(year))   // 연도 조건
				.and(orderHistory.regDt.month().eq(month)) // 월 조건
			)
			.groupBy(store.storeType)
			.fetch();
	}

}
