package com.pcarchu.platepay.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class SseUtil {
    private static final long TIMEOUT = 60L * 60L * 1000L; // 60분
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String clientId, String lastEventId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        emitters.put(clientId, emitter);

        emitter.onCompletion(() -> emitters.remove(clientId));
        emitter.onTimeout(() -> emitters.remove(clientId));
        emitter.onError(e -> emitters.remove(clientId));

        // 최초 핑(프록시 idle timeout 방지)
        send(clientId, SseEmitter.event().name("INIT").data("connected"));

        return emitter;
    }

    public void send(String clientId, SseEmitter.SseEventBuilder event) {
        SseEmitter emitter = emitters.get(clientId);
        if (emitter == null) return;
        try {
            emitter.send(event);
        } catch (Exception e) {
            emitters.remove(clientId);
            try { emitter.completeWithError(e); } catch (Exception ignore) {}
        }
    }

    public void broadcast(String eventName, Object data) {
        String id = String.valueOf(System.currentTimeMillis());
        for (String clientId : new ArrayList<>(emitters.keySet())) {
            send(clientId, SseEmitter.event().id(id).name(eventName).data(data));
        }
    }
}
