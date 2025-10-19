package com.yolo.bringit.pcarchubank.security.filter;

import com.yolo.bringit.pcarchubank.dto.member.MemberResponseDto;
import com.yolo.bringit.pcarchubank.security.provider.TokenProvider;
import com.yolo.bringit.pcarchubank.util.BankUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Value("${OAUTH_REDIRECT_HOST}")
    private String host;

    private final TokenProvider tokenProvider;
    private final BankUtil bankUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = parseCookieToken(request);

            if (StringUtils.hasText(token) && !token.equalsIgnoreCase("null")) {
                if (tokenProvider.validateToken(token)) {
                    String email = tokenProvider.validateAndGetEmail(token);
                    MemberResponseDto.MemberInfo memberInfo = bankUtil.getMemberByEmail(email);

                    MemberResponseDto.MemberInfo member = MemberResponseDto.MemberInfo.builder()
                            .name(memberInfo.getName())
                            .nickname(memberInfo.getNickname())
                            .email(memberInfo.getEmail())
                            .phoneNum(memberInfo.getPhoneNum())
                            .userKey(memberInfo.getUserKey())
                            .build();

                    if (member != null) {
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(
                                        member,
                                        null,
                                        null
                                );
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContext context = SecurityContextHolder.createEmptyContext();
                        context.setAuthentication(auth);
                        SecurityContextHolder.setContext(context);
                    } else {
                        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from("access_token", "")
                                .maxAge(Duration.ZERO)
                                .path("/")
                                .httpOnly(true);

                        ResponseCookie atkCookie = builder.build();
                        response.addHeader("Set-Cookie", atkCookie.toString());

                        response.sendRedirect(host + ":8080/auths/login");
                        // 사용자 없음: 401 처리(선택)
                        // unauthorized(response, "User not found");
                        return;
                    }
                } else {
                    ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from("access_token", "")
                            .maxAge(Duration.ZERO)
                            .path("/")
                            .httpOnly(true);

                    ResponseCookie atkCookie = builder.build();
                    response.addHeader("Set-Cookie", atkCookie.toString());

                    response.sendRedirect(host + ":8080/auths/login");
                    // 사용자 없음: 401 처리(선택)
                    // unauthorized(response, "User not found");
                    return;
                }
            }
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            // 만료 토큰: 401
            unauthorized(response, "Token expired");
            return;
        } catch (Exception e) {
            log.error("JWT processing error", e);
            // 비정상 토큰: 401
            unauthorized(response, "Token error");
            return;
        }

        filterChain.doFilter(request, response);
    }

    @SuppressWarnings("unused")
    private void unauthorized(HttpServletResponse response, String msg) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"success\":false,\"message\":\"" + msg + "\"}");
    }

    private String parseCookieToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();

        if (cookies != null) {
            Cookie atkCookie = Arrays.stream(cookies).filter(cookie -> cookie.getName().equals("access_token")).findFirst().orElse(null);
            if (atkCookie != null) {
                String token = atkCookie.getValue();
                return token;
            }
        }
        return null;
    }

}
