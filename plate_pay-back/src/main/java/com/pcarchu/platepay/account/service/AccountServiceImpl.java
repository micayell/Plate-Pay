package com.pcarchu.platepay.account.service;

import com.google.gson.JsonObject;
import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.account.dto.AccountResponseDto;
import com.pcarchu.platepay.account.domain.repository.AccountRepository;
import com.pcarchu.platepay.bank.domain.entity.Bank;
import com.pcarchu.platepay.bank.domain.respository.BankRepository;
import com.pcarchu.platepay.inOutHistory.domain.repository.InOutHistoryRepository;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryResponseDto;
import com.pcarchu.platepay.util.SsafyUtil;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Slf4j
@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final SsafyUtil ssafyUtil;
    private final BankRepository bankRepository;
    private final InOutHistoryRepository inOutHistoryRepository;

    /**
     * 로그인한 사용자의 계좌 목록 조회
     */
    public List<AccountResponseDto.AccountInfo> getAccounts(Member loginMember) {
        // memberUid 기준으로 계좌 목록 조회
        List<Account> accounts = accountRepository.findAllByMember_MemberUidAndStatusIsTrue(loginMember.getMemberUid());

        return accounts.stream()
                .map(account -> AccountResponseDto.AccountInfo.builder()
                        .accountId(account.getAccountUid())
                        .bankName(account.getBank().getBankName())
                        .accountName(account.getAccountName())
                        .accountNo(account.getAccountNo())
                        .isMain(account.getIsMain())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 주 계좌 변경
     */
    @Transactional
    public void setMainAccount(Member loginMember, Long accountId) {
        Long memberUid = loginMember.getMemberUid();

        List<Account> accounts = accountRepository.findAllByMember_MemberUidAndStatusIsTrue(memberUid);

        accounts.forEach(acc -> {
            if (acc.getIsMain()) {
                acc.toggleIsMain(false);
            }
        });

        Account targetAccount = accountRepository.findByAccountUidAndMember_MemberUidAndStatusIsTrue(accountId, memberUid)
                .orElseThrow(() -> new IllegalArgumentException("해당 계좌가 존재하지 않거나 본인 계좌가 아닙니다."));

        targetAccount.toggleIsMain(true);

    }

    /**
     * 주 계좌 삭제
     */
    @Transactional
    public void deleteAccount(Member loginMember, Long accountId) {
        Long memberUid = loginMember.getMemberUid();

        Account account = accountRepository.findByAccountUidAndMember_MemberUidAndStatusIsTrue(accountId, memberUid)
                .orElseThrow(() -> new IllegalArgumentException("해당 계좌가 존재하지 않거나 본인 계좌가 아닙니다."));

        if (inOutHistoryRepository.existsByAccountAndOutTimeIsNull(account)) {
            throw new IllegalStateException("출차하지 않은 주차 내역이 있어 계좌를 삭제할 수 없습니다.");
        }

        account.deactivate();
    }

    /**
     * 계좌 이름 변경
     */
    @Transactional
    public void setAccountName(Member loginMember, Long accountId, String newName) {
        Long memberUid = loginMember.getMemberUid();

        Account targetAccount = accountRepository.findByAccountUidAndMember_MemberUidAndStatusIsTrue(accountId, memberUid)
                .orElseThrow(() -> new IllegalArgumentException("해당 계좌가 존재하지 않거나 본인 계좌가 아닙니다."));

        targetAccount.changeName(newName);

    }

    /**
     * 계좌 등록 요청
     */
    public void registerAccountRequest(Member loginMember, String accountNo) {
        int accountCount = accountRepository.countByMember_MemberUidAndStatusIsTrue(loginMember.getMemberUid());
        if (accountCount >= 3) {
            throw new IllegalStateException("계좌는 최대 3개까지만 등록할 수 있습니다.");
        }

        Optional<Account> existingAccount = accountRepository.findByMember_MemberUidAndAccountNoAndStatusIsTrue(loginMember.getMemberUid(), accountNo);
        if (existingAccount.isPresent()) {
            throw new IllegalArgumentException("이미 등록된 계좌입니다.");
        }

        JsonObject rec = ssafyUtil.inquireAccountHolder(loginMember.getUserKey(), accountNo);
        if (rec == null) {
            throw new IllegalArgumentException("계좌 정보를 불러오지 못했습니다.");
        }

        String holderName = rec.get("userName").getAsString();
        String expected = loginMember.getEmail().split("@")[0];

        if (holderName == null || !holderName.equals(expected)) {
            throw new IllegalArgumentException("정보가 일치하지 않습니다. 계좌번호를 다시 확인해주세요.");
        }

        boolean transferOk = ssafyUtil.requestOneWonTransfer(loginMember.getUserKey(), accountNo);
        if (!transferOk) {
            throw new IllegalStateException("1원 송금 요청 실패");
        }
    }

    /**
     * 1원 검증 요청
     */
    public void verifyAccountRequest(Member loginMember, String accountNo, String authCode, String accountName) {
        boolean verifyOk = ssafyUtil.verifyOneWonCode(loginMember.getUserKey(), accountNo, authCode);

        if (!verifyOk) {
            throw new IllegalArgumentException("인증번호 불일치");
        }


        JsonObject rec = ssafyUtil.inquireAccountHolder(loginMember.getUserKey(), accountNo);
        if (rec == null) {
            throw new IllegalArgumentException("계좌 정보를 불러오지 못했습니다.");
        }

        String bankCode = rec.get("bankCode").getAsString();

        Bank bank = bankRepository.findByBankCode(bankCode)
                .orElseThrow(() -> new IllegalArgumentException("은행 정보가 없습니다."));

        boolean isMain = accountRepository.findAllByMember_MemberUidAndStatusIsTrue(loginMember.getMemberUid()).isEmpty();

        Account account = Account.builder()
                .member(loginMember)
                .bank(bank)
                .accountNo(accountNo)
                .accountName(accountName)
                .isMain(isMain)
                .status(true)
                .build();
        accountRepository.save(account);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountResponseDto.StoreTypeUsage> getAccountUsageStats(Member loginMember, Long accountId, int year, int month) {
        // 계좌 소유자 검증 + 존재 확인
        // accountRepository.findByAccountUidAndMember_MemberUid(accountId, loginMember.getMemberUid())
        //     .orElseThrow(() -> new EntityNotFoundException("해당 계좌가 존재하지 않거나, 접근 권한이 없습니다."));

        // QueryDsl 통계 조회
        return accountRepository.getTotalCostByStoreType(accountId, year, month);
    }
}