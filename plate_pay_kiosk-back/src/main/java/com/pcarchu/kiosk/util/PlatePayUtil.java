package com.pcarchu.kiosk.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcarchu.kiosk.dto.KioskRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class PlatePayUtil {

    @Value("${platepay.api.url}")
    private String platePayUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getParkingInfo(Long parkingLotId, String plateNum) {
        try {
            log.info("[getParkingInfo] 호출 시작 - parkingLotId: {}, plateNum: {}", parkingLotId, plateNum);

            UriComponents uri = UriComponentsBuilder
                    .fromHttpUrl(platePayUrl + "/api/v1/parking/{parkingLotId}/{plateNum}")
                    .buildAndExpand(parkingLotId, plateNum)
                    .encode();

            ResponseEntity<String> response = restTemplate.getForEntity(uri.toUri(), String.class);

            log.info("[getParkingInfo] 응답 상태코드 = {}", response.getStatusCode());

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[getParkingInfo] 성공 - 응답 바디 길이 = {}", response.getBody() != null ? response.getBody().length() : 0);
                return response.getBody();
            } else {
                log.error("getParkingInfo failed: status {}", response.getStatusCode());
                return null;
            }
        } catch (Exception e) {
            log.error("getParkingInfo error: {}", e.getMessage());
            return null;
        }
    }

    public boolean validatePayPassword(String plateNum, Long storeId, String password) {
        try {
            log.info("[validatePayPassword] 호출 시작 - plateNum: {}, storeId: {}, password: {}", plateNum, storeId, password);
            UriComponents uri = UriComponentsBuilder
                    .fromHttpUrl(platePayUrl + "/api/v1/members/password-validation")
                    .build()
                    .encode();

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("plateNum", plateNum);
            requestBody.put("storeId", storeId);
            requestBody.put("password", password);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            log.info("[validatePayPassword] 응답 상태코드 = {}", response.getStatusCode());
            log.info("[validatePayPassword] 응답 바디 = {}", response.getBody());

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(response.getBody());
                return root.path("data").path("result").asBoolean(false); // result 없으면 기본 false
            }
            return false;
        } catch (Exception e) {
            log.error("validatePayPassword error: {}", e.getMessage(), e);
            return false;
        }
    }

    public boolean compareFace(String plateNum, Long storeId, MultipartFile compface) {
        try {
            log.info("[compareFace] 호출 시작 - plateNum: {}", plateNum);

            UriComponents uri = UriComponentsBuilder
                    .fromHttpUrl(platePayUrl + "/api/v1/members/face-validation")
                    .build()
                    .encode();

            KioskRequestDto.ValidateFace validateFace = KioskRequestDto.ValidateFace.builder()
                    .plateNum(plateNum)
                    .storeId(storeId)
                    .build();

            ObjectMapper objectMapper = new ObjectMapper();
            String jsonInfo = objectMapper.writeValueAsString(validateFace);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("info", jsonInfo);
            body.add("compface", new MultipartInputStreamFileResource(
                    compface.getInputStream(), compface.getOriginalFilename()
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), requestEntity, String.class);

            log.info("[compareFace] 응답 상태코드 = {}", response.getStatusCode());
            log.info("[compareFace] 응답 바디 = {}", response.getBody());

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(response.getBody());

                boolean result = root.path("data").path("result").asBoolean(false);
                log.info("[compareFace] data.result 값 = {}", result);

                return result;
            } else {
                return false;
            }
        } catch (Exception e) {
            log.error("compareFace error: {}", e.getMessage(), e);
            return false;
        }
    }



    public boolean orderMenu(Long storeId, String plateNum, Integer cost) {
        log.info("[orderMenu] 호출 시작 - plateNum: {}, storeId: {}, cost: {} ", plateNum, storeId, cost);

        try {
            UriComponents uri = UriComponentsBuilder
                    .fromHttpUrl(platePayUrl + "/api/v1/order-histories")
                    .build()
                    .encode();

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("storeId", storeId);
            requestBody.put("plateNum", plateNum);
            requestBody.put("cost", cost);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            log.info("[orderMenu] 응답 상태코드 = {}", response.getStatusCode());

            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("orderMenu error: {}", e.getMessage());
            return false;
        }
    }

}
