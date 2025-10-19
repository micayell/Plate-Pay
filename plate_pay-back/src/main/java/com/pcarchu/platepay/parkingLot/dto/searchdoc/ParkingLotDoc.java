package com.pcarchu.platepay.parkingLot.dto.searchdoc;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Getter
@Setter
@Document(indexName = "parking")
public class ParkingLotDoc {

	@Field(name = "parking_lot_uid", type = FieldType.Integer)
	private Long parkingLotUid;

	@Field(name = "parking_lot_name", type = FieldType.Text)
	private String parkingLotName;

	@Field(name = "address", type = FieldType.Text)
	private String address;

	@Field(name = "road_address", type = FieldType.Text)
	private String roadAddress;

	@Field(name = "location", type = FieldType.Object)
	private Location location;

	@Field(name = "reg_dt", type = FieldType.Date)
	private String regDt;

	@Field(name = "mod_dt", type = FieldType.Date)
	private String modDt;

	@Field(name = "parking_lot_fee", type = FieldType.Object)
	private ParkingLotFee parkingLotFee;

	@Getter
	@Setter
	public static class Location {
		private Double lat;
		private Double lon;
	}

	@Getter
	@Setter
	public static class ParkingLotFee {
		@Field(name = "primary_fee", type = FieldType.Integer)
		private Integer primaryFee;

		@Field(name = "additional_fee", type = FieldType.Integer)
		private Integer additionalFee;
	}
}
