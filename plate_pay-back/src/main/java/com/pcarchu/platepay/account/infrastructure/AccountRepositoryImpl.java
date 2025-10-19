package com.pcarchu.platepay.account.infrastructure;

import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.account.domain.repository.AccountRepository;
import com.pcarchu.platepay.account.dto.AccountResponseDto;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AccountRepositoryImpl implements AccountRepository {

    private final AccountRepositoryJpa accountRepositoryJpa;
    private final AccountRepositoryQuerydsl accountRepositoryQuerydsl;

    @Override
    public List<Account> findAllByMember_MemberUidAndStatusIsTrue(Long memberId) {
        return accountRepositoryJpa.findAllByMember_MemberUidAndStatusIsTrue(memberId);
    }

    @Override
    public Optional<Account> findByAccountUidAndMember_MemberUidAndStatusIsTrue(Long accountId, Long memberId) {
        return accountRepositoryJpa.findByAccountUidAndMember_MemberUidAndStatusIsTrue(accountId, memberId);
    }

    public Optional<Account> findByMember_MemberUidAndAccountNoAndStatusIsTrue(Long memberId, String accountNo) {
        return accountRepositoryJpa.findByMember_MemberUidAndAccountNoAndStatusIsTrue(memberId, accountNo);
    }

    public int countByMember_MemberUidAndStatusIsTrue(Long memberId) {
        return accountRepositoryJpa.countByMember_MemberUidAndStatusIsTrue(memberId);
    }

    public void save(Account account) {
        accountRepositoryJpa.save(account);
    }

    public void delete(Account account) {
        accountRepositoryJpa.delete(account);
    }


    public Optional<Account> findByMember_MemberUidAndIsMainTrueAndStatusIsTrue(Long memberId) {
        return accountRepositoryJpa.findByMember_MemberUidAndIsMainTrueAndStatusIsTrue(memberId);
    }

    @Override
    public List<AccountResponseDto.StoreTypeUsage> getTotalCostByStoreType(Long accountId, int year, int month ) {
        return accountRepositoryQuerydsl.getTotalCostByStoreType(accountId,year,month);
    }

    @Override
    public boolean existsById(Long id) {
        return accountRepositoryJpa.existsById(id);
    }

}
