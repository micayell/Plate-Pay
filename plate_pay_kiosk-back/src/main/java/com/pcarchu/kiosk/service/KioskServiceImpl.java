package com.pcarchu.kiosk.service;

import com.pcarchu.kiosk.dto.KioskRequestDto;
import com.pcarchu.kiosk.util.PlatePayUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class KioskServiceImpl implements KioskService {

    private final PlatePayUtil platePayUtil;

    public String getParkingData(Long parkingLotId, String plateNum) {
        return platePayUtil.getParkingInfo(parkingLotId, plateNum);
    }

    public boolean orderMenu(String plateNum, KioskRequestDto.orderMenuRequest orderMenuRequest) {
        log.info("[validatePayPassword] 호출 시작 - plateNum: {}, storeId: {}, cost: {} ", plateNum, orderMenuRequest.getStoreId(), orderMenuRequest.getCost());
        boolean validate = platePayUtil.validatePayPassword(plateNum, orderMenuRequest.getStoreId(), orderMenuRequest.getPassword());
        if (!validate) {
            log.error("비밀번호 검증 실패");
            return false;
        }
        return platePayUtil.orderMenu(orderMenuRequest.getStoreId(), plateNum, orderMenuRequest.getCost());
    }

    public boolean compareFace(String plateNum, MultipartFile compface, KioskRequestDto.orderMenuRequestWithFace orderMenuRequest) {
        log.info("[compareFace] 호출 시작 - plateNum: {}", plateNum);
        boolean validate = platePayUtil.compareFace(plateNum, orderMenuRequest.getStoreId(), compface);
        if (!validate) {
            log.error("얼굴 인증 실패");
            return false;
        }

        return platePayUtil.orderMenu(orderMenuRequest.getStoreId(), plateNum, orderMenuRequest.getCost());
    }
}
