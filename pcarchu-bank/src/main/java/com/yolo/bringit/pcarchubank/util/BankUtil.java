package com.yolo.bringit.pcarchubank.util;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.yolo.bringit.pcarchubank.dto.member.MemberResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;
import com.yolo.bringit.pcarchubank.dto.BankResponseDto;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Component
public class BankUtil {

    @Value("${ssafy.api.url}")
    private String ssafyUrl;
    @Value("${ssafy.api.key}")
    private String key;
    @Value("${platepay.api.url}")
    private String platepayUrl;

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

    public BankResponseDto.createAccountResponse createAccount(String userKey) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "createDemandDepositAccount",
                    "createDemandDepositAccount",
                    userKey));
            requestBody.put("accountTypeUniqueNo", "999-1-c0d8d60a7d794d");

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);

            UriComponents uri = UriComponentsBuilder.fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/demandDeposit/createDemandDepositAccount")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonObject body = JsonParser.parseString(response.getBody()).getAsJsonObject();
                JsonObject rec = body.getAsJsonObject("REC");

                String accountNo = rec.get("accountNo").getAsString();
                depositInitialBalance(userKey, accountNo, "1000000");

                return BankResponseDto.createAccountResponse.builder()
                        .accountNo(accountNo)
                        .build();
            }
        } catch (Exception e) {
            log.error("createAccount error: {}", e.getMessage());
        }
        return null;
    }

    public List<BankResponseDto.getAccountSResponse> getAccounts(String userKey) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "inquireDemandDepositAccountList",
                    "inquireDemandDepositAccountList",
                    userKey));

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);

            UriComponents uri = UriComponentsBuilder.fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/demandDeposit/inquireDemandDepositAccountList")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonObject body = JsonParser.parseString(response.getBody()).getAsJsonObject();
                JsonArray recArray = body.getAsJsonArray("REC");

                List<BankResponseDto.getAccountSResponse> result = new ArrayList<>();
                for (JsonElement elem : recArray) {
                    JsonObject rec = elem.getAsJsonObject();

                    String bankName = rec.get("bankName").getAsString();
                    String accountNo = rec.get("accountNo").getAsString();
                    String accountBalance = rec.get("accountBalance").getAsString();

                    result.add(BankResponseDto.getAccountSResponse.builder()
                            .bankName(bankName)
                            .accountNo(accountNo)
                            .accountBalance(accountBalance)
                            .build());
                }
                return result;
            }
        } catch (Exception e) {
            log.error("createAccount error: {}", e.getMessage());
        }
        return null;
    }

    private void depositInitialBalance(String userKey, String AccountNo, String amount) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "updateDemandDepositAccountDeposit",
                    "updateDemandDepositAccountDeposit",
                    userKey));
            requestBody.put("accountNo", AccountNo);
            requestBody.put("transactionBalance", amount);
            requestBody.put("transactionSummary", "(수시입출금) : 입금");

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);

            UriComponents uri = UriComponentsBuilder
                    .fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/demandDeposit/updateDemandDepositAccountDeposit")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("초기 입금 {}원 성공 (계좌번호: {})", amount, AccountNo);
            } else {
                log.error("초기 입금 실패 - status: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("depositInitialBalance error: {}", e.getMessage());
        }
    }

    public List<BankResponseDto.getHistoriesResponse> getHistories(String userKey, String accountNo) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ZonedDateTime now = ZonedDateTime.now(KST);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Header", buildHeader(
                    "inquireTransactionHistoryList",
                    "inquireTransactionHistoryList",
                    userKey));
            requestBody.put("accountNo", accountNo);
            requestBody.put("startDate", now.format(DATE8));
            requestBody.put("endDate", now.format(DATE8));
            requestBody.put("transactionType", "A");
            requestBody.put("orderByType", "ASC");

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);

            UriComponents uri = UriComponentsBuilder
                    .fromHttpUrl(ssafyUrl + "/ssafy/api/v1/edu/demandDeposit/inquireTransactionHistoryList")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(uri.toUri(), httpEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonObject body = JsonParser.parseString(response.getBody()).getAsJsonObject();
                JsonObject recObj = body.getAsJsonObject("REC");
                JsonArray listArray = recObj.getAsJsonArray("list");

                List<BankResponseDto.getHistoriesResponse> result = new ArrayList<>();
                for (JsonElement elem : listArray) {
                    JsonObject item = elem.getAsJsonObject();

                    String transactionDate = item.get("transactionDate").getAsString();
                    String transactionTime = item.get("transactionTime").getAsString();
                    String transactionBalance = item.get("transactionBalance").getAsString();
                    String transactionAfterBalance = item.get("transactionAfterBalance").getAsString();
                    String transactionSummary = item.get("transactionSummary").getAsString();

                    result.add(BankResponseDto.getHistoriesResponse.builder()
                            .transactionDate(transactionDate)
                            .transactionTime(transactionTime)
                            .transactionBalance(transactionBalance)
                            .transactionAfterBalance(transactionAfterBalance)
                            .transactionSummary(transactionSummary)
                            .build());
                }
                return result;
            }
        } catch (Exception e) {
            log.error("getHistories error: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    public MemberResponseDto.MemberInfo getMemberByEmail(String email) {
        RestTemplate restTemplate = new RestTemplate();
        try {
            UriComponents uri = UriComponentsBuilder
                    .fromHttpUrl(platepayUrl + "/api/v1/members/bank")
                    .queryParam("email", email)
                    .build()
                    .encode();

            ResponseEntity<BankResponseDto.PlatepayResponse<MemberResponseDto.MemberInfo>> response =
                    restTemplate.exchange(
                            uri.toUri(),
                            HttpMethod.GET,
                            null,
                            new ParameterizedTypeReference<BankResponseDto.PlatepayResponse<MemberResponseDto.MemberInfo>>() {}
                    );


            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                BankResponseDto.PlatepayResponse<MemberResponseDto.MemberInfo> body = response.getBody();

                if (body.getData() != null) {
                    return body.getData();
                } else {
                    throw new RuntimeException("platepay 응답에 data가 없습니다.");
                }
            } else {
                throw new RuntimeException("platepay 응답 실패 - status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("getMemberByEmail error: {}", e.getMessage());
            throw new RuntimeException("platepay 회원 조회 실패", e);
        }
    }
}
