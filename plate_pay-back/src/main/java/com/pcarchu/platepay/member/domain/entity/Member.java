package com.pcarchu.platepay.member.domain.entity;

import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.common.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Entity
@Table(name="member")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "memberUid", callSuper=false)
public class Member extends BaseTimeEntity {
    @Id
    @Column(name = "member_uid")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long memberUid;

    @Comment("이름")
    @Column(name = "name", length = 50, nullable = true)
    private String name;

    @Comment("닉네임")
    @Column(name = "nickname", length = 50, nullable = true)
    private String nickname;

    @Comment("이메일")
    @Column(name = "email", length = 50, nullable = false)
    private String email;

    @Comment("전화번호")
    @Column(name = "phone_num", length = 50, nullable = true)
    private String phoneNum;

    @Comment("로그인 종류")
    @Column(name = "login_type", length = 50, nullable = false)
    private String loginType;

    @Comment("페이 활성화")
    @Column(name = "is_active")
    private Boolean isActive;

    @Comment("결제 비밀번호")
    @Column(name = "pay_pwd")
    private String payPwd;

    @Comment("사용자 키")
    @Column(name = "user_key")
    private String userKey;

    @Column
    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> roles = new ArrayList<>();

    @OneToMany(mappedBy = "member", fetch=FetchType.EAGER)
    private List<Car> cars = new ArrayList<>();

    @OneToMany(mappedBy = "member", fetch=FetchType.EAGER)
    private List<Account> accounts = new ArrayList<>();

    @Comment("사용자 얼굴 인식 용 base64")
    @Column(name = "face_img", columnDefinition = "TEXT")
    private String faceImg;

    public Collection<? extends GrantedAuthority> getAuthorities() {
        return this.roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

    public void changeName(String name) {
        this.name = name;
    }

    public void changeNickname(String nickname) { this.nickname = nickname;}

    public void changePhoneNum(String phoneNum) {
        this.phoneNum = phoneNum;
    }

    public void changePayPwd(String payPwd) {
        this.payPwd = payPwd;
    }

    public void changeIsActive(boolean newValue) {
        this.isActive = newValue;
    }

    public void uploadFaceImg(String faceImg) { this.faceImg = faceImg; }
    @Builder
    public Member(String name, String nickname, String email, String phoneNum, String loginType, Boolean isActive, String payPwd, String userKey, List<String> roles, String faceImg) {
        this.name = name;
        this.nickname = nickname;
        this.email = email;
        this.phoneNum = phoneNum;
        this.loginType = loginType;
        this.isActive = isActive;
        this.payPwd = payPwd;
        this.userKey = userKey;
        this.roles = roles;
        this.faceImg = faceImg;
    }
}
