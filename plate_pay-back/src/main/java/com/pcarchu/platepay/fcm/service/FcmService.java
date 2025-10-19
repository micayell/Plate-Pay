package com.pcarchu.platepay.fcm.service;

import com.pcarchu.platepay.fcm.dto.FcmRequestDto;

public interface FcmService {
    void sendMessage(FcmRequestDto.SendNoti sendNoti);
    void sendMessageToToken(String token, String title, String body);
}
