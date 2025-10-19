package com.yolo.bringit.pcarchubank.service;

import com.yolo.bringit.pcarchubank.dto.BankResponseDto;

import java.util.List;

public interface BankService {
    BankResponseDto.createAccountResponse createAccount(String userKey);
    List<BankResponseDto.getAccountSResponse> getAccounts(String userKey);
    List<BankResponseDto.getHistoriesResponse> getHistories(String userKey, String accountNo);
}
