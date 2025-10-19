package com.pcarchu.platepay.common.service.oauth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcarchu.platepay.token.dto.TokenResponseDto;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.member.dto.MemberResponseDto;
import com.pcarchu.platepay.security.dto.CustomOAuth2User;
import com.pcarchu.platepay.security.provider.TokenProvider;
import com.pcarchu.platepay.token.service.RefreshTokenService;
import io.micrometer.common.util.StringUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final RefreshTokenService refreshTokenService;
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
        Member member = null;
        try {
            CustomOAuth2User customUser = (CustomOAuth2User) authentication.getPrincipal();
            member = customUser.getMember();
        } catch (OAuth2AuthenticationException e) {
            new ObjectMapper().writeValue(response.getWriter(), ApiResponse.fail(e.getMessage()));

            return;
        }

        TokenResponseDto.TokenInfo tokenInfo = tokenProvider.generateOAuthTokens(member);

        tokenInfo.setMemberInfo(MemberResponseDto.MemberInfo.builder()
                .memberUid(member.getMemberUid())
                .name(member.getName())
                .nickname(member.getNickname())
                .email(member.getEmail())
                .phoneNum(member.getPhoneNum())
                .loginType(member.getLoginType())
                .isActive(member.getIsActive())
                .build());

        // refresh token 저장
        refreshTokenService.writeTokenInfo(member.getEmail(), member.getLoginType(), tokenInfo.getAccessToken(), tokenInfo.getRefreshToken());

        if (tokenInfo == null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            new ObjectMapper().writeValue(response.getWriter(), ApiResponse.fail("login failed."));

            return;
        }

        if (StringUtils.isEmpty(member.getName()) || StringUtils.isEmpty(member.getNickname())) {
            // 처음 회원가입 했을 경우
            tokenInfo.setStatusCode(201);
            response.setStatus(HttpServletResponse.SC_CREATED);
        } else {
            tokenInfo.setStatusCode(200);
            response.setStatus(HttpServletResponse.SC_OK);
        }

        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");

        new ObjectMapper().writeValue(response.getWriter(), ApiResponse.ok(tokenInfo));
    }
}
