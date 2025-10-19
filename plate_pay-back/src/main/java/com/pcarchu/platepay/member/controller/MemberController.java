package com.pcarchu.platepay.member.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcarchu.platepay.common.dto.ResponseDto;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.member.dto.MemberRequestDto;
import com.pcarchu.platepay.member.dto.MemberResponseDto;
import com.pcarchu.platepay.member.service.MemberService;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryResponseDto;
import com.pcarchu.platepay.orderHistory.service.OrderHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/members")
public class MemberController {
    private final MemberService memberService;
    private final OrderHistoryService orderHistoryService;

    private final ResponseDto responseDto;

    @Operation(summary = "이메일 기반 회원 단일 조회", description = "이메일 기반 회원 단일 조회를 진행합니다.")
    @GetMapping("/bank")
    public ResponseEntity<?> getMember(@RequestParam("email") String email) {
        log.info("[getMember] 요청 email={}", email);

        try {
            Member member = memberService.getByEmail(email).orElseThrow(
                    () -> new RuntimeException("해당 유저가 없습니다.")
            );

            log.info("[getMember] 조회된 회원 정보 - memberUid={}, name={}, nickname={}, email={}, phoneNum={}, userKey={}",
                    member.getMemberUid(), member.getName(), member.getNickname(),
                    member.getEmail(), member.getPhoneNum(), member.getUserKey());

            return responseDto.success(MemberResponseDto.MemberInfoWithUserKey.builder()
                    .memberUid(member.getMemberUid())
                    .name(member.getName())
                    .nickname(member.getNickname())
                    .email(member.getEmail())
                    .phoneNum(member.getPhoneNum())
                    .userKey(member.getUserKey())
                    .build());

        } catch (Exception e) {
            log.error("[getMember] 회원 단일 조회 중 예외 발생", e);
            return responseDto.fail("회원 단일 조회 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @Operation(summary = "회원 단일 조회", description = "회원 단일 조회를 진행합니다.")
    @GetMapping("/{member-id}")
    public ResponseEntity<?> getMember(@PathVariable("member-id") Long memberId) {
        try {
            Member member = memberService.getMemberById(memberId).orElseThrow(
                    () -> new RuntimeException("해당 유저가 없습니다.")
            );

            return responseDto.success(MemberResponseDto.MemberInfo.builder()
                            .memberUid(member.getMemberUid())
                            .name(member.getName())
                            .nickname(member.getNickname())
                            .email(member.getEmail())
                            .phoneNum(member.getPhoneNum())
                            .loginType(member.getLoginType())
                            .loginType(member.getLoginType())
                            .build());

        } catch (Exception e) {
            log.error("회원 단일 조회 중 예외 발생", e);
            return responseDto.fail("회원 단일 조회 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "회원 정보 수정", description = "회원 정보 수정을 진행합니다.")
    @PutMapping("/{member-id}")
    public ResponseEntity<?> updateMember(@PathVariable("member-id") Long memberId,
                                          @RequestBody MemberRequestDto.UpdateMember newMember) {
        try {
            memberService.updateById(memberId, newMember);

            return responseDto.success();
        } catch (Exception e) {
            log.error("회원 정보 수정 중 예외 발생", e);
            return responseDto.fail("회원 정보 수정 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "회원 탈퇴", description = "회원 탈퇴를 진행합니다.")
    @DeleteMapping
    public ResponseEntity<?> withdraw(@AuthenticationPrincipal Member member) {
        try {
            memberService.withdraw(member.getMemberUid());

            return responseDto.success();
        } catch (Exception e) {
            log.error("회원 탈퇴 중 예외 발생", e);
            return responseDto.fail("회원 탈퇴 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "회원 활성화 조회", description = "회원 활성화 여부를 조회합니다.")
    @GetMapping("/activation")
    public ResponseEntity<?> getIsActive(@AuthenticationPrincipal Member member) {
        try {

            return responseDto.success(MemberResponseDto.IsActiveInfo.builder()
                            .isActive(member.getIsActive())
                            .build());
        } catch (Exception e) {
            log.error("회원 활성화 조회 중 예외 발생", e);
            return responseDto.fail("회원 활성화 조회 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "회원 활성화 토글", description = "회원 활성화를 토글합니다.")
    @PatchMapping("/activation")
    public ResponseEntity<?> toggleIsActive(@AuthenticationPrincipal Member member) {
        try {
            Boolean isActive = member.getIsActive();

            if (isActive) {
                // 활성화에서 비활성화로 변경되는 경우
                // 주문중인 상품이 있으면 비활성화 불가능
                OrderHistoryResponseDto.PaymentHistoryInfo info = orderHistoryService.getActiveUnpaidHistory(member);

                if (info != null && !info.getOrders().isEmpty()) {
                    return responseDto.fail("활성화 상태를 변경할 수 없습니다. 미결제 주문이 존재합니다.", HttpStatus.CONFLICT);
                }
            }

            Member updatedMember = memberService.toggleIsActive(member).orElseThrow(
                    () -> new RuntimeException("해당 유저가 없습니다.")
            );

            return responseDto.success(MemberResponseDto.IsActiveInfo.builder()
                    .isActive(updatedMember.getIsActive())
                    .build());
        } catch (Exception e) {
            log.error("회원 활성화 토글 중 예외 발생", e);
            return responseDto.fail("회원 활성화 토글 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "결제 비밀번호 입력 검증", description = "키오스크에서 결제 비밀번호를 입력했을 때 맞는지 검증합니다.")
    @PostMapping("/password-validation")
    public ResponseEntity<?> validatePayPassword(@RequestBody MemberRequestDto.ValidatePayPassword validatePayPassword) {
        try {
            log.info("비밀번호 검증 시작");
            Boolean res = memberService.validatePassword(validatePayPassword);

            return responseDto.success(MemberResponseDto.PWDValidationInfo.builder()
                            .result(res)
                            .build());
        } catch (Exception e) {
            log.error("결제 비밀번호 입력 검증 중 예외 발생", e);
            return responseDto.fail("결제 비밀번호 입력 검증 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "비밀번호 입력 검증", description = "얼굴 등록 전 비밀번호를 입력했을 때 맞는지 검증합니다.")
    @PostMapping("/pwd-validation")
    public ResponseEntity<?> validatePwd(@AuthenticationPrincipal Member member, @RequestBody MemberRequestDto.ValidatePwd validatePwd) {
        try {
            Boolean res = memberService.validatePwd(member, validatePwd);

            return responseDto.success(MemberResponseDto.PWDValidationInfo.builder()
                    .result(res)
                    .build());
        } catch (Exception e) {
            log.error("결제 비밀번호 입력 검증 중 예외 발생", e);
            return responseDto.fail("결제 비밀번호 입력 검증 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "얼굴 인식 등록", description = "결제할 때 사용할 얼굴 인식을 등록합니다.")
    @PostMapping(value = "/face-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadFace(@AuthenticationPrincipal Member member, @RequestPart("file") MultipartFile faceimg) {
        try {
            log.info("[uploadFace] faceimg = {}", faceimg);
            Boolean res = memberService.uploadFace(member, faceimg);

            return responseDto.success("얼굴 등록 성공");
        } catch (Exception e) {
            log.error("얼굴 등록 중 예외 발생", e);
            return responseDto.fail("얼굴 등록 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "결제 시 얼굴 인증", description = "키오스크에서 얼굴 인증을 했을 때 일치하는지 검증합니다.")
    @PostMapping(value = "/face-validation", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> validateFace(@RequestPart("info") String infoJson, @RequestPart("compface") MultipartFile compface) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            // 깨지지 않도록 ISO-8859-1 → UTF-8 변환
            // String utf8Json = new String(infoJson.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
            MemberRequestDto.ValidateFace validateFace = objectMapper.readValue(infoJson, MemberRequestDto.ValidateFace.class);

            Boolean res = memberService.validateFace(validateFace, compface);

            return responseDto.success(MemberResponseDto.PWDValidationInfo.builder()
                    .result(res)
                    .build());
        } catch (Exception e) {
            log.error("얼굴 인증 중 예외 발생", e);
            return responseDto.fail("얼굴 인증 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
