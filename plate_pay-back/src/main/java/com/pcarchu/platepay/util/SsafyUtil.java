package com.pcarchu.platepay.util;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.time.ZoneId;


@Slf4j
@Component
public class SsafyUtil {
    @Value("${ssafy.api.url}")
    private String ssafyUrl;
    @Value("${ssafy.api.key}")
    private String key;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE8 = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter TIME6 = DateTimeFormatter.ofPattern("HHmmss");
    private static final DateTimeFormatter DT14  = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private Map<String, Object> buildHeader(String apiName, String apiServiceCode, String userKey) {
        ZonedDateTime now = ZonedDateTime.now(KST);

        Map<String, Object> header = new HashMap<>();
        header.put("apiName", apiName);
        header.put("transmissionDate", now.format(DATE8));
        header.put("transmissionTime", now.format(TIME6));
        header.put("institutionCode", "00100");
        header.put("fintechAppNo", "001");
        header.put("apiServiceCode", apiServiceCode);
        String institutionTransactionUniqueNo = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"))
                + String.format("%03d", new Random().nextInt(1000));
        header.put("institutionTransactionUniqueNo", institutionTransactionUniqueNo);
        header.put("apiKey", key);
        header.put("userKey", userKey);
        return header;
    }

    public Map<String, String> createAccount(String userId) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("apiKey", key);
            requestBody.put("userId", userId);

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);
            UriComponents uriComponents = UriComponentsBuilder.fromHttpUrl(ssafyUrl+"/ssafy/api/v1/member")
                                    .build()
                                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(
                    uriComponents.toUri(),
                    httpEntity,
                    String.class
            );

            HashMap<String, String> map = new HashMap<>();
            if (response.getStatusCode().value() == 201) {
                JsonParser jsonParser = new JsonParser();

                JsonObject body = (JsonObject) jsonParser.parse(response.getBody());
                map.put("userKey", body.get("userKey").getAsString());
            }

            return map;
        } catch (Exception e) {
            log.error("createAccount error occurred!");
            return null;
        }
    }

    public Map<String, String> searchAccount(String userId) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("apiKey", key);
            requestBody.put("userId", userId);

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);
            UriComponents uriComponents = UriComponentsBuilder.fromHttpUrl(ssafyUrl+"/ssafy/api/v1/member/search")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(
                    uriComponents.toUri(),
                    httpEntity,
                    String.class
            );

            HashMap<String, String> map = new HashMap<>();
            if (response.getStatusCode().value() == 201) {
                JsonParser jsonParser = new JsonParser();

                JsonObject body = (JsonObject) jsonParser.parse(response.getBody());
                map.put("userKey", body.get("userKey").getAsString());
            }

            return map;
        } catch (Exception e) {
            log.error("searchAccount error occurred!");
            return null;
        }
    }

    public JsonObject inquireAccountHolder(String userKey, String accountNo) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "inquireDemandDepositAccountHolderName",
                    "inquireDemandDepositAccountHolderName",
                    userKey));
            requestBody.put("accountNo", accountNo);

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);

            UriComponents uri = UriComponentsBuilder.fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/demandDeposit/inquireDemandDepositAccountHolderName")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonObject body = JsonParser.parseString(response.getBody()).getAsJsonObject();
                return body.getAsJsonObject("REC");
            }
        } catch (Exception e) {
            log.error("inquireAccountHolderName error: {}", e.getMessage());
        }
        return null;
    }

    public boolean requestOneWonTransfer(String userKey, String accountNo) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "openAccountAuth",
                    "openAccountAuth",
                    userKey));
            requestBody.put("accountNo", accountNo);
            requestBody.put("authText", "PlatePay");

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);
            UriComponents uri = UriComponentsBuilder.fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/accountAuth/openAccountAuth")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("requestOneWonTransfer error: {}", e.getMessage());
            return false;
        }
    }

    public boolean verifyOneWonCode(String userKey, String accountNo, String authCode) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "checkAuthCode",
                    "checkAuthCode",
                    userKey));
            requestBody.put("accountNo", accountNo);
            requestBody.put("authText", "PlatePay");
            requestBody.put("authCode", authCode);

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);
            UriComponents uri = UriComponentsBuilder.fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/accountAuth/checkAuthCode")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("verifyOneWonCode error: {}", e.getMessage());
            return false;
        }
    }

    public JsonObject inquireAccountBalance(String userKey, String accountNo) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "inquireDemandDepositAccountBalance",
                    "inquireDemandDepositAccountBalance",
                    userKey));
            requestBody.put("accountNo", accountNo);

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);
            UriComponents uri = UriComponentsBuilder.fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/demandDeposit/inquireDemandDepositAccountBalance")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonObject body = JsonParser.parseString(response.getBody()).getAsJsonObject();
                return body.getAsJsonObject("REC");
            }

        } catch (Exception e) {
            log.error("inquireAccountBalance error: {}", e.getMessage());
        }
        return null;
    }

    public JsonObject updateDemandDepositAccountWithdrawal(String userKey, String accountNo, Integer amount, String transactionSummary) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "updateDemandDepositAccountWithdrawal",
                    "updateDemandDepositAccountWithdrawal",
                    userKey));
            requestBody.put("accountNo", accountNo);
            requestBody.put("transactionBalance", String.valueOf(amount));
            requestBody.put("transactionSummary", transactionSummary);

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);
            UriComponents uri = UriComponentsBuilder.fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/demandDeposit/updateDemandDepositAccountWithdrawal")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonObject body = JsonParser.parseString(response.getBody()).getAsJsonObject();
                return body.getAsJsonObject("REC");
            }

        } catch (Exception e) {
            log.error("updateDemandDepositAccountWithdrawal error: {}", e.getMessage());
        }

        return null;
    }

}
