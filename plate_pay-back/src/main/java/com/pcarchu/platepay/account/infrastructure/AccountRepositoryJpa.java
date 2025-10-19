package com.pcarchu.platepay.account.infrastructure;

import com.pcarchu.platepay.account.domain.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRepositoryJpa extends JpaRepository<Account, Long> {
    List<Account> findAllByMember_MemberUidAndStatusIsTrue(Long memberMemberUid);
    Optional<Account> findByAccountUidAndMember_MemberUidAndStatusIsTrue(Long accountId, Long memberId);
    Optional<Account> findByMember_MemberUidAndAccountNoAndStatusIsTrue(Long memberId, String accountNo);
    int countByMember_MemberUidAndStatusIsTrue(Long memberId);
    Optional<Account> findByMember_MemberUidAndIsMainTrueAndStatusIsTrue(Long memberId);
}
