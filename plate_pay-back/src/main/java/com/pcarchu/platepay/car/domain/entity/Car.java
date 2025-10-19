package com.pcarchu.platepay.car.domain.entity;

import com.pcarchu.platepay.common.domain.BaseTimeEntity;

import com.pcarchu.platepay.file.domain.entity.PlatePayFile;
import com.pcarchu.platepay.member.domain.entity.Member;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter
@Entity
@Table(name="car")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(of = "carUid", callSuper=false)

public class Car extends BaseTimeEntity {
	@Id
	@Column(name = "car_uid")
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long carUid;

	@Comment("별명")
	@Column(name = "nickname", length = 50, nullable = true)
	private String nickName;

	@Comment("번호판 번호")
	@Column(name = "plate_num", length = 50, nullable = false)
	private String plateNum;

	@Comment("자동차 연식")
	@Column(name = "car_year_model", length = 50, nullable = true)
	private String carYearModel;

	@Comment("차종")
	@Column(name = "car_model", length = 50, nullable = true)
	private String carModel;

	@Comment("차량 삭제 여부")
	@Column(name = "status")
	private Boolean status;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name="carImgId")
	private PlatePayFile platePayFile;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name="memberId", nullable = false)
	private Member member;

	public void changeNickName(Long actorMemberId, String newNick) {
		ensureOwner(actorMemberId);
		setNickName(newNick);
	}

	public void changePlateNum(Long actorMemberId, String newPlate) {
		ensureOwner(actorMemberId);
		setPlateNum(newPlate);
	}

	public void ensureOwner(Long actorMemberId) {
		if (this.member == null || !this.member.getMemberUid().equals(actorMemberId)) {
			throw new SecurityException("차량 소유자가 아닙니다.");
		}
	}

	public void setStatus(boolean status) {
		this.status = status;
	}

	private void setNickName(String nickName) {
		if (nickName == null || nickName.trim().isEmpty())
			throw new IllegalArgumentException("별명을 입력하세요.");
		String v = nickName.trim();
		if (v.length() > 50) throw new IllegalArgumentException("별명은 50자 이하입니다.");
		this.nickName = v;
	}

	private void setPlateNum(String plateNum) {
		if (plateNum == null || plateNum.trim().isEmpty())
			throw new IllegalArgumentException("번호판을 입력하세요.");
		String v = plateNum.trim().toUpperCase();
		if (v.length() < 4 || v.length() > 10)
			throw new IllegalArgumentException("번호판 형식이 올바르지 않습니다.");
		this.plateNum = v;
	}

	private void setCarModel(String carModel) {
		if (carModel == null || carModel.trim().isEmpty())
			throw new IllegalArgumentException("차종을 입력하세요.");
		String v = carModel.trim();
		if (v.length() > 50) throw new IllegalArgumentException("차종은 50자 이하입니다.");
		this.carModel = v;
	}

	@Builder
	public Car(String nickName,String plateNum, String carYearModel, String carModel, Member member, PlatePayFile platePayFile, Boolean status) {
		this.nickName = nickName;
		this.plateNum = plateNum;
		this.carYearModel = carYearModel;
		this.carModel = carModel;
		this.member = member;
		this.platePayFile = platePayFile;
		this.status = status;
	}
}
