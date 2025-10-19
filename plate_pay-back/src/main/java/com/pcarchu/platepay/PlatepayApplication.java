package com.pcarchu.platepay;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;

import java.util.TimeZone;

@SpringBootApplication
@EnableElasticsearchRepositories(basePackages = "com.pcarchu.platepay.store.infrastructure")
public class PlatepayApplication {

	public static void main(String[] args) {
		SpringApplication.run(PlatepayApplication.class, args);
	}

	@PostConstruct
	void started() {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
	}
}
