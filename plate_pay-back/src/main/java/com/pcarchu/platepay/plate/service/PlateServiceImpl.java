package com.pcarchu.platepay.plate.service;

import com.pcarchu.platepay.inOutHistory.service.InOutHistoryAsyncService;
import com.pcarchu.platepay.util.OCRUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlateServiceImpl implements PlateService {
    private final InOutHistoryAsyncService inOutHistoryAsyncService;
    private final OCRUtil ocrUtil;

    /**
     * 자동차 입차
     */
    public void enter(Long parkingLotId, MultipartFile image) {
        Map<String, Object> res = ocrUtil.processOCR(image);
        inOutHistoryAsyncService.finalizeEnter(parkingLotId, res);
    }

    /**
     * 자동차 출차
     */
    public void leave(Long parkingLotId, MultipartFile image) {
        Map<String, Object> res = ocrUtil.processOCR(image);
        inOutHistoryAsyncService.finalizeExit(parkingLotId, res);
    }
}