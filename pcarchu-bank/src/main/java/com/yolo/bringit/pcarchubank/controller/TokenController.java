package com.yolo.bringit.pcarchubank.controller;

import com.yolo.bringit.pcarchubank.common.dto.ResponseDto;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/tokens")
public class TokenController {

    private final ResponseDto responseDto;

    @PostMapping(value = "/logout")
    public ResponseEntity<?> logout(@CookieValue(name="access_token", required = false) String atkCookieValue,
                                    HttpServletResponse response) {
        try {
            ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from("access_token", atkCookieValue)
                    .maxAge(Duration.ZERO)
                    .path("/")
                    .httpOnly(true);

            ResponseCookie atkCookie = builder.build();
            response.addHeader("Set-Cookie", atkCookie.toString());

            return responseDto.fail("logout failed", HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            log.error("로그아웃 중 예외 발생", e);
            return responseDto.fail("로그아웃 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
