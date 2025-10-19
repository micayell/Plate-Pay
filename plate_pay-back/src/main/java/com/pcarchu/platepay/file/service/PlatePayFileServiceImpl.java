package com.pcarchu.platepay.file.service;

import com.pcarchu.platepay.file.domain.entity.PlatePayFile;
import com.pcarchu.platepay.file.domain.repository.PlatePayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlatePayFileServiceImpl implements PlatePayFileService {
    private final PlatePayRepository platePayRepository;

    public Optional<PlatePayFile> createFile(PlatePayFile file) {
        return platePayRepository.save(file);
    }

    public Optional<PlatePayFile> getFileByNameAndType(String name, String type) {
        return platePayRepository.findOneByNameAndType(name, type);
    }
}
