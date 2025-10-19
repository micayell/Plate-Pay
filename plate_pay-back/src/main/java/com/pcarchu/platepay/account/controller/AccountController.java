package com.pcarchu.platepay.account.controller;


import com.pcarchu.platepay.account.dto.AccountRequestDto;
import com.pcarchu.platepay.account.dto.AccountResponseDto;
import com.pcarchu.platepay.account.service.AccountService;
import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.util.SsafyUtil;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/accounts")
public class AccountController {
    private final AccountService accountService;
    private final ResponseDto responseDto;

    @Operation(summary = "사용자 계좌 조회", description = "사용자가 등록한 계좌를 조회합니다.")
    @GetMapping
    public ResponseEntity<?> getAccounts(@AuthenticationPrincipal Member loginMember) {
        try {
            log.info("getAccounts occurred!");
            List<AccountResponseDto.AccountInfo> list = accountService.getAccounts(loginMember);
            log.info("getAccounts completed!");
            return responseDto.success(list, "계좌 목록 조회 성공", HttpStatus.OK);
        } catch (Exception e) {
            log.debug("getAccounts error occurred!");
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "주 계좌 변경", description = "결제용 주 계좌를 변경합니다.")
    @PatchMapping("/{accountId}/primary")
    public ResponseEntity<?> setMainAccount(@AuthenticationPrincipal Member loginMember, @PathVariable Long accountId) {
        try {
            accountService.setMainAccount(loginMember, accountId);
            return responseDto.success("주 계좌 변경 성공");
        } catch (Exception e) {
            log.debug("setMainAccount error occurred!");
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "주 계좌 삭제", description = "계좌를 삭제합니다.")
    @DeleteMapping("/{accountId}")
    public ResponseEntity<?> deleteAccount(@AuthenticationPrincipal Member loginMember, @PathVariable Long accountId) {
        try {
            accountService.deleteAccount(loginMember, accountId);
            return responseDto.success("계좌 삭제 성공");
        } catch (Exception e) {
            log.debug("deleteAccount error occurred!");
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "계좌 이름 변경", description = "계좌 이름을 합니다.")
    @PatchMapping("/{accountId}")
    public ResponseEntity<?> setAccountName(@AuthenticationPrincipal Member loginMember, @PathVariable Long accountId, @RequestBody AccountRequestDto.AccountNameRequestDto requestDto) {
        try {
            log.info(requestDto.getNewName());
            accountService.setAccountName(loginMember, accountId, requestDto.getNewName());
            return responseDto.success("계좌 이름 변경 성공");
        } catch (Exception e) {
            log.debug("setAccountName error occurred!");
            return responseDto.fail("server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "계좌 등록 요청", description = "계좌 등록을 요청 합니다.")
    @PostMapping("/register")
    public ResponseEntity<?> registerAccount(@AuthenticationPrincipal Member loginMember, @RequestBody AccountRequestDto.AccountRegisterRequest requestDto) {
        accountService.registerAccountRequest(loginMember, requestDto.getAccountNo());
        return responseDto.success("1원 송금 요청 성공. 인증번호를 입력하세요.");
    }

    @Operation(summary = "계좌 1원 검증 요청", description = "계좌 등록을 위한 1원 검증을 요청 합니다.")
    @PostMapping("/verify")
    public ResponseEntity<?> verifyAccount(@AuthenticationPrincipal Member loginMember, @RequestBody AccountRequestDto.AccountVerifyRequest requestDto) {
        accountService.verifyAccountRequest(loginMember, requestDto.getAccountNo(), requestDto.getAuthCode(), requestDto.getAccountName());
        return responseDto.success("1원 송금 검증 성공");
    }

    @Operation(summary = "계좌별 통계 내역", description = "계좌별 storeType 기준 총 결제 금액 및 거래 횟수를 조회합니다.")
    @GetMapping("/{accountId}/stats")
    public ResponseEntity<?> getAccountStats(
        @AuthenticationPrincipal Member loginMember,
        @PathVariable Long accountId,
        @RequestParam int year,
        @RequestParam int month) {
        try {
            // 서비스 호출
            List<AccountResponseDto.StoreTypeUsage> stats = accountService.getAccountUsageStats(loginMember,accountId,year,month);
            return responseDto.success(stats, "계좌별 통계 조회 성공", HttpStatus.OK);
        } catch (EntityNotFoundException e) {
            return responseDto.fail(e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            log.error("getAccountStats error occurred!", e);
            return responseDto.fail("Interner server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
