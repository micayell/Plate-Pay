package com.pcarchu.platepay.inOutHistory.service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

public interface InOutHistoryAsyncService {
    CompletableFuture<Void> finalizeEnter(Long parkingLotId, Map<String, Object> res);
    CompletableFuture<Void> finalizeExit(Long parkingLotId, Map<String, Object> res);
}
