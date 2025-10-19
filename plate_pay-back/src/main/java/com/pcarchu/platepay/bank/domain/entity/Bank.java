package com.pcarchu.platepay.bank.domain.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="bank")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "bankUid", callSuper=false)
public class Bank {

    @Id
    @Column(name = "bank_uid")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long bankUid;

    @Comment("은행코드")
    @Column(name = "bank_code", nullable = false)
    private String bankCode;

    @Comment("은행이름")
    @Column(name = "bank_name", length = 50, nullable = false)
    private String bankName;
}
