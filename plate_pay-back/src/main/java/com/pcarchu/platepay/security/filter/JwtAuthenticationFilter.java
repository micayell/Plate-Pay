package com.pcarchu.platepay.security.filter;

import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.member.domain.repository.MemberRepository;
import com.pcarchu.platepay.security.provider.TokenProvider;
import com.pcarchu.platepay.token.domain.repository.StaleTokenRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final MemberRepository memberRepository;
    private final StaleTokenRepository staleTokenRepository;
    private final TokenProvider tokenProvider;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.startsWith("/auth/")
                || path.startsWith("/public/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 이미 인증된 경우 패스
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim(); // "Bearer " 제거
        if (!StringUtils.hasText(token)
                || "null".equalsIgnoreCase(token)
                || "undefined".equalsIgnoreCase(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (staleTokenRepository.findByAccessToken(token).isPresent()) {
                unauthorized(response, "stale token");
                return;
            }

            if (tokenProvider.validateToken(token)) {
                Claims claims = tokenProvider.validateAndGetEmail(token);

                String email = claims.getSubject();
                String loginType = claims.get("loginType").toString();

                Member member = memberRepository.findByEmailAndLoginType(email, loginType).orElse(null);
                if (member != null) {
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    member,
                                    null,
                                    member.getAuthorities()
                            );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(auth);
                    SecurityContextHolder.setContext(context);
                } else {
                    // 사용자 없음: 401 처리(선택)
                    unauthorized(response, "User not found");
                    return;
                }
            } else {
                // 토큰 검증 실패: 401 처리(선택)
                unauthorized(response, "Invalid token");
                return;
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

}
