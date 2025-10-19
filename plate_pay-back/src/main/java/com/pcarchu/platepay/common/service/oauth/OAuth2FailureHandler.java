package com.pcarchu.platepay.common.service.oauth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ApiResponse<T>(boolean success, T data, String message, String code) {
        public static <T> ApiResponse<T> ok(T data)   { return new ApiResponse<>(true, data, null, null); }
        public static <T> ApiResponse<T> fail(String code, String msg) { return new ApiResponse<>(false, null, msg, code); }
    }

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {

        String code = "OAUTH2_LOGIN_FAILED";
        String message = exception.getMessage();

        if (exception instanceof org.springframework.security.oauth2.core.OAuth2AuthenticationException oae) {
            if (oae.getError() != null) {
                code = Optional.ofNullable(oae.getError().getErrorCode()).orElse(code);
                message = Optional.ofNullable(oae.getError().getDescription()).orElse(message);
            }
        }

        log.warn("OAuth2 login failure. code={}, message={}", code, message);

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        objectMapper.writeValue(response.getWriter(), ApiResponse.fail(code, message));
    }

    private String escapeJson(String input) {
        return input == null ? "" : input.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
