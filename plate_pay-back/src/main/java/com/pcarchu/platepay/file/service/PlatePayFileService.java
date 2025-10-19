package com.pcarchu.platepay.file.service;

import com.pcarchu.platepay.file.domain.entity.PlatePayFile;

import java.util.Optional;

public interface PlatePayFileService {
    Optional<PlatePayFile> createFile(PlatePayFile file);
    Optional<PlatePayFile> getFileByNameAndType(String name, String type);
}
