package com.pcarchu.platepay.bank.infrastructure;

import com.pcarchu.platepay.bank.domain.entity.Bank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BankRepositoryJpa extends JpaRepository<Bank, Long> {
    Optional<Bank> findByBankCode(String bankCode);
}
