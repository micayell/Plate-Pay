package com.pcarchu.platepay.account.domain.entity;

import com.pcarchu.platepay.bank.domain.entity.Bank;
import com.pcarchu.platepay.common.domain.BaseTimeEntity;
import com.pcarchu.platepay.member.domain.entity.Member;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="account")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "accountUid", callSuper=false)
public class Account extends BaseTimeEntity {

    @Id
    @Column(name = "account_uid")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long accountUid;

    @ManyToOne
    @JoinColumn(name="bankId", nullable = false)
    private Bank bank;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="memberId", nullable = false)
    private Member member;

    @Comment("계좌이름")
    @Column(name = "account_name", length = 50, nullable = false)
    private String accountName;

    @Comment("계좌번호")
    @Column(name = "account_no", length = 50, nullable = false)
    private String accountNo;

    @Comment("주계좌여부")
    @Column(name = "is_main")
    private Boolean isMain;

    @Comment("계좌 삭제 여부")
    @Column(name = "status")
    private Boolean status;

    @Builder
    public Account(Bank bank, Member member, String accountName, String accountNo, Boolean isMain, Boolean status) {
        this.bank = bank;
        this.member = member;
        this.accountName = accountName;
        this.accountNo = accountNo;
        this.isMain = isMain;
        this.status = status;

    }

    public void deactivate() {
        this.status = false;
    }

    public void toggleIsMain(Boolean toggle) {
        isMain = toggle;
    }
    public void changeName(String newName) { accountName = newName; }
}
