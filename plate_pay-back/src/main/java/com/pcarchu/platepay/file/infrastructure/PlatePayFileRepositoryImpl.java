package com.pcarchu.platepay.file.infrastructure;

import com.pcarchu.platepay.file.domain.entity.PlatePayFile;
import com.pcarchu.platepay.file.domain.repository.PlatePayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class PlatePayFileRepositoryImpl implements PlatePayRepository {

    private final PlatePayFileRepositoryJpa platePayFileRepositoryJpa;

    @Override
    public Optional<PlatePayFile> save(PlatePayFile file) {
        return Optional.ofNullable(platePayFileRepositoryJpa.save(file));
    }

    @Override
    public Optional<PlatePayFile> findOneByNameAndType(String name, String type) {
        return platePayFileRepositoryJpa.findOneByNameAndType(name, type);
    }
}
