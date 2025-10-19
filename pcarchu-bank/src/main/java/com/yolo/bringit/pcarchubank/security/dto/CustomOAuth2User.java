package com.yolo.bringit.pcarchubank.security.dto;

import com.yolo.bringit.pcarchubank.dto.member.MemberResponseDto;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import java.util.List;
import java.util.Map;

public class CustomOAuth2User extends DefaultOAuth2User {
    private final MemberResponseDto.MemberInfo member;

    public CustomOAuth2User(List<? extends GrantedAuthority> authorities, Map<String, Object> attributes,
                            String nameAttributeKey, MemberResponseDto.MemberInfo member) {
        super(authorities, attributes, nameAttributeKey);
        this.member = member;
    }

    public MemberResponseDto.MemberInfo getMember() {
        return member;
    }
}
