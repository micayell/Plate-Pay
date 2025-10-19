package com.pcarchu.platepay.bank.infrastructure;

import com.pcarchu.platepay.bank.domain.entity.Bank;
import com.pcarchu.platepay.bank.domain.respository.BankRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class BankRepositoryImpl implements BankRepository {
    private final BankRepositoryJpa bankRepositoryJpa;

    @Override
    public Optional<Bank> findByBankCode(String bankCode) {
        return bankRepositoryJpa.findByBankCode(bankCode);
    }

}
