package com.pcarchu.platepay.fcm.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.pcarchu.platepay.fcm.dto.FcmRequestDto;
import com.pcarchu.platepay.token.domain.entity.RefreshToken;
import com.pcarchu.platepay.token.domain.repository.RefreshTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FcmServiceImpl implements FcmService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final FirebaseMessaging firebaseMessaging;

    @Override
    public void sendMessage(FcmRequestDto.SendNoti sendNoti) {
        try {
            Message message = Message.builder()
                    .setToken(sendNoti.getToken())
                    .setNotification(Notification.builder()
                            .setTitle(sendNoti.getTitle())
                            .setBody(sendNoti.getBody())
                            .build())
                    .build();

            String response = firebaseMessaging.send(message);
            log.info("FCM 메시지 전송 성공: {}", response);
        } catch (Exception e) {
            log.error("FCM 메시지 전송 실패", e);
        }
    }

    @Override
    public void sendMessageToToken(String token, String title, String body) {
        try {
            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();

            String response = firebaseMessaging.send(message);
            log.info("FCM 메시지 전송 성공: {}", response);
        } catch (Exception e) {
            log.error("FCM 메시지 전송 실패", e);
        }
    }
}