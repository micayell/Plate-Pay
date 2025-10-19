package com.pcarchu.platepay.account.service;

import com.pcarchu.platepay.account.dto.AccountResponseDto;
import com.pcarchu.platepay.member.domain.entity.Member;

import java.util.List;

public interface AccountService {

    List<AccountResponseDto.AccountInfo> getAccounts(Member loginMember);
    void setMainAccount(Member loginMember, Long accountId);
    void deleteAccount(Member loginMember, Long accountId);
    void setAccountName(Member loginMember, Long accountId, String newName);
    void registerAccountRequest(Member loginMember, String accountNo);
    void verifyAccountRequest(Member loginMember, String accountNo, String authCode, String accountName);
    List<AccountResponseDto.StoreTypeUsage> getAccountUsageStats(Member loginMember, Long accountId, int year, int month);
}
