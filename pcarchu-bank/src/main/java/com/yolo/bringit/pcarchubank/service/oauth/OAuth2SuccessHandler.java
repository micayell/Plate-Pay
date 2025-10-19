package com.yolo.bringit.pcarchubank.service.oauth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yolo.bringit.pcarchubank.dto.member.MemberResponseDto;
import com.yolo.bringit.pcarchubank.dto.token.TokenResponseDto;
import com.yolo.bringit.pcarchubank.security.dto.CustomOAuth2User;
import com.yolo.bringit.pcarchubank.security.provider.TokenProvider;
import io.micrometer.common.util.StringUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    @Value("${OAUTH_REDIRECT_HOST}")
    private String host;

    private final TokenProvider tokenProvider;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ApiResponse<T>(boolean success, T data, String message) {
        public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, data, null); }
        public static <T> ApiResponse<T> fail(String msg) { return new ApiResponse<>(false, null, msg); }
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        CustomOAuth2User customUser = (CustomOAuth2User) authentication.getPrincipal();
        MemberResponseDto.MemberInfo member = customUser.getMember();

        TokenResponseDto.TokenInfo tokenInfo = tokenProvider.generateOAuthTokens(member);

        tokenInfo.setMemberInfo(MemberResponseDto.MemberInfo.builder()
                .memberUid(member.getMemberUid())
                .name(member.getName())
                .nickname(member.getNickname())
                .email(member.getEmail())
                .phoneNum(member.getPhoneNum())
                .userKey(member.getUserKey())
                .userKey(member.getUserKey())
                .build());

        if (tokenInfo == null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            new ObjectMapper().writeValue(response.getWriter(), ApiResponse.fail("login failed."));

            return;
        }

        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from("access_token", tokenInfo.getAccessToken())
                .path("/")
                .httpOnly(true)
                .maxAge(7 * 24 * 60 * 60 * 1000);

        if (StringUtils.isEmpty(member.getName()) || StringUtils.isEmpty(member.getNickname())) {
            // 처음 회원가입 했을 경우
            tokenInfo.setStatusCode(201);
            response.setStatus(HttpServletResponse.SC_CREATED);
        } else {
            tokenInfo.setStatusCode(200);
            response.setStatus(HttpServletResponse.SC_OK);
        }

        ResponseCookie cookie = builder.build();
        response.addHeader("Set-Cookie", cookie.toString());

        response.sendRedirect(host + ":8080/banks/accounts");
    }
}
