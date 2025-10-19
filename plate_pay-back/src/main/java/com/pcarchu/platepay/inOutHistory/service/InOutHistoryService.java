package com.pcarchu.platepay.inOutHistory.service;

import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;

import java.util.Optional;

public interface InOutHistoryService {
    Optional<InOutHistory> createInOutHistory(InOutHistory inOutHistory);
}
