package com.pcarchu.platepay.store.dto.searchdoc;

import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Document(indexName = "store")
public class StoreDoc {

	@Field(name = "store_uid", type = FieldType.Integer)
	private Long storeUid;

	@Field(name = "store_name", type = FieldType.Text)
	private String storeName;

	@Field(name = "store_type", type = FieldType.Keyword)
	private String storeType;

	@Field(name = "address", type = FieldType.Text)
	private String address;

	@Field(name = "road_address", type = FieldType.Text)
	private String roadAddress;

	@Field(name = "store_phone_num", type = FieldType.Keyword)
	private String storePhoneNum;

	@Field(name = "store_url", type = FieldType.Keyword)
	private String storeUrl;

	@Field(name = "open_time", type = FieldType.Keyword)
	private String openTime;

	@Field(name = "close_time", type = FieldType.Keyword)
	private String closeTime;

	@Field(name = "location", type = FieldType.Object)
	private Location location;

	@Field(name = "parking_lot", type = FieldType.Object)
	private ParkingLotDoc parkingLot;

	@Getter @Setter
	public static class Location {
		private Double lat;
		private Double lon;
	}

	@Getter @Setter
	public static class ParkingLotDoc {
		@Field(name = "parking_lot_uid", type = FieldType.Integer)
		private Long parkingLotUid;

		@Field(name = "parking_lot_name", type = FieldType.Text)
		private String parkingLotName;
	}
}
