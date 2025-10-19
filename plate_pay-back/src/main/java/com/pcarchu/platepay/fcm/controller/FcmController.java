package com.pcarchu.platepay.fcm.controller;

import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.fcm.dto.FcmRequestDto;
import com.pcarchu.platepay.fcm.service.FcmService;
import com.pcarchu.platepay.token.service.RefreshTokenService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/fcms")
public class FcmController {

    private final FcmService fcmService;
    private final RefreshTokenService refreshTokenService;

    private final ResponseDto responseDto;

    @PostMapping("/send")
    public ResponseEntity<?> sendNotification(@RequestBody FcmRequestDto.SendNoti sendNoti) {
        fcmService.sendMessage(sendNoti);
        return ResponseEntity.ok(responseDto.success("알림이 성공적으로 전송되었습니다."));
    }

    @Operation(summary = "FCM 토큰 저장", description = "FCM 토큰을 저장합니다.")
    @PostMapping
    public ResponseEntity<?> storeToken(HttpServletRequest request, @RequestBody FcmRequestDto.StoreToken storeToken) {
        String authorizationHeader = request.getHeader("Authorization");

        String token = null;
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            token = authorizationHeader.substring(7); // "Bearer " 이후 문자열
        }

        try {
            refreshTokenService.storeFcmToken(token, storeToken.getToken());

            return responseDto.success();
        } catch (Exception e) {
            log.error("FCM 토큰 저장을 할 수 없습니다.", e);
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}