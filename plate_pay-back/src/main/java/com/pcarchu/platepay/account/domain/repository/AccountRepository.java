package com.pcarchu.platepay.account.domain.repository;

import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.account.dto.AccountResponseDto;

import java.util.List;
import java.util.Optional;


public interface AccountRepository {
    List<Account> findAllByMember_MemberUidAndStatusIsTrue(Long memberId);
    Optional<Account> findByAccountUidAndMember_MemberUidAndStatusIsTrue(Long accountId, Long memberId);
    Optional<Account> findByMember_MemberUidAndAccountNoAndStatusIsTrue(Long memberId, String accountNo);
    int countByMember_MemberUidAndStatusIsTrue(Long memberId);
    void save(Account account);
    void delete(Account account);
    Optional<Account> findByMember_MemberUidAndIsMainTrueAndStatusIsTrue(Long memberId);
    List<AccountResponseDto.StoreTypeUsage> getTotalCostByStoreType(Long accountId, int year, int month);
    boolean existsById(Long id);

}
