package com.pcarchu.platepay.file.domain.repository;

import com.pcarchu.platepay.file.domain.entity.PlatePayFile;

import java.util.Optional;

public interface PlatePayRepository {
    Optional<PlatePayFile> save(PlatePayFile file);
    Optional<PlatePayFile> findOneByNameAndType(String name, String type);
}
