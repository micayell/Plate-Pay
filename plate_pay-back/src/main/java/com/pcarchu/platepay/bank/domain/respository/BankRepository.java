package com.pcarchu.platepay.bank.domain.respository;

import com.pcarchu.platepay.bank.domain.entity.Bank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BankRepository {
    Optional<Bank> findByBankCode(String bankCode);
}
