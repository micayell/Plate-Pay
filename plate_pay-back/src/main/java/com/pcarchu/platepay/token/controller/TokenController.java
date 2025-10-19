package com.pcarchu.platepay.token.controller;

import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.token.dto.TokenRequestDto;
import com.pcarchu.platepay.token.dto.TokenResponseDto;
import com.pcarchu.platepay.token.service.RefreshTokenService;
import com.pcarchu.platepay.token.service.StaleTokenService;
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
@RequestMapping(value = "/api/v1/tokens")
public class TokenController {
    private final RefreshTokenService refreshTokenService;
    private final StaleTokenService staleTokenService;

    private final ResponseDto responseDto;

    @Operation(summary = "로그아웃", description = "로그아웃을 진행합니다.")
    @PostMapping(value = "/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        try {
            String header = request.getHeader("Authorization");

            if (header == null || !header.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("토큰이 유효하지 않습니다.");
            }

            String accessToken = header.replace("Bearer ", "").trim();

            if (accessToken != null && !accessToken.isEmpty()) {
                staleTokenService.writeTokenInfo(accessToken); // stale token 등록
                refreshTokenService.removeRefreshToken(accessToken);

                return responseDto.success("logout success ");
            }

            return responseDto.fail("logout failed", HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            log.error("로그아웃 중 예외 발생", e);
            return responseDto.fail("로그아웃 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "리프레시 토큰 재발급", description = "리프레시 토큰을 재발급합니다.")
    @PostMapping(value = "/reissue")
    public ResponseEntity<?> reissue(@RequestBody TokenRequestDto.Reissue reissueDto) {
        try {
            String refreshToken = reissueDto.getRefreshToken();

            String accessToken = refreshTokenService.reissue(refreshToken);
            if (accessToken == null) {
                return responseDto.fail("reissue failed.", HttpStatus.BAD_REQUEST);
            }

            return responseDto.success(TokenResponseDto.ReissueInfo.builder()
                    .accessToken(accessToken)
                    .build());

        } catch (Exception e) {
            log.debug("reissue error occurred!");
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
