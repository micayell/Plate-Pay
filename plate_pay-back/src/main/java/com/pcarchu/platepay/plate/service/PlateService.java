package com.pcarchu.platepay.plate.service;

import org.springframework.web.multipart.MultipartFile;

public interface PlateService {
    void enter(Long parkingLotId, MultipartFile image);
    void leave(Long parkingLotId, MultipartFile image);
}
