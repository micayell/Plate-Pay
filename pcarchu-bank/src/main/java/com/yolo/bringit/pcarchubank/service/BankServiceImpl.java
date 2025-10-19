package com.yolo.bringit.pcarchubank.service;

import com.yolo.bringit.pcarchubank.dto.BankResponseDto;
import com.yolo.bringit.pcarchubank.util.BankUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BankServiceImpl implements BankService {

    private final BankUtil bankUtil;

    @Override
    public BankResponseDto.createAccountResponse createAccount(String userKey) {
        return bankUtil.createAccount(userKey);
    }

    @Override
    public List<BankResponseDto.getAccountSResponse> getAccounts(String userKey) {
        return bankUtil.getAccounts(userKey);
    }

    @Override
    public List<BankResponseDto.getHistoriesResponse> getHistories(String userKey, String accountNo) {
        return bankUtil.getHistories(userKey, accountNo);
    }
}
