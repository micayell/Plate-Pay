package com.pcarchu.platepay.config.fcm;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

@Configuration
public class FcmConfig {

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        String base64 = System.getenv("FIREBASE_CREDENTIALS_BASE64");
        if (base64 != null && !base64.isBlank()) {
            byte[] json = java.util.Base64.getDecoder().decode(base64);
            try (var is = new java.io.ByteArrayInputStream(json)) {
                var options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(is))
                        .build();
                return FirebaseApp.initializeApp(options);
            }
        }

        try (var is = new ClassPathResource("firebase/serviceAccountKey.json").getInputStream()) {
            var options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(is))
                    .build();
            return FirebaseApp.initializeApp(options);
        }
    }

    @Bean
    public FirebaseMessaging firebaseMessaging(FirebaseApp app) {
        return FirebaseMessaging.getInstance(app);
    }
}
