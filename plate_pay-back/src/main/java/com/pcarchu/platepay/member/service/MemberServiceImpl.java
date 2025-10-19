package com.pcarchu.platepay.member.service;

import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.car.domain.repository.CarRepository;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.member.domain.repository.MemberRepository;
import com.pcarchu.platepay.member.dto.MemberRequestDto;
import com.pcarchu.platepay.store.domain.repository.StoreRepository;
import com.pcarchu.platepay.util.FaceUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.thymeleaf.util.StringUtils;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {
    private final MemberRepository memberRepository;
    private final CarRepository carRepository;
    private final StoreRepository storeRepository;
    private final FaceUtil faceUtil;

    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public Optional<Member> getMemberById(Long memberId) {
        return memberRepository.findByMemberUid(memberId);
    }

    @Override
    @Transactional
    public Optional<Member> getByEmail(String email) {
        return memberRepository.findByEmail(email);
    }

    @Override
    @Transactional
    public Optional<Member> updateById(Long memberId, MemberRequestDto.UpdateMember newMember) {
        return memberRepository.findByMemberUid(memberId)
                .map(member -> {
                    if (!StringUtils.isEmpty(newMember.getName()) && (member.getName() == null || (member.getName() != null && !member.getName().equals(newMember.getName())))) { // 이름 변경
                        member.changeName(newMember.getName());
                    }
                    if (!StringUtils.isEmpty(newMember.getNickname()) && (member.getNickname() == null || (member.getNickname() != null && !member.getNickname().equals(newMember.getNickname())))) { // 닉네임 변경
                        member.changeNickname(newMember.getNickname());
                    }
                    if (!StringUtils.isEmpty(newMember.getPhoneNum()) && (member.getPhoneNum() == null || (member.getPhoneNum() != null && !member.getPhoneNum().equals(newMember.getPhoneNum())))) { // 전화번호 변경
                        member.changePhoneNum(newMember.getPhoneNum());
                    }
                    if (!StringUtils.isEmpty(newMember.getPayPwd()) && (member.getPayPwd() == null || (member.getPayPwd() != null && !passwordEncoder.matches(newMember.getPayPwd(), member.getPayPwd())))) {
                        member.changePayPwd(
                                passwordEncoder.encode(newMember.getPayPwd())
                        );
                    }

                    memberRepository.save(member);
                    return member;
                });
    }

    @Override
    @Transactional
    public void withdraw(Long memberId) {
        Member member = memberRepository.findByMemberUid(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));

        memberRepository.delete(member);
    }

    @Override
    @Transactional
    public Optional<Member> toggleIsActive(Member member) {
        member.changeIsActive(!member.getIsActive());
        return memberRepository.save(member);
    }

    @Override
    @Transactional
    public Boolean validatePassword(MemberRequestDto.ValidatePayPassword validatePayPassword) {
        // storeId를 이용해 1차 검증
        log.info("유효 매장 검증");
        storeRepository.findById(validatePayPassword.getStoreId()).orElseThrow(
                () -> new RuntimeException("해당 제휴 매장이 존재하지 않습니다.")
        );

        log.info("유효 차량 검증");
        Car car = carRepository.findByPlateNum(validatePayPassword.getPlateNum()).orElseThrow(
                () -> new RuntimeException("차량이 존재하지 않습니다.")
        );

        log.info("비밀 번호 검증 {} : {}", validatePayPassword.getPassword(), car.getMember().getPayPwd());
        if (passwordEncoder.matches(validatePayPassword.getPassword(), car.getMember().getPayPwd())) {
            log.info("비밀번호 검증 성공");
            return true;
        }

        return false;
    }

    @Override
    @Transactional
    public Boolean validatePwd(Member member, MemberRequestDto.ValidatePwd validatePwd) {
        if (passwordEncoder.matches(validatePwd.getPassword(), member.getPayPwd())) {
            return true;
        }

        return false;
    }

    @Override
    public Boolean uploadFace(Member member, MultipartFile faceimg) {
        log.info("[uploadFace] service 호출 member = {}, faceimg = {}", member.getEmail(), faceimg);
        String base64  = faceUtil.convertBase64(faceimg);
        if (base64 == null || base64.isBlank()) {
            throw new IllegalStateException("이미지 변환 실패");
        }
        log.info("[uploadFace] convertBase64 완료 base64 = {}", base64);
        member.uploadFaceImg(base64);

        memberRepository.save(member);

        return true;
    }

    @Override
    @Transactional
    public Boolean validateFace(MemberRequestDto.ValidateFace validateFace, MultipartFile compface) {

        log.info("제휴 매장 확인");
        storeRepository.findById(validateFace.getStoreId()).orElseThrow(
                () -> new RuntimeException("해당 제휴 매장이 존재하지 않습니다.")
        );

        log.info("차량 확인 = {}",  validateFace.getPlateNum());
        Car car = carRepository.findByPlateNum(validateFace.getPlateNum()).orElseThrow(
                () -> new RuntimeException("차량이 존재하지 않습니다.")
        );

        Member member = car.getMember();
        if (member == null || member.getFaceImg() == null) {
            throw new RuntimeException("해당 차량 소유자의 얼굴 데이터가 존재하지 않습니다.");
        }

        log.info("얼굴 비교 시작");
        // faceImg 꺼내서 비교
        String base64 = member.getFaceImg();
        Boolean match = faceUtil.compareFace(compface, base64);

        return match;
    }

}
