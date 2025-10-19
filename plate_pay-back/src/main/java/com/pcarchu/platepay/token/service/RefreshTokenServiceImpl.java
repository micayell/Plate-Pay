package com.pcarchu.platepay.token.service;

import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.member.domain.repository.MemberRepository;
import com.pcarchu.platepay.security.provider.TokenProvider;
import com.pcarchu.platepay.token.domain.entity.RefreshToken;
import com.pcarchu.platepay.token.domain.repository.RefreshTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final MemberRepository memberRepository;
    private final TokenProvider tokenProvider;

    @Override
    @Transactional
    public void writeTokenInfo(String email, String loginType, String accessToken, String refreshToken) {
        refreshTokenRepository.save(RefreshToken.builder()
                .email(email)
                .loginType(loginType)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build());
    }

    @Override
    @Transactional
    public void removeRefreshToken(String rToken) {
        refreshTokenRepository.findByRefreshToken(rToken)
                .ifPresent(refreshToken -> refreshTokenRepository.delete(refreshToken));
    }

    @Override
    @Transactional
    public Optional<RefreshToken> getRefreshToken(String refreshToken) {
        return refreshTokenRepository.findByRefreshToken(refreshToken);
    }

    @Override
    @Transactional
    public String reissue(String refreshToken) {
        // 레디스에서 refresh token이 존재하는지 확인 (로그아웃 후 접속 방지)
        RefreshToken rtkInfo = getRefreshToken(refreshToken)
                .orElseThrow(()-> new RuntimeException("refresh token not found"));

        if (rtkInfo != null && tokenProvider.validateToken(refreshToken)) { // refresh token is valid
            String email = rtkInfo.getEmail();
            String loginType = rtkInfo.getLoginType();

            Optional<Member> optionalMember = memberRepository.findByEmailAndLoginType(email, loginType);
            Member member = optionalMember.orElseThrow(() ->
                    new UsernameNotFoundException("해당 이메일의 사용자를 찾을 수 없습니다: " + email));

            String accessToken = tokenProvider.generateAccessToken(member);
            rtkInfo.setFcmToken(accessToken);

            return accessToken;
        }

        return null;
    }

    @Override
    @Transactional
    public void storeFcmToken(String accessToken, String fcmToken) {
        RefreshToken rtk = refreshTokenRepository.findByAccessToken(accessToken).orElseThrow(
                () ->  new RuntimeException("access token not found")
        );

        rtk.setFcmToken(fcmToken);
        refreshTokenRepository.save(rtk);
    }
}
