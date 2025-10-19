package com.pcarchu.kiosk.service;

import com.pcarchu.kiosk.dto.KioskRequestDto;
import org.springframework.web.multipart.MultipartFile;

public interface KioskService {
    String getParkingData(Long parkingLotId, String plateNum);

    boolean orderMenu(String plateNum, KioskRequestDto.orderMenuRequest orderMenuRequest);

    boolean compareFace(String plateNum, MultipartFile compface, KioskRequestDto.orderMenuRequestWithFace orderMenuRequest);
}
