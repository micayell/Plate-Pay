package com.pcarchu.platepay.member.infrastructure;

import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.member.domain.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class MemberRepositoryImpl implements MemberRepository {

    private final MemberRepositoryJpa memberRepositoryJpa;

    @Override
    public Optional<Member> save(Member member) {
        return Optional.ofNullable(memberRepositoryJpa.save(member));
    }
    @Override
    public Optional<Member> findByEmail(String email) {
        return memberRepositoryJpa.findByEmail(email).stream().findFirst();
    }

    @Override
    public Optional<Member> findByEmailAndLoginType(String email, String loginType) {
        return memberRepositoryJpa.findByEmailAndLoginType(email, loginType);
    }

    @Override
    public Optional<Member> findByMemberUid(Long memberId) {
        return memberRepositoryJpa.findById(memberId);
    }

    @Override
    public void delete(Member member) {
        memberRepositoryJpa.delete(member);
    }
}
