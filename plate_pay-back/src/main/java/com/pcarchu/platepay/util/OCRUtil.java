package com.pcarchu.platepay.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Slf4j
@Component
public class OCRUtil {
    @Value("${ocr.api.url}")
    private String ocrUrl;

    public Map<String, Object> processOCR(MultipartFile image) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders fileHeaders = new HttpHeaders();
            String ct = (image.getContentType() != null) ? image.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
            fileHeaders.setContentType(MediaType.parseMediaType(ct));

            fileHeaders.setContentDisposition(ContentDisposition
                    .builder("form-data")
                    .name("file")
                    .filename((image.getOriginalFilename() != null) ? image.getOriginalFilename() : "upload")
                    .build());

            ByteArrayResource fileResource = new ByteArrayResource(image.getBytes()) {
                @Override
                public String getFilename() {
                    return (image.getOriginalFilename() != null) ? image.getOriginalFilename() : "upload";
                }
            };
            HttpEntity<Resource> filePart = new HttpEntity<>(fileResource, fileHeaders);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA); // boundary는 자동으로 붙습니다.

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(ocrUrl + "/api/v1/ocr/license-plate", requestEntity, Map.class);
            return (Map<String, Object>) response.getBody();

        } catch (Exception e) {
            log.error("enterOCR error occurred!");
            return null;
        }
    }

}
