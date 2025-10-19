package com.pcarchu.platepay.plate.controller;

import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.plate.dto.PlateRequestDto;
import com.pcarchu.platepay.plate.enums.GateEventType;
import com.pcarchu.platepay.plate.service.PlateService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/plates")
public class PlateController {

    private final PlateService plateService;
    private final ResponseDto responseDto;

    @Operation(summary = "자동차 번호판 검사", description = "자동차 번호판 검사를 수행합니다.")
    @PostMapping(
            value = "/scan",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> scanPlate(
            @RequestParam("eventType") GateEventType eventType,
            @RequestParam("parkingLotId") Long parkingLotId,
            @RequestPart("image") MultipartFile image) {
        try {
            log.info("main enter() thread={}", Thread.currentThread().getName());

            if (eventType == GateEventType.ENTRY) { // 입차
                plateService.enter(parkingLotId, image);
            } else if (eventType == GateEventType.EXIT) { // 출차
                plateService.leave(parkingLotId, image);
            }

            return responseDto.success();
        } catch (Exception e) {
            log.error("자동차 번호판을 검사할 수 없습니다.", e);
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}