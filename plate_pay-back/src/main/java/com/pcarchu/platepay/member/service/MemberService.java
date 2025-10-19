package com.pcarchu.platepay.member.service;

import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.member.dto.MemberRequestDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

public interface MemberService {
    Optional<Member> getMemberById(Long memberId);
    Optional<Member> getByEmail(String email);
    Optional<Member> updateById(Long memberId, MemberRequestDto.UpdateMember updateMember);
    void withdraw(Long memberId);
    Optional<Member> toggleIsActive(Member member);
    Boolean validatePassword(MemberRequestDto.ValidatePayPassword validatePayPassword);
    Boolean validatePwd(Member member, MemberRequestDto.ValidatePwd validatePwd);
    Boolean uploadFace(Member member, MultipartFile faceimg);
    Boolean validateFace(MemberRequestDto.ValidateFace validateFace, MultipartFile compface);
}
