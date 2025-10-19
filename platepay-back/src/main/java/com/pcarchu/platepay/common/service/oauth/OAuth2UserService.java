package com.pcarchu.platepay.common.service.oauth;

import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.member.domain.repository.MemberRepository;
import com.pcarchu.platepay.security.dto.CustomOAuth2User;
import com.pcarchu.platepay.util.SsafyUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class OAuth2UserService extends DefaultOAuth2UserService {
    private final MemberRepository memberRepository;
    private final SsafyUtil ssafyUtil;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId(); // "kakao" | "ssafy"
        String nameAttributeKey = userRequest.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        Map<String, Object> raw = oAuth2User.getAttributes();
        Map<String, Object> normalized = new HashMap<>();

        String email = null;
        String nickname = null;
        String displayName = null; // 이름(실명) or 닉네임

        switch (registrationId) {
            case "kakao": {
                Object acctObj = raw.get("kakao_account");
                Map<String, Object> kakaoAccount = acctObj instanceof Map ? (Map<String, Object>) acctObj : Map.of();
                Object profObj = kakaoAccount.get("profile");
                Map<String, Object> profile = profObj instanceof Map ? (Map<String, Object>) profObj : Map.of();
                Object propsObj = raw.get("properties");
                Map<String, Object> properties = propsObj instanceof Map ? (Map<String, Object>) propsObj : Map.of();

                email = (String) kakaoAccount.get("email");
                nickname = strOrNull(profile.get("nickname"));

                normalized.put("providerId", String.valueOf(raw.get("id")));
                normalized.put("email", email);
                normalized.put("nickname", nickname);
                break;
            }
            case "ssafy": {
                email = strOrNull(raw.get("email"));
                displayName = strOrNull(raw.get("name"));

                normalized.put("providerId", strOrNull(raw.get("userId")));
                normalized.put("email", email);
                normalized.put("name", displayName);
                break;
            }
            default:
                throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
        }

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException("Email consent is required for " + registrationId + " login.");
        }

        String safeNickname = nickname;
        String safeName = displayName;
        String safeRegistrationId = registrationId;
        String safeEmail = email;

        Optional<Member> member = memberRepository.findByEmail(email);

        if (member.isEmpty()) { // 회원가입
            Map resMap = ssafyUtil.createAccount(email);

            if (resMap == null) {
                resMap = ssafyUtil.searchAccount(email);

                String userKey = resMap != null ? (String) resMap.get("userKey") : null;

                member = memberRepository.save(
                        Member.builder()
                                .email(safeEmail)
                                .name(safeName)
                                .nickname(safeNickname)
                                .userKey(userKey)
                                .loginType(safeRegistrationId)
                                .roles(List.of("ROLE_USER"))
                                .build()
                );
            } else {
                member = memberRepository.save(
                        Member.builder()
                                .email(safeEmail)
                                .name(safeName)
                                .nickname(safeNickname)
                                .userKey((String) resMap.get("userKey"))
                                .loginType(safeRegistrationId)
                                .roles(List.of("ROLE_USER"))
                                .build()
                );
            }

        }

        List<GrantedAuthority> authorities = AuthorityUtils.createAuthorityList("ROLE_USER");

        Map<String, Object> mergedAttributes = new HashMap<>(raw);
        mergedAttributes.put("normalized", normalized);
        mergedAttributes.put("loginType", registrationId);

        return new CustomOAuth2User(authorities, mergedAttributes, nameAttributeKey, member.get());
    }

    private String strOrNull(Object o) {
        return (o == null) ? null : String.valueOf(o);
    }
}
