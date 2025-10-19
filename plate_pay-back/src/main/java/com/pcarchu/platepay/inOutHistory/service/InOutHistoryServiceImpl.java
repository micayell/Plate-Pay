package com.pcarchu.platepay.inOutHistory.service;

import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.inOutHistory.domain.repository.InOutHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InOutHistoryServiceImpl implements InOutHistoryService {

	private final InOutHistoryRepository inOutHistoryRepository;

	public Optional<InOutHistory> createInOutHistory(InOutHistory inOutHistory) {
		return inOutHistoryRepository.save(inOutHistory);
	}


}
