package com.pcarchu.platepay.member.infrastructure;

import com.pcarchu.platepay.member.domain.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepositoryJpa extends JpaRepository<Member, Long> {
    Optional<Member> findByEmail(String email);
    Optional<Member> findByEmailAndLoginType(String email, String loginType);
}
