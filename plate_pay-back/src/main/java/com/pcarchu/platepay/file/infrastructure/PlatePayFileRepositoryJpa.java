package com.pcarchu.platepay.file.infrastructure;

import com.pcarchu.platepay.file.domain.entity.PlatePayFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlatePayFileRepositoryJpa extends JpaRepository<PlatePayFile, Long> {
    Optional<PlatePayFile> findOneByNameAndType(String name, String type);
}
