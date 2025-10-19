package com.pcarchu.platepay.member.domain.repository;

import com.pcarchu.platepay.member.domain.entity.Member;

import java.util.Optional;

public interface MemberRepository {
    Optional<Member> save(Member member);
    Optional<Member> findByEmail(String email);
    Optional<Member> findByMemberUid(Long memberId);
    Optional<Member> findByEmailAndLoginType(String email, String loginType);
    void delete(Member member);
    // Optional<Member> updateByMemberUid(Long memberId, MemberRequestDto.UpdateMember newMember);
}
