package com.pcarchu.platepay.member.repository;

import com.pcarchu.platepay.member.domain.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository {
    Optional<Member> findByEmail(String email);
    Optional<Member> save(Member member);
    Optional<Member> findByMemberUid(Long memberId);
    void delete(Member member);
}
