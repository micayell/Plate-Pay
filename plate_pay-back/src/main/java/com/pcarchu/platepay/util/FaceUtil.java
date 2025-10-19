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
public class FaceUtil {
    @Value("${face.api.url}")
    private String faceUrl;

    public String convertBase64(MultipartFile image) {
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
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            log.info("[convertBase64] ai 호출 시작");

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    faceUrl + "/api/v1/image/to-base64",
                    requestEntity,
                    Map.class
            );

            log.info("[convertBase64] ai 호출 완료");

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> result = response.getBody();
                return (String) result.get("base64_data");
            } else {
                log.error("convertBase64 failed: status={}, body={}", response.getStatusCode(), response.getBody());
                return null;
            }

        } catch (Exception e) {
            log.error("convertBase64 error occurred!", e);
            return null;
        }
    }

    public Boolean compareFace(MultipartFile image, String base64) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            // 파일 파트 헤더 생성
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

            log.info("[compareFace] 업로드 파일 이름 = {}", fileResource.getFilename());
            log.info("[compareFace] 업로드 파일 Content-Type = {}", ct);
            log.info("[compareFace] 업로드 파일 크기(byte) = {}", image.getSize());

            // base64 파트
            HttpHeaders base64Headers = new HttpHeaders();
            base64Headers.setContentType(MediaType.TEXT_PLAIN);
            HttpEntity<String> base64Part = new HttpEntity<>(base64, base64Headers);

            log.info("[compareFace] Base64 문자열 길이 = {}", (base64 != null ? base64.length() : 0));

            // 전체 multipart body
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);
            body.add("base64_text", base64Part);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            log.info("[compareFace] 요청 URL = {}", faceUrl + "/api/v1/face/compare");
            log.info("[compareFace] 요청 Content-Type = {}", headers.getContentType());

            // API 호출
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    faceUrl + "/api/v1/face/compare",
                    requestEntity,
                    Map.class
            );

            log.info("[compareFace] 응답 상태코드 = {}", response.getStatusCode());
            log.info("[compareFace] 응답 바디 = {}", response.getBody());

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> result = response.getBody();

                // 응답 로그 확인
                log.info("[compareFace] result map = {}", result);

                // 서버에서 내려주는 키 이름에 맞게 가져오기
                Object samePerson = result.get("is_same_person");
                log.info("[compareFace] is_same_person 값 = {}", samePerson);

                return samePerson != null && Boolean.parseBoolean(samePerson.toString());
            } else {
                log.error("compareFace failed: status={}, body={}",
                        response.getStatusCode(), response.getBody());
                return false;
            }

        } catch (Exception e) {
            log.error("compareFace error occurred!", e);
            return false;
        }
    }

}
