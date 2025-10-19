package com.pcarchu.platepay.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.pcarchu.platepay.car.dto.CarRequestDto;
import com.pcarchu.platepay.car.dto.CarResponseDto;
import com.pcarchu.platepay.codefToken.domain.entity.CodefToken;
import com.pcarchu.platepay.member.domain.entity.Member;
import jakarta.json.Json;
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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class CodefUtil {

    @Value("${codef.api.url}")
    private String codefUrl;

    public Map<String, Object> publishToken(String clientId, String clientSecret) {
        BufferedReader br = null;
        try {
            // HTTP 요청을 위한 URL 오브젝트 생성
            URL url = new URL("https://oauth.codef.io/oauth/token");
            String params = "grant_type=client_credentials&scope=read";    // Oauth2.0 사용자 자격증명 방식(client_credentials) 토큰 요청 설정

            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("POST");
            con.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

            // 클라이언트아이디, 시크릿코드 Base64 인코딩
            String auth = clientId + ":" + clientSecret;
            String authStringEnc = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            String authHeader = "Basic " + authStringEnc;

            con.setRequestProperty("Authorization", authHeader);
            con.setDoInput(true);
            con.setDoOutput(true);

            // 리퀘스트 바디 전송
            OutputStream os = con.getOutputStream();
            os.write(params.getBytes());
            os.flush();
            os.close();

            // 응답 코드 확인
            int responseCode = con.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {    // 정상 응답
                br = new BufferedReader(new InputStreamReader(con.getInputStream()));
            } else {     // 에러 발생
                return null;
            }

            // 응답 바디 read
            String inputLine;
            StringBuffer responseStr = new StringBuffer();
            while ((inputLine = br.readLine()) != null) {
                responseStr.append(inputLine);
            }
            br.close();
            // 응답결과 URL Decoding(UTF-8)
            ObjectMapper mapper = new ObjectMapper();
            HashMap<String, Object> tokenMap = mapper.readValue(URLDecoder.decode(responseStr.toString(), "UTF-8"), new TypeReference<HashMap<String, Object>>(){});
            return tokenMap;
        } catch (Exception e) {
            return null;
        } finally {
            if(br != null) {
                try {
                    br.close();
                } catch (IOException e) { }
            }
        }
    }

    public Map<String, String> registerCarIssuance(CarRequestDto.RegisterCar registerCar, CarResponseDto.FirstPhaseInfo firstPhaseResult, Member member, CodefToken token, Integer phaseNo) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token.getAccessToken());

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("organization", "0001");
            requestBody.put("loginType", "5"); // 간편 로그인
            requestBody.put("userName", registerCar.getName()); // 이름
            requestBody.put("identity", registerCar.getSsn()); // 주민등록번호
            requestBody.put("birthDate", "");
            requestBody.put("certType", "1");
            requestBody.put("carNo", registerCar.getPlateNum()); // 번호판 번호
            requestBody.put("ownerName", registerCar.getName());
            requestBody.put("displyed", "0");
            requestBody.put("isIdentityViewYn", "1");
            requestBody.put("address", "");
            requestBody.put("identity2", "");
            requestBody.put("loginTypeLevel", "1");
            requestBody.put("phoneNo", member.getPhoneNum()); // 전화번호
            requestBody.put("telecom", "");
            requestBody.put("id", "");
            requestBody.put("originDataYN", "0");

            if (phaseNo == 2 && firstPhaseResult != null) {
                // 두번째 호출일 때 포함되는 파라미터
                requestBody.put("simpleAuth", "1");
                requestBody.put("is2Way", true);

                Map<String, Object> twoWayInfo = new HashMap<>();

                twoWayInfo.put("jobIndex", firstPhaseResult.getJobIndex());
                twoWayInfo.put("threadIndex", firstPhaseResult.getThreadIndex());
                twoWayInfo.put("jti", firstPhaseResult.getJti());
                twoWayInfo.put("twoWayTimestamp", firstPhaseResult.getTwoWayTimestamp());

                requestBody.put("twoWayInfo", twoWayInfo);
            }

            HttpEntity<?> httpEntity = new HttpEntity<>(requestBody, headers);
            UriComponents uriComponents = UriComponentsBuilder.fromHttpUrl(codefUrl+"/v1/kr/public/mw/car-registration-a/issuance")
                    .build()
                    .encode();

            ResponseEntity<String> response = restTemplate.postForEntity(
                    uriComponents.toUri(),
                    httpEntity,
                    String.class
            );

            HashMap<String, String> map = new HashMap<>();
            if (response.getStatusCode().value() == 200) {
                JsonParser jsonParser = new JsonParser();

                String decoded = URLDecoder.decode(response.getBody(), "UTF-8");
                JsonObject body = (JsonObject) jsonParser.parse(decoded);

                JsonObject result = (JsonObject) body.get("result");
                JsonObject data = (JsonObject) body.get("data");
                if (phaseNo == 1) { // 첫번째 단계
                    map.put("code", result.get("code").getAsString());
                    map.put("jobIndex", data.get("jobIndex").getAsString());
                    map.put("threadIndex", data.get("threadIndex").getAsString());
                    map.put("jti", data.get("jti").getAsString());
                    map.put("twoWayTimestamp", data.get("twoWayTimestamp").getAsString());
                } else if (phaseNo == 2) { // 두번째 단계
                    if (!result.get("code").getAsString().equals("CF-00000")) {
                        map.put("code", result.get("code").getAsString());
                        return map;
                    }

                    map.put("code", result.get("code").getAsString());
                    map.put("commCarName", data.get("commCarName").getAsString());
                    map.put("resCarYearModel", data.get("resCarYearModel").getAsString());
                }
            }

            return map;
        } catch (Exception e) {
            log.error("registerCarIssuance error occurred!");
            return null;
        }
    }
}
