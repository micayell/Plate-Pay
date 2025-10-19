package com.pcarchu.kiosk.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcarchu.kiosk.common.dto.ResponseDto;
import com.pcarchu.kiosk.dto.KioskRequestDto;
import com.pcarchu.kiosk.service.KioskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/plate-pays")
public class KioskController {
    private final KioskService kioskService;
    private final ResponseDto responseDto;

    @GetMapping(value = "/{parkingLotId}/{plateNum}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getCarsByParkingLot(@PathVariable Long parkingLotId, @PathVariable String plateNum) {
        try {
            log.info("getCarsByParkingLot occurred!");
            String response = kioskService.getParkingData(parkingLotId, plateNum);

            // BOM 제거(간헐적 UTF-8 BOM 방지)
            if (response != null && response.startsWith("\uFEFF")) {
                response = response.substring(1);
            }

            ObjectMapper om = new ObjectMapper();
            JsonNode json = om.readTree(response); // ← 여기서 JSON 확인/파싱
            return ResponseEntity.ok(json);        // ← JSON으로 응답 (UTF-8, application/json)
        } catch (Exception e) {
            log.debug("getCarsByParkingLot error occurred!", e);
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/{plateNum}")
    public ResponseEntity<?> orderMenu(@PathVariable String plateNum, @RequestBody KioskRequestDto.orderMenuRequest orderMenuRequest) {
        try {
            boolean response = kioskService.orderMenu(plateNum, orderMenuRequest);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.debug("orderMenu error occurred!");
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping(value = "/{plateNum}/compare", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> compareFace(@PathVariable String plateNum, @RequestPart("file") MultipartFile compface, @RequestPart("orderMenuRequest") KioskRequestDto.orderMenuRequestWithFace orderMenuRequest) {
        try {
            boolean response = kioskService.compareFace(plateNum, compface, orderMenuRequest);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.debug("compareFace error occurred!");
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
